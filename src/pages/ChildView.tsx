import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useChildrenStore } from '../store/childrenStore'
import { useTodayStore } from '../store/todayStore'
import { calculateMinuteStatus, formatMinutes, todayString } from '../lib/limits'
import ProgressRing from '../components/ProgressRing'
import { ArrowLeft, Home } from 'lucide-react'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return '¡Buenos días'
  if (hour < 18) return '¡Buenas tardes'
  return '¡Buenas noches'
}

export default function ChildView() {
  const { childId } = useParams<{ childId: string }>()
  const navigate = useNavigate()
  const { children } = useChildrenStore()
  const { assignedTasks, fetchTodayTasks, completeTask } = useTodayStore()

  const child = children.find((c) => c.id === childId)
  const [completedAnimation, setCompletedAnimation] = useState<string | null>(null)
  const [showLimitMessage, setShowLimitMessage] = useState(false)
  const [prevEarned, setPrevEarned] = useState(0)

  useEffect(() => {
    if (childId) fetchTodayTasks(childId)
  }, [childId, fetchTodayTasks])

  const todayTasks = assignedTasks.filter((t) => t.child_id === childId && t.date === todayString())
  const earnedMinutes = todayTasks
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + t.minutes_granted, 0)

  const status = child
    ? calculateMinuteStatus(earnedMinutes, child.daily_limit_minutes)
    : null

  // Show limit message when reaching the cap
  useEffect(() => {
    if (status?.isAtLimit && earnedMinutes > prevEarned) {
      setShowLimitMessage(true)
    }
    setPrevEarned(earnedMinutes)
  }, [earnedMinutes, status?.isAtLimit])

  const handleComplete = async (assignedTaskId: string) => {
    const task = todayTasks.find((t) => t.id === assignedTaskId)
    if (!task || task.status === 'completed') return

    setCompletedAnimation(assignedTaskId)
    await completeTask(assignedTaskId)
    setTimeout(() => setCompletedAnimation(null), 600)
  }

  if (!child) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', background: 'var(--bg-app)' }}>
        <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.4rem', color: 'var(--text-muted)' }}>Perfil no encontrado</p>
        <button className="btn-primary" onClick={() => navigate('/')}>Volver al inicio</button>
      </div>
    )
  }

  const pendingTasks = todayTasks.filter((t) => t.status === 'pending')
  const completedTasks = todayTasks.filter((t) => t.status === 'completed')
  const allDone = todayTasks.length > 0 && pendingTasks.length === 0

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-app)',
        fontFamily: 'Nunito, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <header style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button onClick={() => navigate(-1)} className="btn-ghost" style={{ padding: '0.5rem' }}>
          <ArrowLeft size={22} />
        </button>
        <button onClick={() => navigate('/')} className="btn-ghost" style={{ padding: '0.5rem' }}>
          <Home size={20} />
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
        </div>
      </header>

      {/* Main */}
      <main style={{ flex: 1, padding: '0.5rem 1.25rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 520, margin: '0 auto', width: '100%' }}>
        {/* Greeting */}
        <div className="neumorphic-lg animate-slide-up" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="avatar-circle avatar-circle-xl" style={{ flexShrink: 0 }}>
            {child.avatar}
          </div>
          <div>
            <h1 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.6rem', color: 'var(--text-main)', lineHeight: 1.2 }}>
              {getGreeting()}, {child.name}!
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
              {allDone
                ? '¡Has completado todas tus tareas! 🌟'
                : `Tienes ${pendingTasks.length} tarea${pendingTasks.length !== 1 ? 's' : ''} pendiente${pendingTasks.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        {/* Progress ring */}
        <div
          className="neumorphic-lg"
          style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}
        >
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
              <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.1rem', color: 'var(--warning)' }}>
                🔥 ¡Casi llegas al límite!
              </p>
            ) : earnedMinutes > 0 ? (
              <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.1rem', color: 'var(--primary)' }}>
                ⭐ ¡Sigue así, lo estás haciendo genial!
              </p>
            ) : (
              <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                Completa tareas para ganar tiempo de pantalla ⬇️
              </p>
            )}
          </div>
        </div>

        {/* Limit reached big message */}
        {showLimitMessage && (
          <div
            className="neumorphic-lg animate-bounce-in"
            style={{
              padding: '1.5rem',
              textAlign: 'center',
              background: 'linear-gradient(145deg, rgba(102,204,153,0.1), rgba(102,204,153,0.05))',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎊</div>
            <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.4rem', color: 'var(--success-dark)', marginBottom: '0.5rem' }}>
              ¡Has llegado a tu tiempo de hoy!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>
              Mañana más 🌟 Puedes seguir completando tareas para guardar minutos.
            </p>
            <button
              onClick={() => setShowLimitMessage(false)}
              className="btn-ghost"
              style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}
            >
              Entendido ✓
            </button>
          </div>
        )}

        {/* Tasks */}
        {todayTasks.length === 0 ? (
          <div className="neumorphic" style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🌙</div>
            <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.2rem', color: 'var(--text-muted)' }}>
              Hoy no tienes tareas asignadas
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>
              Pídele a mamá o papá que te añadan tareas
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Pending tasks */}
            {pendingTasks.length > 0 && (
              <div>
                <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '0.75rem', paddingLeft: '0.25rem' }}>
                  📋 Por hacer
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {pendingTasks.map((task) => {
                    const isAnimating = completedAnimation === task.id
                    return (
                      <div
                        key={task.id}
                        className={`child-task-card ${isAnimating ? 'animate-task-complete' : ''}`}
                        onClick={() => handleComplete(task.id)}
                        role="button"
                        style={{
                          padding: '1.1rem 1.25rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                        }}
                      >
                        {/* Big checkbox */}
                        <div className="checkbox-big unchecked" style={{ width: 44, height: 44, borderRadius: 14 }} />

                        <span style={{ fontSize: '2rem', lineHeight: 1 }}>{task.task?.icon ?? '⭐'}</span>

                        <div style={{ flex: 1 }}>
                          <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.15rem', color: 'var(--text-main)' }}>
                            {task.task?.name ?? 'Tarea'}
                          </p>
                          <p style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 700 }}>
                            🕐 +{task.minutes_granted} minutos
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Completed tasks */}
            {completedTasks.length > 0 && (
              <div>
                <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.2rem', color: 'var(--success-dark)', marginBottom: '0.75rem', paddingLeft: '0.25rem' }}>
                  ✅ Completadas
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {completedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="child-task-card completed"
                      style={{
                        padding: '1rem 1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        cursor: 'default',
                      }}
                    >
                      <div className="checkbox-big checked" style={{ width: 44, height: 44, borderRadius: 14 }}>
                        <span style={{ fontSize: '1.2rem' }}>✓</span>
                      </div>
                      <span style={{ fontSize: '2rem', lineHeight: 1, opacity: 0.6 }}>{task.task?.icon ?? '⭐'}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{
                          fontFamily: 'Fredoka, sans-serif',
                          fontSize: '1.1rem',
                          color: 'var(--success-dark)',
                          textDecoration: 'line-through',
                          opacity: 0.7,
                        }}>
                          {task.task?.name ?? 'Tarea'}
                        </p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--success-dark)', fontWeight: 700, opacity: 0.8 }}>
                          ✓ +{task.minutes_granted} minutos ganados
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* All done celebration */}
        {allDone && (
          <div
            className="neumorphic-lg animate-bounce-in"
            style={{
              padding: '2rem',
              textAlign: 'center',
              background: 'linear-gradient(145deg, rgba(77,168,218,0.08), rgba(102,204,153,0.08))',
            }}
          >
            <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }} className="animate-float">🏆</div>
            <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.4rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>
              ¡Superstar del día!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Has completado todas tus tareas. ¡Mereces tu tiempo de pantalla!
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
