import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import { hashPin } from '../lib/pin'
import type { User } from '@supabase/supabase-js'

export interface Family {
  id: string
  name: string
  parent_pin_hash: string | null
  require_approval: boolean
}

interface AuthState {
  user: User | null
  family: Family | null
  isParentUnlocked: boolean
  /** PIN antiguo guardado solo en este navegador. Se migra a Supabase y se borra. */
  parentPin: string | null
  isLoading: boolean        // login / registro en curso (botones)
  isInitializing: boolean   // carga inicial de la sesión (pantalla "Cargando...")
  error: string | null

  // Actions
  signUp: (email: string, password: string, familyName: string, pin: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  unlockParent: (pin: string) => Promise<boolean>
  lockParent: () => void
  loadSession: () => Promise<void>
  setParentPin: (pin: string) => Promise<void>
  hasPin: () => boolean
  updateFamily: (updates: Partial<Pick<Family, 'name' | 'require_approval'>>) => Promise<void>
}

// Devuelve la familia del usuario. Usa limit(1)+maybeSingle en vez de single():
// single() da error (y devuelve null) si hay 0 o MÁS DE UNA familia para el mismo
// usuario, lo que lo dejaba atascado tras iniciar sesión.
// Se pide '*' para que siga funcionando aunque aún no se haya ejecutado la migración v2.
async function fetchFamily(userId: string): Promise<Family | null> {
  const { data, error } = await supabase
    .from('families')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) console.error('Error cargando familia:', error)
  return data ? normalizeFamily(data) : null
}

function normalizeFamily(row: { id: string; name: string; parent_pin_hash?: string | null; require_approval?: boolean | null }): Family {
  return {
    id: row.id,
    name: row.name,
    parent_pin_hash: row.parent_pin_hash ?? null,
    require_approval: row.require_approval ?? false,
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      /** Si hay un PIN antiguo en este navegador y la familia aún no tiene PIN en la nube, lo sube. */
      const migrateLocalPin = async () => {
        const { family, parentPin } = get()
        if (family && !family.parent_pin_hash && parentPin) {
          await get().setParentPin(parentPin)
        }
      }

      return {
        user: null,
        family: null,
        isParentUnlocked: false,
        parentPin: null,
        isLoading: false,
        isInitializing: true,
        error: null,

        loadSession: async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user) {
              const familyData = await fetchFamily(session.user.id)
              set({ user: session.user, family: familyData, isInitializing: false })
              void migrateLocalPin()
            } else {
              set({ user: null, family: null, isInitializing: false })
            }
          } catch (err) {
            console.error('Error cargando sesión:', err)
            set({ isInitializing: false })
          }
        },

        signUp: async (email, password, familyName, pin) => {
          set({ isLoading: true, error: null })
          try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
              email,
              password,
            })
            if (authError) throw authError
            if (!authData.user) throw new Error('No user returned')

            const { data: familyData, error: familyError } = await supabase
              .from('families')
              .insert({ name: familyName, owner_id: authData.user.id })
              .select()
              .single()
            if (familyError) throw familyError

            set({
              user: authData.user,
              family: normalizeFamily(familyData),
              isParentUnlocked: true,
              isLoading: false,
            })
            await get().setParentPin(pin)
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al registrarse'
            set({ error: msg, isLoading: false })
            throw err
          }
        },

        signIn: async (email, password) => {
          set({ isLoading: true, error: null })
          try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password })
            if (error) throw error

            const familyData = await fetchFamily(data.user.id)

            set({ user: data.user, family: familyData, isLoading: false })
            void migrateLocalPin()
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al iniciar sesión'
            set({ error: msg, isLoading: false })
            throw err
          }
        },

        signOut: async () => {
          await supabase.auth.signOut()
          set({ user: null, family: null, isParentUnlocked: false })
        },

        unlockParent: async (pin) => {
          const { family, parentPin } = get()
          if (family?.parent_pin_hash) {
            const hash = await hashPin(pin, family.id)
            if (hash === family.parent_pin_hash) {
              set({ isParentUnlocked: true })
              return true
            }
            return false
          }
          // PIN antiguo (solo en este navegador)
          if (parentPin && pin === parentPin) {
            set({ isParentUnlocked: true })
            void migrateLocalPin()
            return true
          }
          return false
        },

        lockParent: () => {
          set({ isParentUnlocked: false })
        },

        setParentPin: async (pin) => {
          const { family } = get()
          if (family) {
            const hash = await hashPin(pin, family.id)
            const { error } = await supabase
              .from('families')
              .update({ parent_pin_hash: hash })
              .eq('id', family.id)
            if (!error) {
              set({ family: { ...family, parent_pin_hash: hash }, parentPin: null })
              return
            }
            console.warn('No se pudo guardar el PIN en Supabase (¿falta ejecutar supabase_migration_v2.sql?):', error.message)
          }
          // Sin familia o sin la columna en la BD: se guarda solo en este navegador.
          set({ parentPin: pin })
        },

        hasPin: () => {
          const { family, parentPin } = get()
          return Boolean(family?.parent_pin_hash || parentPin)
        },

        updateFamily: async (updates) => {
          const { family } = get()
          if (!family) return
          const { error } = await supabase.from('families').update(updates).eq('id', family.id)
          if (error) throw error
          set({ family: { ...family, ...updates } })
        },
      }
    },
    {
      name: 'auth-storage',
      partialize: (state) => ({
        parentPin: state.parentPin,
      }),
    }
  )
)
