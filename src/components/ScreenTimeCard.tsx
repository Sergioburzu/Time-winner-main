import { useEffect, useState, useCallback } from 'react'
import { Play, Square, Tv } from 'lucide-react'
import type { Child } from '../store/childrenStore'
import { useMinutesStore } from '../store/minutesStore'
import { calculateBalance, formatMinutes } from '../lib/limits'
import { playTimeUp, vibrate } from '../lib/celebrate'
import { scheduleTimerEnd, cancelTimerEnd } from '../lib/native'

interface ActiveTimer {
  endsAt: number
  minutes: number
}

const timerKey = (childId: string) => `tw-timer-${childId}`

function readTimer(childId: string): ActiveTimer | null {
  try {
    const raw = localStorage.getItem(timerKey(childId))
    return raw ? (JSON.parse(raw) as ActiveTimer) : null
  } catch {
    return null
  }
}

function writeTimer(childId: string, t: ActiveTimer | null) {
  try {
    if (t) localStorage.setItem(timerKey(childId), JSON.stringify(t))
    else localStorage.removeItem(timerKey(childId))
  } catch { /* ignorar */ }
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Saldo de pantalla del día + temporizador "Usar tiempo".
 * Los minutos se descuentan al empezar (así cuentan aunque se cierre la app)
 * y si se termina antes se devuelven los minutos enteros que sobran.
 */
export default function ScreenTimeCard({ child, earned }: { child: Child; earned: number }) {
  const { records, loadToday, addUsed, syncEarned } = useMinutesStore()
  const record = records[child.id]
  const [timer, setTimer] = useState<ActiveTimer | null>(() => readTimer(child.id))
  const [now, setNow] = useState(Date.now())
  const [choosing, setChoosing] = useState(false)
  const [finished, setFinished] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => { void loadToday(child) }, [child, loadToday])
  useEffect(() => { void syncEarned(child.id, earned) }, [child.id, earned, syncEarned, record?.id])

  const finish = useCallback(() => {
    writeTimer(child.id, null)
    setTimer(null)
    setFinished(true)
    playTimeUp()
    vibrate(400)
  }, [child.id])

  useEffect(() => {
    if (!timer) return
    const id = window.setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= timer.endsAt) finish()
    }, 500)
    return () => window.clearInterval(id)
  }, [timer, finish])

  if (!record) return null

  const balance = calculateBalance(earned, child.daily_limit_minutes, record.minutes_used, record.minutes_carried_over)
  const options = [5, 10, 15, 20, 30, 45, 60].filter((m) => m < balance.available)
  if (balance.available > 0) options.push(balance.available)

  const start = async (minutes: number) => {
    setBusy(true)
    try {
      await addUsed(child.id, minutes)
      const t = { endsAt: Date.now() + minutes * 60_000, minutes }
      writeTimer(child.id, t)
      setTimer(t)
      // En la app de móvil: aviso aunque el niño salga de la app
      void scheduleTimerEnd(child.id, child.name, t.endsAt)
      setNow(Date.now())
      setChoosing(false)
      setFinished(false)
    } finally {
      setBusy(false)
    }
  }

  const stopEarly = async () => {
    if (!timer) return
    const remaining = Math.floor((timer.endsAt - Date.now()) / 60_000)
    setBusy(true)
    try {
      if (remaining > 0) await addUsed(child.id, -remaining)
      void cancelTimerEnd(child.id)
      writeTimer(child.id, null)
      setTimer(null)
    } finally {
      setBusy(false)
    }
  }

  const remainingMs = timer ? timer.endsAt - now : 0
  const progress = timer ? 1 - remainingMs / (timer.minutes * 60_000) : 0

  return (
    <div className="neumorphic-lg animate-slide-up" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div className="avatar-circle" style={{ width: 48, height: 48, fontSize: '1.4rem', color: 'var(--primary)' }}>
          <Tv size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700 }}>Tiempo disponible ahora</p>
          <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.8rem', color: balance.available > 0 ? 'var(--primary)' : 'var(--text-light)', lineHeight: 1.1 }}>
            {formatMinutes(balance.available)}
          </p>
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, lineHeight: 1.6 }}>
          <div>Usados hoy: {formatMinutes(balance.used)}</div>
          {balance.carried > 0 && <div style={{ color: 'var(--success-dark)' }}>De ayer: +{formatMinutes(balance.carried)}</div>}
        </div>
      </div>

      {timer ? (
        <div className="neumorphic-inset animate-pulse-soft" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.25rem' }}>📺 ¡Disfruta! Te quedan</p>
          <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '3rem', color: 'var(--primary)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {formatClock(remainingMs)}
          </p>
          <div className="neumorphic-inset-sm" style={{ height: 10, borderRadius: 100, overflow: 'hidden', padding: 2, margin: '0.9rem 0' }}>
            <div style={{ height: '100%', width: `${Math.min(100, progress * 100)}%`, borderRadius: 100, background: 'linear-gradient(90deg, #5bb8ea, #4099c8)', transition: 'width 0.5s linear' }} />
          </div>
          <button onClick={stopEarly} disabled={busy} className="btn-ghost icon-btn" style={{ color: 'var(--danger)' }}>
            <Square size={16} /> Terminar antes
          </button>
        </div>
      ) : finished ? (
        <div className="animate-bounce-in" style={{ textAlign: 'center', padding: '0.5rem' }}>
          <p style={{ fontSize: '2.5rem' }}>⏰</p>
          <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.3rem', color: 'var(--text-main)' }}>¡Se acabó el tiempo!</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Hora de apagar la pantalla 👏</p>
          <button onClick={() => setFinished(false)} className="btn-ghost">Vale ✓</button>
        </div>
      ) : choosing ? (
        <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.9rem' }}>¿Cuánto tiempo quieres usar?</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {options.map((m, i) => (
              <button
                key={`${m}-${i}`}
                onClick={() => start(m)}
                disabled={busy}
                className={i === options.length - 1 ? 'btn-primary' : 'neumorphic-sm'}
                style={{ border: 'none', cursor: 'pointer', padding: '0.6rem 1rem', fontFamily: 'Fredoka, sans-serif', fontSize: '1rem', color: i === options.length - 1 ? 'white' : 'var(--text-main)' }}
              >
                {i === options.length - 1 ? `Todo (${formatMinutes(m)})` : formatMinutes(m)}
              </button>
            ))}
          </div>
          <button onClick={() => setChoosing(false)} className="btn-ghost" style={{ fontSize: '0.85rem' }}>Cancelar</button>
        </div>
      ) : (
        <button
          onClick={() => setChoosing(true)}
          disabled={balance.available <= 0}
          className="btn-primary icon-btn"
          style={{ width: '100%' }}
        >
          <Play size={18} /> {balance.available > 0 ? 'Usar tiempo de pantalla' : 'Completa tareas para ganar tiempo'}
        </button>
      )}
    </div>
  )
}
