import { useState } from 'react'
import { Plus, Settings, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import type { Child } from '../store/childrenStore'
import type { AssignedTask } from '../store/todayStore'
import ProgressRing from './ProgressRing'
import { calculateMinuteStatus, formatMinutes } from '../lib/limits'
import { useNavigate } from 'react-router-dom'

interface ChildProfileCardProps {
  child: Child
  assignedTasks: AssignedTask[]
  onAddTask: (child: Child) => void
  onEditChild: (child: Child) => void
  onDeleteChild: (child: Child) => void
  onRemoveTask: (assignedTaskId: string) => void
}

export default function ChildProfileCard({
  child,
  assignedTasks,
  onAddTask,
  onEditChild,
  onDeleteChild,
  onRemoveTask,
}: ChildProfileCardProps) {
  const navigate = useNavigate()
  const [tasksExpanded, setTasksExpanded] = useState(true)

  const earnedMinutes = assignedTasks
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + t.minutes_granted, 0)

  const status = calculateMinuteStatus(earnedMinutes, child.daily_limit_minutes)

  return (
    <div className="neumorphic-lg" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem 1.5rem 1.75rem' }}>
      {/* Header: avatar + info + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Avatar */}
        <button
          onClick={() => navigate(`/child/${child.id}`)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
          title={`Ir a vista de ${child.name}`}
        >
          <div className="avatar-circle avatar-circle-lg" style={{ transition: 'transform 0.2s' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
          >
            {child.avatar}
          </div>
        </button>

        {/* Name + age + limit */}
        <div style={{ flex: 1 }}>
          <h3 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.3rem', color: 'var(--text-main)' }}>
            {child.name}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {child.age} años · Límite: {formatMinutes(child.daily_limit_minutes)}/día
          </p>
          {/* Mini progress bar */}
          <div style={{ marginTop: '0.5rem' }}>
            <div
              className="neumorphic-inset-sm"
              style={{ height: 10, borderRadius: 100, overflow: 'hidden', padding: 2 }}
            >
              <div
                style={{
                  height: '100%',
                  borderRadius: 100,
                  background: status.isAtLimit
                    ? 'linear-gradient(90deg, #77dba8, #55bb88)'
                    : status.isNearLimit
                    ? 'linear-gradient(90deg, #ffc170, #ffb347)'
                    : 'linear-gradient(90deg, #5bb8ea, #4099c8)',
                  width: `${status.percentUsed}%`,
                  transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1), background 0.4s ease',
                  minWidth: status.percentUsed > 0 ? 8 : 0,
                }}
              />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {formatMinutes(earnedMinutes)} ganados de {formatMinutes(child.daily_limit_minutes)}
            </p>
          </div>
        </div>

        {/* Progress ring */}
        <ProgressRing
          value={earnedMinutes}
          max={child.daily_limit_minutes}
          size={80}
          strokeWidth={9}
          label={`${Math.round(status.percentUsed)}%`}
        />
      </div>

      <div className="divider" />

      {/* Task list header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={() => setTasksExpanded((e) => !e)}
          className="btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'Fredoka, sans-serif', fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', padding: '0.3rem 0' }}
        >
          {tasksExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          Tareas de hoy ({assignedTasks.filter(t => t.status === 'completed').length}/{assignedTasks.length})
        </button>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => onAddTask(child)}
            className="btn-primary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            id={`add-task-${child.id}`}
          >
            <Plus size={16} /> Tarea
          </button>
        </div>
      </div>

      {/* Tasks */}
      {tasksExpanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {assignedTasks.length === 0 ? (
            <div
              className="neumorphic-inset"
              style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}
            >
              <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✨</p>
              <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>Sin tareas asignadas hoy.</p>
              <p style={{ fontSize: '0.8rem' }}>Pulsa "+ Tarea" para añadir.</p>
            </div>
          ) : (
            assignedTasks.map((task) => (
              <div
                key={task.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.7rem 1rem',
                  borderRadius: 'var(--border-radius-sm)',
                  background: task.status === 'completed' ? 'rgba(102,204,153,0.08)' : 'var(--bg-app)',
                  boxShadow: task.status === 'completed'
                    ? 'inset 2px 2px 5px rgba(102,204,153,0.2), inset -2px -2px 5px rgba(255,255,255,0.9)'
                    : '3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light)',
                }}
              >
                <span style={{ fontSize: '1.4rem' }}>{task.task?.icon ?? '⭐'}</span>
                <span style={{
                  flex: 1,
                  fontFamily: 'Fredoka, sans-serif',
                  fontSize: '1rem',
                  color: task.status === 'completed' ? 'var(--success-dark)' : 'var(--text-main)',
                  textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                  opacity: task.status === 'completed' ? 0.7 : 1,
                }}>
                  {task.task?.name}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>
                  +{task.minutes_granted}min
                </span>
                {task.status === 'completed' && <span className="tag tag-success">✓</span>}
                <button
                  onClick={() => onRemoveTask(task.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-light)',
                    padding: '0.2rem',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--danger)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-light)' }}
                  aria-label="Quitar tarea"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Footer actions */}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', paddingTop: '0.25rem', marginTop: '0.25rem' }}>
        <button
          onClick={() => onEditChild(child)}
          className="btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}
        >
          <Settings size={14} /> Editar
        </button>
        <button
          onClick={() => navigate(`/child/${child.id}`)}
          className="btn-success"
          style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
        >
          👁 Vista hijo
        </button>
        <button
          onClick={() => onDeleteChild(child)}
          className="btn-ghost"
          style={{ color: 'var(--danger)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
