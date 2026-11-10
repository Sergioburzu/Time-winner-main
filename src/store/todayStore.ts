import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { todayString } from '../lib/limits'

export type TaskStatus = 'pending' | 'awaiting_approval' | 'completed'

export interface AssignedTask {
  id: string
  child_id: string
  task_id: string
  date: string
  status: TaskStatus
  minutes_granted: number
  created_at: string
  // Joined task info
  task?: {
    name: string
    icon: string
    reward_minutes: number
  } | null
}

interface TodayState {
  assignedTasks: AssignedTask[]
  /** Tareas marcadas por el niño que esperan aprobación (de cualquier día) */
  approvals: AssignedTask[]
  isLoading: boolean

  fetchTodayTasks: (childId: string) => Promise<void>
  fetchApprovals: (childIds: string[]) => Promise<void>
  assignTask: (childId: string, taskId: string, minutesGranted: number) => Promise<void>
  /** El niño marca la tarea. Si la familia exige aprobación queda "esperando". */
  completeTask: (assignedTaskId: string, requireApproval?: boolean) => Promise<{ status: TaskStatus | null }>
  approveTask: (assignedTaskId: string) => Promise<void>
  rejectTask: (assignedTaskId: string) => Promise<void>
  uncompleteTask: (assignedTaskId: string) => Promise<void>
  removeAssignedTask: (assignedTaskId: string) => Promise<void>
  getEarnedMinutesForChild: (childId: string) => number
}

const SELECT_WITH_TASK = '*, task:tasks(name, icon, reward_minutes)'

// Las tareas recurrentes se crean una vez por hijo y día en cada dispositivo.
// Así, si un padre quita una tarea de hoy, no reaparece al refrescar.
const materialized = new Set<string>()
let recurringUnavailable = false

async function ensureRecurringForToday(childId: string) {
  const today = todayString()
  const key = `${childId}:${today}`
  if (materialized.has(key) || recurringUnavailable) return
  materialized.add(key)

  const { data, error } = await supabase
    .from('recurring_tasks')
    .select('task_id, weekdays, task:tasks(reward_minutes)')
    .eq('child_id', childId)

  if (error) {
    // La tabla no existe todavía (falta la migración v2): no repetir el intento.
    console.warn('Tareas recurrentes no disponibles:', error.message)
    recurringUnavailable = true
    return
  }

  const weekday = new Date().getDay()
  const rows = (data ?? [])
    .filter((r) => r.weekdays.includes(weekday) && r.task)
    .map((r) => ({
      child_id: childId,
      task_id: r.task_id,
      date: today,
      status: 'pending' as const,
      minutes_granted: r.task!.reward_minutes,
    }))

  if (rows.length === 0) return
  const { error: upsertError } = await supabase
    .from('assigned_tasks')
    .upsert(rows, { onConflict: 'child_id,task_id,date', ignoreDuplicates: true })
  if (upsertError) console.warn('Error creando tareas recurrentes:', upsertError.message)
}

/** Olvida qué hijos ya tienen hoy sus tareas recurrentes creadas (tras crear/editar una repetición). */
export function resetRecurringCache(childId?: string) {
  if (!childId) { materialized.clear(); return }
  materialized.delete(`${childId}:${todayString()}`)
}

export const useTodayStore = create<TodayState>((set, get) => {
  const patchTask = (id: string, patch: Partial<AssignedTask>) =>
    set((state) => ({
      assignedTasks: state.assignedTasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }))

  const setStatus = async (id: string, status: TaskStatus) => {
    const { error } = await supabase.from('assigned_tasks').update({ status }).eq('id', id)
    if (error) throw error
    patchTask(id, { status })
    set((state) => ({
      approvals:
        status === 'awaiting_approval'
          ? state.approvals.some((a) => a.id === id)
            ? state.approvals
            : [...state.approvals, ...state.assignedTasks.filter((t) => t.id === id).map((t) => ({ ...t, status }))]
          : state.approvals.filter((a) => a.id !== id),
    }))
  }

  return {
    assignedTasks: [],
    approvals: [],
    isLoading: false,

    fetchTodayTasks: async (childId) => {
      set({ isLoading: true })
      await ensureRecurringForToday(childId)
      const today = todayString()
      const { data, error } = await supabase
        .from('assigned_tasks')
        .select(SELECT_WITH_TASK)
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

    fetchApprovals: async (childIds) => {
      if (childIds.length === 0) { set({ approvals: [] }); return }
      const { data, error } = await supabase
        .from('assigned_tasks')
        .select(SELECT_WITH_TASK)
        .in('child_id', childIds)
        .eq('status', 'awaiting_approval')
        .order('date', { ascending: true })
      if (!error) set({ approvals: data || [] })
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
        .select(SELECT_WITH_TASK)
        .single()

      if (!error && data) {
        set((state) => ({ assignedTasks: [...state.assignedTasks, data] }))
      }
    },

    completeTask: async (assignedTaskId, requireApproval = false) => {
      const task = get().assignedTasks.find((t) => t.id === assignedTaskId)
      if (!task || task.status !== 'pending') return { status: null }
      const status: TaskStatus = requireApproval ? 'awaiting_approval' : 'completed'
      try {
        await setStatus(assignedTaskId, status)
        return { status }
      } catch (err) {
        // Si la BD aún no admite "awaiting_approval" (falta migración v2), se completa directamente.
        if (status === 'awaiting_approval') {
          console.warn('No se pudo dejar la tarea pendiente de aprobación:', err)
          await setStatus(assignedTaskId, 'completed')
          return { status: 'completed' }
        }
        return { status: null }
      }
    },

    approveTask: async (id) => {
      await setStatus(id, 'completed')
    },

    rejectTask: async (id) => {
      await setStatus(id, 'pending')
    },

    uncompleteTask: async (id) => {
      await setStatus(id, 'pending')
    },

    removeAssignedTask: async (assignedTaskId) => {
      const { error } = await supabase
        .from('assigned_tasks')
        .delete()
        .eq('id', assignedTaskId)

      if (!error) {
        set((state) => ({
          assignedTasks: state.assignedTasks.filter((t) => t.id !== assignedTaskId),
          approvals: state.approvals.filter((t) => t.id !== assignedTaskId),
        }))
      }
    },

    getEarnedMinutesForChild: (childId) => {
      return get()
        .assignedTasks.filter((t) => t.child_id === childId && t.status === 'completed')
        .reduce((sum, t) => sum + t.minutes_granted, 0)
    },
  }
})
