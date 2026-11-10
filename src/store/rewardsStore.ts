import { create } from 'zustand'
import { supabase } from '../lib/supabase'

/**
 * Premios: cada minuto ganado con tareas da 1 ⭐ estrella.
 * Las estrellas se acumulan siempre (no caducan ni tienen límite diario) y se
 * canjean por premios que define la familia (p. ej. "Elegir la cena" = 60 ⭐).
 * Son independientes del tiempo de pantalla: canjear no quita minutos de pantalla.
 */

export interface Reward {
  id: string
  family_id: string
  name: string
  icon: string
  cost_stars: number
}

export interface Redemption {
  id: string
  child_id: string
  reward_id: string | null
  reward_name: string
  reward_icon: string
  cost_stars: number
  status: 'pending' | 'delivered'
  created_at: string
}

interface RewardsState {
  rewards: Reward[]
  redemptions: Redemption[]      // pendientes de entregar (todos los hijos)
  stars: Record<string, number>  // saldo por hijo
  available: boolean             // false si faltan las tablas (migración v2)

  fetchRewards: (familyId: string) => Promise<void>
  addReward: (familyId: string, data: { name: string; icon: string; cost_stars: number }) => Promise<void>
  deleteReward: (id: string) => Promise<void>
  fetchStars: (childId: string) => Promise<void>
  redeem: (childId: string, reward: Reward) => Promise<void>
  fetchPendingRedemptions: (childIds: string[]) => Promise<void>
  markDelivered: (id: string) => Promise<void>
}

export const useRewardsStore = create<RewardsState>((set, get) => ({
  rewards: [],
  redemptions: [],
  stars: {},
  available: true,

  fetchRewards: async (familyId) => {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('family_id', familyId)
      .order('cost_stars', { ascending: true })
    if (error) { set({ available: false }); return }
    set({ rewards: data ?? [], available: true })
  },

  addReward: async (familyId, reward) => {
    const { data, error } = await supabase
      .from('rewards')
      .insert({ ...reward, family_id: familyId })
      .select()
      .single()
    if (error) throw error
    set((s) => ({ rewards: [...s.rewards, data].sort((a, b) => a.cost_stars - b.cost_stars) }))
  },

  deleteReward: async (id) => {
    const { error } = await supabase.from('rewards').delete().eq('id', id)
    if (error) throw error
    set((s) => ({ rewards: s.rewards.filter((r) => r.id !== id) }))
  },

  fetchStars: async (childId) => {
    const [{ data: earned, error: e1 }, { data: spent, error: e2 }] = await Promise.all([
      supabase.from('assigned_tasks').select('minutes_granted').eq('child_id', childId).eq('status', 'completed'),
      supabase.from('reward_redemptions').select('cost_stars').eq('child_id', childId),
    ])
    if (e1) return
    if (e2) set({ available: false })
    const total = (earned ?? []).reduce((s, r) => s + r.minutes_granted, 0)
    const used = (spent ?? []).reduce((s, r) => s + r.cost_stars, 0)
    set((s) => ({ stars: { ...s.stars, [childId]: Math.max(0, total - used) } }))
  },

  redeem: async (childId, reward) => {
    // Recalcular el saldo justo antes, por si cambió en otro dispositivo
    await get().fetchStars(childId)
    const balance = get().stars[childId] ?? 0
    if (balance < reward.cost_stars) throw new Error('No tienes suficientes estrellas')

    const { data, error } = await supabase
      .from('reward_redemptions')
      .insert({
        child_id: childId,
        reward_id: reward.id,
        reward_name: reward.name,
        reward_icon: reward.icon,
        cost_stars: reward.cost_stars,
      })
      .select()
      .single()
    if (error) throw error
    set((s) => ({
      stars: { ...s.stars, [childId]: balance - reward.cost_stars },
      redemptions: [...s.redemptions, data],
    }))
  },

  fetchPendingRedemptions: async (childIds) => {
    if (childIds.length === 0) { set({ redemptions: [] }); return }
    const { data, error } = await supabase
      .from('reward_redemptions')
      .select('*')
      .in('child_id', childIds)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    if (error) { set({ available: false }); return }
    set({ redemptions: data ?? [] })
  },

  markDelivered: async (id) => {
    const { error } = await supabase.from('reward_redemptions').update({ status: 'delivered' }).eq('id', id)
    if (error) throw error
    set((s) => ({ redemptions: s.redemptions.filter((r) => r.id !== id) }))
  },
}))
