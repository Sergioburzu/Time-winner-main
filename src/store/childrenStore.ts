import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { getDefaultDailyLimit } from '../lib/limits'

export interface Child {
  id: string
  family_id: string
  name: string
  age: number
  avatar: string
  daily_limit_minutes: number
  accumulate_extra: boolean
  created_at: string
}

interface ChildrenState {
  children: Child[]
  isLoading: boolean
  error: string | null

  fetchChildren: (familyId: string) => Promise<void>
  addChild: (familyId: string, data: { name: string; age: number; avatar: string }) => Promise<Child>
  updateChild: (id: string, data: Partial<Child>) => Promise<void>
  deleteChild: (id: string) => Promise<void>
}

export const useChildrenStore = create<ChildrenState>((set) => ({
  children: [],
  isLoading: false,
  error: null,

  fetchChildren: async (familyId) => {
    set({ isLoading: true, error: null })
    const { data, error } = await supabase
      .from('children')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: true })

    if (error) {
      set({ error: error.message, isLoading: false })
    } else {
      set({ children: data || [], isLoading: false })
    }
  },

  addChild: async (familyId, { name, age, avatar }) => {
    const daily_limit_minutes = getDefaultDailyLimit(age)
    const { data, error } = await supabase
      .from('children')
      .insert({
        family_id: familyId,
        name,
        age,
        avatar,
        daily_limit_minutes,
        accumulate_extra: true,
      })
      .select()
      .single()

    if (error) throw error
    set((state) => ({ children: [...state.children, data] }))
    return data
  },

  updateChild: async (id, updates) => {
    const { error } = await supabase
      .from('children')
      .update(updates)
      .eq('id', id)

    if (error) throw error
    set((state) => ({
      children: state.children.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }))
  },

  deleteChild: async (id) => {
    const { error } = await supabase.from('children').delete().eq('id', id)
    if (error) throw error
    set((state) => ({ children: state.children.filter((c) => c.id !== id) }))
  },
}))

export const useChildById = (id: string) =>
  useChildrenStore((state) => state.children.find((c) => c.id === id))

// Re-export so components don't need to import limits.ts separately
export { getDefaultDailyLimit }
