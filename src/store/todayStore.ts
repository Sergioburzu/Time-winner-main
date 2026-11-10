import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { todayString } from '../lib/limits'

export interface AssignedTask {
  id: string
  child_id: string
  task_id: string
  date: string
  status: 'pending' | 'completed'
  minutes_granted: number
  created_at: string
  // Joined task info
  task?: {
    name: string
    icon: string
    reward_minutes: number
  }
}

interface TodayState {
  assignedTasks: AssignedTask[]
  isLoading: boolean

  fetchTodayTasks: (childId: string) => Promise<void>
  assignTask: (childId: string, taskId: string, minutesGranted: number) => Promise<void>
  completeTask: (assignedTaskId: string) => Promise<{ minutesGranted: number }>
  uncompleteTask: (assignedTaskId: string) => Promise<void>
  removeAssignedTask: (assignedTaskId: string) => Promise<void>
  getEarnedMinutesForChild: (childId: string) => number
}

export const useTodayStore = create<TodayState>((set, get) => ({
  assignedTasks: [],
  isLoading: false,

  fetchTodayTasks: async (childId) => {
    set({ isLoading: true })
    const today = todayString()
    const { data, error } = await supabase
      .from('assigned_tasks')
      .select(`
        *,
        task:tasks(name, icon, reward_minutes)
      `)
      .eq('child_id', childId)
      .eq('date', today)
      .order('created_at', { ascending: true })

    if (!error) {
      // Merge: keep tasks from other children, replace only this child's tasks
      set((state) => ({
        assignedTasks: [
          ...state.assignedTasks.filter((t) => t.child_id !== childId),
          ...(data || []),
        ],
        isLoading: false,
      }))
    } else {
      set({ isLoading: false })
    }
  },

  assignTask: async (childId, taskId, minutesGranted) => {
    const today = todayString()
    // Check if already assigned today
    const existing = get().assignedTasks.find(
      (t) => t.child_id === childId && t.task_id === taskId && t.date === today
    )
    if (existing) return

    const { data, error } = await supabase
      .from('assigned_tasks')
      .insert({
        child_id: childId,
        task_id: taskId,
        date: today,
        status: 'pending',
        minutes_granted: minutesGranted,
      })
      .select(`*, task:tasks(name, icon, reward_minutes)`)
      .single()

    if (!error && data) {
      set((state) => ({ assignedTasks: [...state.assignedTasks, data] }))
    }
  },

  completeTask: async (assignedTaskId) => {
    const task = get().assignedTasks.find((t) => t.id === assignedTaskId)
    if (!task || task.status === 'completed') return { minutesGranted: 0 }

    const { error } = await supabase
      .from('assigned_tasks')
      .update({ status: 'completed' })
      .eq('id', assignedTaskId)

    if (!error) {
      set((state) => ({
        assignedTasks: state.assignedTasks.map((t) =>
          t.id === assignedTaskId ? { ...t, status: 'completed' } : t
        ),
      }))
      return { minutesGranted: task.minutes_granted }
    }
    return { minutesGranted: 0 }
  },

  uncompleteTask: async (assignedTaskId) => {
    const { error } = await supabase
      .from('assigned_tasks')
      .update({ status: 'pending' })
      .eq('id', assignedTaskId)

    if (!error) {
      set((state) => ({
        assignedTasks: state.assignedTasks.map((t) =>
          t.id === assignedTaskId ? { ...t, status: 'pending' } : t
        ),
      }))
    }
  },

  removeAssignedTask: async (assignedTaskId) => {
    const { error } = await supabase
      .from('assigned_tasks')
      .delete()
      .eq('id', assignedTaskId)

    if (!error) {
      set((state) => ({
        assignedTasks: state.assignedTasks.filter((t) => t.id !== assignedTaskId),
      }))
    }
  },

  getEarnedMinutesForChild: (childId) => {
    return get()
      .assignedTasks.filter((t) => t.child_id === childId && t.status === 'completed')
      .reduce((sum, t) => sum + t.minutes_granted, 0)
  },
}))
