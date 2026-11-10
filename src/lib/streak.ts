import { supabase } from './supabase'
import { daysAgoString } from './limits'

/**
 * Racha: días seguidos (hasta hoy) en los que el hijo completó al menos una tarea.
 * Si hoy todavía no ha completado nada, la racha cuenta hasta ayer (no se "rompe" por la mañana).
 */
export async function fetchStreak(childId: string): Promise<number> {
  const { data, error } = await supabase
    .from('assigned_tasks')
    .select('date')
    .eq('child_id', childId)
    .eq('status', 'completed')
    .gte('date', daysAgoString(90))

  if (error || !data) return 0
  const days = new Set(data.map((r) => r.date))

  let streak = 0
  let offset = days.has(daysAgoString(0)) ? 0 : 1
  while (days.has(daysAgoString(offset))) {
    streak++
    offset++
  }
  return streak
}
