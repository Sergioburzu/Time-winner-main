import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useChildrenStore } from '../store/childrenStore'
import { useTodayStore } from '../store/todayStore'
import type { AssignedTask } from '../store/todayStore'
import { useAuthStore } from '../store/authStore'
import { useFamilyData } from '../hooks/useFamilyData'
import { calculateMinuteStatus, formatMinutes, todayString } from '../lib/limits'
import { fetchStreak } from '../lib/streak'
import { launchConfetti, playFanfare, playSuccess, isSoundEnabled, setSoundEnabled, vibrate } from '../lib/celebrate'
import ProgressRing from '../components/ProgressRing'
import ScreenTimeCard from '../components/ScreenTimeCard'
import RewardsCard from '../components/RewardsCard'
import { Lock, Volume2, VolumeX } from 'lucide-react'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return '¡Buenos días'
  if (hour < 20) return '¡Buenas tardes'
  return '¡Buenas noches'
}

export default function ChildView() {
  const { childId } = useParams<{ childId: string }>()
  const navigate = useNavigate()
  const { ready, family } = useFamilyData()
  const { children } = useChildrenStore()
  const { assignedTasks, fetchTodayTasks, completeTask } = useTodayStore()
  const lockParent = useAuthStore((s) => s.lockParent)

  const child = children.find((c) => c.id === childId)
  const [completedAnimation, setCompletedAnimation] = useState<string | null>(null)
  const [showLimitMessage, setShowLimitMessage] = useState(false)
  const [streak, setStreak] = useState(0)
  const [sound, setSound] = useState(isSoundEnabled())
  const prevEarned = useRef<number | null>(null)

  // Al entrar en la vista del niño se bloquea la zona de padres:
  // así el niño no puede volver atrás al panel sin el PIN.
  useEffect(() => { lockParent() }, [lockParent])

  useEffect(() => {
    if (!childId) return
    void fetchTodayTasks(childId)
    // Refrescar cada 30 s (p. ej. si un padre aprueba o asigna desde otro móvil)
    const id = window.setInterval(() => void fetchTodayTasks(childId), 30_000)
    return () => window.clearInterval(id)
  }, [childId, fetchTodayTasks])

  const todayTasks = assignedTasks.filter((t) => t.child_id === childId && t.date === todayString())
  const completedTasks = todayTasks.filter((t) => t.status === 'completed')
  const awaitingTasks = todayTasks.filter((t) => t.status === 'awaiting_approval')
  const pendingTasks = todayTasks.filter((t) => t.status === 'pending')
  const earnedMinutes = completedTasks.reduce((sum, t) => sum + t.minutes_granted, 0)

  useEffect(() => {
    if (childId) void fetchStreak(childId).then(setStreak)
  }, [childId, completedTasks.length])

  const status = child ? calculateMinuteStatus(earnedMinutes, child.daily_limit_minutes) : null

  // Mostrar el mensaje de límite solo cuando se alcanza (no al abrir la pantalla)
  useEffect(() => {
    if (prevEarned.current !== null && status?.isAtLimit && earnedMinutes > prevEarned.current) {
      setShowLimitMessage(true)
    }
    prevEarned.current = earnedMinutes
  }, [earnedMinutes, status?.isAtLimit])

  const handleComplete = async (task: AssignedTask) => {
    if (task.status !== 'pending') return
    setCompletedAnimation(task.id)
    vibrate()
    const { status: newStatus } = await completeTask(task.id, family?.require_approval)
    setTimeout(() => setCompletedAnimation(null), 600)
    if (!newStatus) return

    const isLast = pendingTasks.length === 1
    if (isLast) {
      playFanfare()
      launchConfetti(2)
    } else {
      playSuccess()
      launchConfetti(0.5)
    }
  }

  const toggleSound = () => {
    setSoundEnabled(!sound)
    setSound(!sound)
  }

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)' }}>
        <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.3rem', color: 'var(--text-muted)' }}>⏳ Cargando...</p>
      </div>
    )
  }

  if (!child) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', background: 'var(--bg-app)', padding: '1.5rem', textAlign: 'center' }}>
        <p style={{ fontSize: '3rem' }}>🤔</p>
        <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.4rem', color: 'var(--text-muted)' }}>Perfil no encontrado</p>
        <button className="btn-primary" onClick={() => navigate('/parent')}>Ir a la zona de padres</button>
      </div>
    )
  }

  const allDone = todayTasks.length > 0 && pendingTasks.length === 0
  const allApproved = allDone && awaitingTasks.length === 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-app)', fontFamily: 'Nunito, sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', maxWidth: 560, margin: '0 auto', width: '100%' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'capitalize' }}>
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={toggleSound} className="btn-ghost" style={{ padding: '0.5rem' }} aria-label={sound ? 'Silenciar sonidos' : 'Activar sonidos'} title={sound ? 'Silenciar' : 'Activar sonido'}>
          {sound ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
        <button onClick={() => navigate('/parent')} className="btn-ghost icon-btn" style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem' }} title="Zona de padres (pide PIN)">
          <Lock size={15} /> Padres
        </button>
      </header>

      <main style={{ flex: 1, padding: '0.5rem 1.25rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 560, margin: '0 auto', width: '100%' }}>
        {/* Greeting */}
        <div className="neumorphic-lg animate-slide-up" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="avatar-circle avatar-circle-xl animate-float" style={{ flexShrink: 0 }}>
            {child.avatar}
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.6rem', color: 'var(--text-main)', lineHeight: 1.2 }}>
              {getGreeting()}, {child.name}!
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
              {todayTasks.length === 0
                ? 'Hoy no tienes tareas'
                : allApproved
                ? '¡Has completado todas tus tareas! 🌟'
                : allDone
                ? '¡Todo hecho! Falta que lo revisen 👀'
                : `Tienes ${pendingTasks.length} tarea${pendingTasks.length !== 1 ? 's' : ''} por hacer`}
            </p>
            {streak > 0 && (
              <span className="streak-badge animate-bounce-in" style={{ marginTop: '0.5rem' }} title="Días seguidos completando tareas">
                🔥 {streak} {streak === 1 ? 'día' : 'días seguidos'}
              </span>
            )}
          </div>
        </div>

        {/* Progress ring */}
        <div className="neumorphic-lg" style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <ProgressRing
            value={earnedMinutes}
            max={child.daily_limit_minutes}
            size={200}
            strokeWidth={18}
            label={formatMinutes(earnedMinutes)}
            sublabel={`de ${formatMinutes(child.daily_limit_minutes)}`}
            animate
          />
          <div style={{ textAlign: 'center' }}>
            {status?.isAtLimit ? (
              <div className="animate-bounce-in">
                <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.2rem', color: 'var(--success-dark)', fontWeight: 700 }}>
                  🌟 ¡Límite del día alcanzado!
                </p>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  Has ganado {formatMinutes(earnedMinutes)} de pantalla hoy.
                </p>
              </div>
            ) : status?.isNearLimit ? (
              <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.1rem', color: 'var(--warning)' }}>🔥 ¡Casi llegas al límite!</p>
            ) : earnedMinutes > 0 ? (
              <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.1rem', color: 'var(--primary)' }}>⭐ ¡Sigue así, lo estás haciendo genial!</p>
            ) : (
              <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>Completa tareas para ganar tiempo de pantalla ⬇️</p>
            )}
          </div>
        </div>

        {showLimitMessage && (
          <div className="neumorphic-lg animate-bounce-in" style={{ padding: '1.5rem', textAlign: 'center', background: 'linear-gradient(145deg, rgba(102,204,153,0.1), rgba(102,204,153,0.05))' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎊</div>
            <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.4rem', color: 'var(--success-dark)', marginBottom: '0.5rem' }}>
              ¡Has llegado a tu tiempo de hoy!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>
              {child.accumulate_extra
                ? 'Si sigues haciendo tareas, los minutos extra se guardan para mañana 🌟'
                : 'Las tareas extra te siguen dando ⭐ estrellas para tus premios 🎁'}
            </p>
            <button onClick={() => setShowLimitMessage(false)} className="btn-ghost" style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
              Entendido ✓
            </button>
          </div>
        )}

        {/* Saldo + temporizador */}
        <ScreenTimeCard child={child} earned={earnedMinutes} />

        {/* Tasks */}
        {todayTasks.length === 0 ? (
          <div className="neumorphic" style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🌙</div>
            <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.2rem', color: 'var(--text-muted)' }}>Hoy no tienes tareas asignadas</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>Pídele a mamá o papá que te añadan tareas</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {pendingTasks.length > 0 && (
              <section>
                <h2 className="section-title">📋 Por hacer</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {pendingTasks.map((task) => (
                    <button
                      key={task.id}
                      className={`child-task-card ${completedAnimation === task.id ? 'animate-task-complete' : ''}`}
                      onClick={() => handleComplete(task)}
                      style={{ padding: '1.1rem 1.25rem', border: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit' }}
                      aria-label={`Marcar "${task.task?.name ?? 'Tarea'}" como hecha`}
                    >
                      <div className="checkbox-big unchecked" style={{ width: 44, height: 44, borderRadius: 14 }} />
                      <span style={{ fontSize: '2rem', lineHeight: 1 }}>{task.task?.icon ?? '⭐'}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.15rem', color: 'var(--text-main)' }}>{task.task?.name ?? 'Tarea'}</p>
                        <p style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 700 }}>🕐 +{task.minutes_granted} minutos</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {awaitingTasks.length > 0 && (
              <section>
                <h2 className="section-title" style={{ color: '#d9822b' }}>⏳ Esperando a que papá o mamá lo revisen</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {awaitingTasks.map((task) => (
                    <div key={task.id} className="child-task-card" style={{ padding: '1rem 1.25rem', cursor: 'default', opacity: 0.9 }}>
                      <div className="checkbox-big" style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,179,71,0.25)' }}>
                        <span style={{ fontSize: '1.2rem' }}>⏳</span>
                      </div>
                      <span style={{ fontSize: '2rem', lineHeight: 1 }}>{task.task?.icon ?? '⭐'}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.1rem', color: 'var(--text-main)' }}>{task.task?.name ?? 'Tarea'}</p>
                        <p style={{ fontSize: '0.85rem', color: '#d9822b', fontWeight: 700 }}>+{task.minutes_granted} min cuando lo aprueben</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {completedTasks.length > 0 && (
              <section>
                <h2 className="section-title" style={{ color: 'var(--success-dark)' }}>✅ Completadas</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {completedTasks.map((task) => (
                    <div key={task.id} className="child-task-card completed" style={{ padding: '1rem 1.25rem', cursor: 'default' }}>
                      <div className="checkbox-big checked" style={{ width: 44, height: 44, borderRadius: 14, color: 'white' }}>
                        <span style={{ fontSize: '1.2rem' }}>✓</span>
                      </div>
                      <span style={{ fontSize: '2rem', lineHeight: 1, opacity: 0.6 }}>{task.task?.icon ?? '⭐'}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.1rem', color: 'var(--success-dark)', textDecoration: 'line-through', opacity: 0.7 }}>
                          {task.task?.name ?? 'Tarea'}
                        </p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--success-dark)', fontWeight: 700, opacity: 0.8 }}>
                          ✓ +{task.minutes_granted} minutos ganados
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {allApproved && (
          <div className="neumorphic-lg animate-bounce-in" style={{ padding: '2rem', textAlign: 'center', background: 'linear-gradient(145deg, rgba(77,168,218,0.08), rgba(102,204,153,0.08))' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }} className="animate-float">🏆</div>
            <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.4rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>¡Superstar del día!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Has completado todas tus tareas. ¡Mereces tu tiempo de pantalla!</p>
          </div>
        )}

        {family && <RewardsCard child={child} familyId={family.id} refreshKey={completedTasks.length} />}
      </main>
    </div>
  )
}
