import { useState } from 'react'
import { X } from 'lucide-react'
import type { Child } from '../store/childrenStore'
import type { Task } from '../store/tasksStore'
import { DEFAULT_TASK_ICONS, DEFAULT_TASKS } from '../store/tasksStore'

interface AddTaskModalProps {
  child: Child
  existingTasks: Task[]                   // family task catalog
  assignedTaskIds: string[]               // already assigned today
  onClose: () => void
  onAssignExisting: (task: Task) => void
  onCreateAndAssign: (taskData: Omit<Task, 'id' | 'family_id' | 'created_at'>) => Promise<void>
}

type Tab = 'catalog' | 'new'

export default function AddTaskModal({
  child,
  existingTasks,
  assignedTaskIds,
  onClose,
  onAssignExisting,
  onCreateAndAssign,
}: AddTaskModalProps) {
  const [tab, setTab] = useState<Tab>('catalog')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // New task form
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('⭐')
  const [newMinutes, setNewMinutes] = useState(10)

  const availableTasks = existingTasks.filter((t) => {
    const notAssigned = !assignedTaskIds.includes(t.id)
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase())
    return notAssigned && matchSearch
  })

  // Default tasks not yet in catalog (for quick add suggestions)
  const defaultSuggestions = DEFAULT_TASKS.filter(
    (dt) => !existingTasks.some((et) => et.name === dt.name) && !search
  ).slice(0, 6)

  const handleAssign = (task: Task) => {
    onAssignExisting(task)
    onClose()
  }

  const handleCreateAndAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) { setError('Introduce un nombre'); return }
    if (newMinutes < 1 || newMinutes > 120) { setError('Los minutos deben ser entre 1 y 120'); return }

    setLoading(true)
    setError('')
    try {
      await onCreateAndAssign({
        name: newName.trim(),
        icon: newIcon,
        reward_minutes: newMinutes,
      })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear la tarea')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 460 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.4rem', color: 'var(--text-main)' }}>
            ➕ Asignar tarea — {child.name}
          </h2>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '0.4rem' }}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {(['catalog', 'new'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`nav-tab ${tab === t ? 'active' : ''}`}
              style={{ flex: 1, flexDirection: 'row', gap: '0.4rem', fontSize: '0.9rem' }}
            >
              {t === 'catalog' ? '📋 Del catálogo' : '✨ Nueva tarea'}
            </button>
          ))}
        </div>

        {/* Tab: Catalog */}
        {tab === 'catalog' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              type="search"
              className="input-neumorphic"
              placeholder="🔍 Buscar tarea..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {/* Quick suggestions */}
            {defaultSuggestions.length > 0 && !search && (
              <div>
                <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  Sugeridas para empezar:
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {defaultSuggestions.map((dt) => (
                    <button
                      key={dt.name}
                      onClick={() => {
                        // Pre-fill new task form
                        setTab('new')
                        setNewName(dt.name)
                        setNewIcon(dt.icon)
                        setNewMinutes(dt.reward_minutes)
                      }}
                      style={{
                        background: 'rgba(77,168,218,0.08)',
                        border: '1.5px dashed rgba(77,168,218,0.4)',
                        borderRadius: 'var(--border-radius-sm)',
                        padding: '0.35rem 0.7rem',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontFamily: 'Nunito, sans-serif',
                        fontWeight: 700,
                        color: 'var(--primary)',
                        transition: 'all 0.2s',
                      }}
                    >
                      {dt.icon} {dt.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Task list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {availableTasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔍</p>
                  <p style={{ fontWeight: 600 }}>
                    {search ? 'Sin resultados' : 'No hay tareas en el catálogo'}
                  </p>
                  <p style={{ fontSize: '0.8rem' }}>Prueba la pestaña "Nueva tarea"</p>
                </div>
              ) : (
                availableTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => handleAssign(task)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--border-radius-sm)',
                      background: 'var(--bg-app)',
                      boxShadow: '3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light)',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      width: '100%',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateX(4px)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateX(0)' }}
                  >
                    <span style={{ fontSize: '1.5rem' }}>{task.icon}</span>
                    <span style={{ flex: 1, fontFamily: 'Fredoka, sans-serif', fontSize: '1rem', color: 'var(--text-main)' }}>
                      {task.name}
                    </span>
                    <span className="tag">{task.reward_minutes} min</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab: New task */}
        {tab === 'new' && (
          <form onSubmit={handleCreateAndAssign} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Icon picker */}
            <div>
              <label style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                Icono
              </label>
              <div
                className="neumorphic-inset"
                style={{
                  padding: '0.6rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(8, 1fr)',
                  gap: '0.3rem',
                }}
              >
                {DEFAULT_TASK_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setNewIcon(icon)}
                    style={{
                      fontSize: '1.3rem',
                      padding: '0.2rem',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: newIcon === icon ? 'rgba(77,168,218,0.2)' : 'transparent',
                      transform: newIcon === icon ? 'scale(1.2)' : 'scale(1)',
                      transition: 'all 0.15s',
                      boxShadow: newIcon === icon ? '0 0 0 2px var(--primary)' : 'none',
                    }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="task-name" style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                {newIcon} Nombre de la tarea
              </label>
              <input
                id="task-name"
                type="text"
                className="input-neumorphic"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej: Barrer el patio"
                maxLength={50}
                autoFocus
              />
            </div>

            {/* Minutes */}
            <div>
              <label style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                ⏱ Minutos de recompensa: <span style={{ color: 'var(--primary)', fontFamily: 'Fredoka, sans-serif', fontSize: '1.1rem' }}>{newMinutes}</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button type="button" onClick={() => setNewMinutes((m) => Math.max(5, m - 5))}
                  className="neumorphic-sm"
                  style={{ width: 40, height: 40, border: 'none', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'Fredoka, sans-serif', color: 'var(--text-main)' }}>−</button>
                <input type="range" min={5} max={60} step={5} value={newMinutes}
                  onChange={(e) => setNewMinutes(Number(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--primary)' }} />
                <button type="button" onClick={() => setNewMinutes((m) => Math.min(60, m + 5))}
                  className="neumorphic-sm"
                  style={{ width: 40, height: 40, border: 'none', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'Fredoka, sans-serif', color: 'var(--text-main)' }}>+</button>
              </div>
            </div>



            {error && <p style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.9rem' }}>⚠️ {error}</p>}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>Cancelar</button>
              <button type="submit" className="btn-primary" style={{ flex: 2 }} disabled={loading}>
                {loading ? '⏳ Guardando...' : '🎯 Crear y asignar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
