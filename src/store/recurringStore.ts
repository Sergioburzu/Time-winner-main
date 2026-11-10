import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { resetRecurringCache } from './todayStore'

export interface RecurringTask {
  id: string
  child_id: string
  task_id: string
  weekdays: number[]
  task?: { name: string; icon: string; reward_minutes: number } | null
}

interface RecurringState {
  recurring: RecurringTask[]
  available: boolean // false si la tabla no existe (falta migración v2)
  fetchRecurring: (childIds: string[]) => Promise<void>
  /** Crea o actualiza la repetición de una tarea para un hijo */
  saveRecurring: (childId: string, taskId: string, weekdays: number[]) => Promise<void>
  removeRecurring: (id: string) => Promise<void>
}

export const useRecurringStore = create<RecurringState>((set) => ({
  recurring: [],
  available: true,

  fetchRecurring: async (childIds) => {
    if (childIds.length === 0) { set({ recurring: [] }); return }
    const { data, error } = await supabase
      .from('recurring_tasks')
      .select('id, child_id, task_id, weekdays, task:tasks(name, icon, reward_minutes)')
      .in('child_id', childIds)
      .order('created_at', { ascending: true })
    if (error) {
      set({ available: false })
      return
    }
    set({ recurring: data ?? [], available: true })
  },

  saveRecurring: async (childId, taskId, weekdays) => {
    const { data, error } = await supabase
      .from('recurring_tasks')
      .upsert({ child_id: childId, task_id: taskId, weekdays }, { onConflict: 'child_id,task_id' })
      .select('id, child_id, task_id, weekdays, task:tasks(name, icon, reward_minutes)')
      .single()
    if (error) throw error
    resetRecurringCache(childId)
    set((state) => ({
      recurring: [...state.recurring.filter((r) => r.id !== data.id), data],
    }))
  },

  removeRecurring: async (id) => {
    const { error } = await supabase.from('recurring_tasks').delete().eq('id', id)
    if (error) throw error
    set((state) => ({ recurring: state.recurring.filter((r) => r.id !== id) }))
  },
}))
