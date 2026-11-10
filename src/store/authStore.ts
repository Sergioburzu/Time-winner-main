import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

interface Family {
  id: string
  name: string
}

interface AuthState {
  user: User | null
  family: Family | null
  isParentUnlocked: boolean
  parentPin: string | null
  isLoading: boolean        // login / registro en curso (botones)
  isInitializing: boolean   // carga inicial de la sesión (pantalla "Cargando...")
  error: string | null

  // Actions
  signUp: (email: string, password: string, familyName: string, pin: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  unlockParent: (pin: string) => boolean
  lockParent: () => void
  loadSession: () => Promise<void>
  setParentPin: (pin: string) => void
}

// Devuelve la familia del usuario. Usa limit(1)+maybeSingle en vez de single():
// single() da error (y devuelve null) si hay 0 o MÁS DE UNA familia para el mismo
// usuario, lo que lo dejaba atascado tras iniciar sesión.
async function fetchFamily(userId: string): Promise<Family | null> {
  const { data, error } = await supabase
    .from('families')
    .select('id, name')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) console.error('Error cargando familia:', error)
  return data ?? null
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
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
            family: familyData,
            parentPin: pin,
            isParentUnlocked: true,
            isLoading: false,
          })
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

      unlockParent: (pin) => {
        const { parentPin } = get()
        if (pin === parentPin) {
          set({ isParentUnlocked: true })
          return true
        }
        return false
      },

      lockParent: () => {
        set({ isParentUnlocked: false })
      },

      setParentPin: (pin) => {
        set({ parentPin: pin })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        parentPin: state.parentPin,
      }),
    }
  )
)
