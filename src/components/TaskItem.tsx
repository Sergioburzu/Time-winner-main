import { useState, useRef } from 'react'
import { Check } from 'lucide-react'
import type { AssignedTask } from '../store/todayStore'

interface TaskItemProps {
  assignedTask: AssignedTask
  onComplete: (id: string) => void
  onUncomplete?: (id: string) => void
  onRemove?: (id: string) => void
  isParentView?: boolean
  className?: string
}

function spawnSparkles(el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  const colors = ['#4DA8DA', '#66CC99', '#FFB347', '#FF6B6B', '#9b6dda']
  for (let i = 0; i < 8; i++) {
    const particle = document.createElement('div')
    particle.className = 'sparkle-particle'
    const size = Math.random() * 10 + 6
    const angle = (Math.PI * 2 * i) / 8
    const distance = 40 + Math.random() * 20
    particle.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      left: ${rect.left + rect.width / 2 - size / 2}px;
      top: ${rect.top + rect.height / 2 - size / 2}px;
      --dx: ${Math.cos(angle) * distance}px;
      --dy: ${Math.sin(angle) * distance}px;
      position: fixed;
      z-index: 9999;
    `
    document.body.appendChild(particle)
    setTimeout(() => particle.remove(), 700)
  }
}

export default function TaskItem({
  assignedTask,
  onComplete,
  onUncomplete,
  onRemove,
  isParentView = false,
  className = '',
}: TaskItemProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const completed = assignedTask.status === 'completed'
  const task = assignedTask.task
  const icon = task?.icon ?? '⭐'
  const name = task?.name ?? 'Tarea'
  const minutes = assignedTask.minutes_granted

  const handleToggle = () => {
    if (completed && onUncomplete) {
      onUncomplete(assignedTask.id)
      return
    }
    if (!completed) {
      setIsAnimating(true)
      if (cardRef.current) spawnSparkles(cardRef.current)
      onComplete(assignedTask.id)
      setTimeout(() => setIsAnimating(false), 400)
    }
  }

  return (
    <div
      ref={cardRef}
      className={`child-task-card ${completed ? 'completed' : ''} ${isAnimating ? 'animate-task-complete' : ''} ${className}`}
      onClick={!isParentView ? handleToggle : undefined}
      style={{ cursor: isParentView ? 'default' : 'pointer' }}
      role={!isParentView ? 'button' : undefined}
      aria-pressed={!isParentView ? completed : undefined}
    >
      {/* Checkbox */}
      {!isParentView && (
        <div className={`checkbox-big ${completed ? 'checked' : 'unchecked'}`}>
          {completed && (
            <Check size={20} color="white" strokeWidth={3} className="animate-bounce-in" />
          )}
        </div>
      )}

      {/* Icon */}
      <span style={{ fontSize: '1.8rem', flexShrink: 0, lineHeight: 1 }}>{icon}</span>

      {/* Name + minutes */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontFamily: 'Fredoka, sans-serif',
            fontSize: '1.1rem',
            fontWeight: 600,
            color: completed ? 'var(--success-dark)' : 'var(--text-main)',
            textDecoration: completed ? 'line-through' : 'none',
            opacity: completed ? 0.7 : 1,
            transition: 'all 0.3s ease',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          🕐 {minutes} minutos
        </p>
      </div>

      {/* Parent actions */}
      {isParentView && onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(assignedTask.id) }}
          className="btn-ghost"
          style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: 'var(--danger)' }}
          aria-label="Quitar tarea"
        >
          ✕
        </button>
      )}

      {/* Completed badge (parent view) */}
      {isParentView && completed && (
        <span className="tag tag-success" style={{ flexShrink: 0 }}>✓ Hecho</span>
      )}
    </div>
  )
}
