import { useEffect, useState } from 'react'
import type { Child } from '../store/childrenStore'
import { useRewardsStore } from '../store/rewardsStore'
import type { Reward } from '../store/rewardsStore'
import { launchConfetti, playFanfare } from '../lib/celebrate'

/** Hucha de estrellas y premios canjeables (vista del niño). */
export default function RewardsCard({ child, familyId, refreshKey }: { child: Child; familyId: string; refreshKey: number }) {
  const { rewards, stars, redemptions, available, fetchRewards, fetchStars, fetchPendingRedemptions, redeem } = useRewardsStore()
  const [redeemed, setRedeemed] = useState<Reward | null>(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    void fetchRewards(familyId)
    void fetchPendingRedemptions([child.id])
  }, [familyId, child.id, fetchRewards, fetchPendingRedemptions])

  // refreshKey cambia cuando se completa una tarea → recalcular estrellas
  useEffect(() => { void fetchStars(child.id) }, [child.id, fetchStars, refreshKey])

  if (!available) return null
  const balance = stars[child.id] ?? 0
  const pending = redemptions.filter((r) => r.child_id === child.id)

  const handleRedeem = async (reward: Reward) => {
    if (!window.confirm(`¿Canjear ${reward.cost_stars} ⭐ por "${reward.name}"?`)) return
    setBusyId(reward.id)
    setError('')
    try {
      await redeem(child.id, reward)
      setRedeemed(reward)
      playFanfare()
      launchConfetti(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo canjear')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="neumorphic-lg" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.2rem', color: 'var(--text-main)' }}>🎁 Mis premios</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cada minuto ganado = 1 ⭐</p>
        </div>
        <div className="neumorphic-inset-sm" style={{ padding: '0.5rem 1rem', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.5rem', color: '#e8a400', lineHeight: 1 }}>⭐ {balance}</p>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>estrellas</p>
        </div>
      </div>

      {redeemed && (
        <div className="animate-bounce-in" style={{ textAlign: 'center', padding: '1rem', borderRadius: 'var(--border-radius)', background: 'rgba(102,204,153,0.12)' }}>
          <p style={{ fontSize: '2.5rem' }}>{redeemed.icon}</p>
          <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.2rem', color: 'var(--success-dark)' }}>¡Has conseguido "{redeemed.name}"!</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Pídeselo a papá o mamá 😊</p>
          <button onClick={() => setRedeemed(null)} className="btn-ghost" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Genial ✓</button>
        </div>
      )}

      {error && <p style={{ color: 'var(--danger)', fontWeight: 700, fontSize: '0.85rem' }}>⚠️ {error}</p>}

      {rewards.length === 0 ? (
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem' }}>
          Aún no hay premios. Pide a tus padres que creen alguno en Ajustes ✨
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {rewards.map((r) => {
            const canAfford = balance >= r.cost_stars
            const pct = Math.min(100, (balance / r.cost_stars) * 100)
            return (
              <div key={r.id} className="neumorphic-sm" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.8rem' }}>{r.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.05rem', color: 'var(--text-main)' }}>{r.name}</p>
                  <div className="neumorphic-inset-sm" style={{ height: 8, borderRadius: 100, overflow: 'hidden', padding: 2, marginTop: 4 }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 100, background: canAfford ? 'linear-gradient(90deg, #77dba8, #55bb88)' : 'linear-gradient(90deg, #ffd56b, #ffb347)' }} />
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginTop: 2 }}>
                    {canAfford ? '¡Ya puedes canjearlo!' : `Te faltan ${r.cost_stars - balance} ⭐`}
                  </p>
                </div>
                <button
                  onClick={() => handleRedeem(r)}
                  disabled={!canAfford || busyId === r.id}
                  className={canAfford ? 'btn-success' : 'btn-ghost'}
                  style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', flexShrink: 0, opacity: canAfford ? 1 : 0.6 }}
                >
                  {r.cost_stars} ⭐
                </button>
              </div>
            )
          })}
        </div>
      )}

      {pending.length > 0 && (
        <div>
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Esperando que te lo den:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {pending.map((p) => (
              <span key={p.id} className="tag tag-warning">{p.reward_icon} {p.reward_name}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
