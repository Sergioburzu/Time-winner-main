import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { todayString, daysAgoString, calculateCarryOver } from '../lib/limits'
import type { Child } from './childrenStore'

export interface MinuteRecord {
  id: string
  child_id: string
  date: string
  minutes_earned: number
  minutes_used: number
  minutes_carried_over: number
}

interface MinutesState {
  /** Registro de HOY por hijo */
  records: Record<string, MinuteRecord>
  /** Carga (o crea) el registro de hoy, calculando los minutos que vienen de ayer */
  loadToday: (child: Child) => Promise<void>
  /** Suma (o resta, si es negativo) minutos usados hoy */
  addUsed: (childId: string, minutes: number) => Promise<void>
  /** Guarda los minutos ganados hoy (para el historial y el cálculo de mañana) */
  syncEarned: (childId: string, earned: number) => Promise<void>
}

export const useMinutesStore = create<MinutesState>((set, get) => ({
  records: {},

  loadToday: async (child) => {
    const today = todayString()
    const { data: existing, error } = await supabase
      .from('minute_records')
      .select('*')
      .eq('child_id', child.id)
      .eq('date', today)
      .maybeSingle()
    if (error) { console.warn('minute_records:', error.message); return }

    if (existing) {
      set((s) => ({ records: { ...s.records, [child.id]: existing } }))
      return
    }

    // Primer acceso del día: calcular lo que pasa desde ayer
    const yesterday = daysAgoString(1)
    const [{ data: yRecord }, { data: yTasks }] = await Promise.all([
      supabase.from('minute_records').select('*').eq('child_id', child.id).eq('date', yesterday).maybeSingle(),
      supabase.from('assigned_tasks').select('minutes_granted').eq('child_id', child.id).eq('date', yesterday).eq('status', 'completed'),
    ])
    const yEarned = (yTasks ?? []).reduce((sum, t) => sum + t.minutes_granted, 0)
    const carried = calculateCarryOver(
      yEarned,
      yRecord?.minutes_carried_over ?? 0,
      yRecord?.minutes_used ?? 0,
      child.daily_limit_minutes,
      child.accumulate_extra
    )

    // ignoreDuplicates: si otro dispositivo lo creó a la vez, no se pisa
    await supabase
      .from('minute_records')
      .upsert(
        { child_id: child.id, date: today, minutes_carried_over: carried },
        { onConflict: 'child_id,date', ignoreDuplicates: true }
      )
    const { data: created } = await supabase
      .from('minute_records')
      .select('*')
      .eq('child_id', child.id)
      .eq('date', today)
      .maybeSingle()
    if (created) set((s) => ({ records: { ...s.records, [child.id]: created } }))
  },

  addUsed: async (childId, minutes) => {
    const rec = get().records[childId]
    if (!rec) return
    const minutes_used = Math.max(0, rec.minutes_used + minutes)
    const { error } = await supabase.from('minute_records').update({ minutes_used }).eq('id', rec.id)
    if (error) throw error
    set((s) => ({ records: { ...s.records, [childId]: { ...rec, minutes_used } } }))
  },

  syncEarned: async (childId, earned) => {
    const rec = get().records[childId]
    if (!rec || rec.minutes_earned === earned) return
    set((s) => ({ records: { ...s.records, [childId]: { ...rec, minutes_earned: earned } } }))
    await supabase.from('minute_records').update({ minutes_earned: earned }).eq('id', rec.id)
  },
}))
