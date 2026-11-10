import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChildrenStore } from '../store/childrenStore'
import { useTasksStore, DEFAULT_TASK_ICONS } from '../store/tasksStore'
import { useAuthStore } from '../store/authStore'
import { getDefaultDailyLimit, formatMinutes } from '../lib/limits'
import { ArrowLeft, Settings as SettingsIcon, Trash2, Edit2, Check } from 'lucide-react'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { children, updateChild } = useChildrenStore()
  const { tasks, addTask, deleteTask, updateTask } = useTasksStore()
  const { family, isParentUnlocked, signOut } = useAuthStore()

  const [editingChildId, setEditingChildId] = useState<string | null>(null)
  const [tempLimit, setTempLimit] = useState<number>(60)
  const [tempAccumulate, setTempAccumulate] = useState(true)

  const [showAddTask, setShowAddTask] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskIcon, setNewTaskIcon] = useState('⭐')
  const [newTaskMinutes, setNewTaskMinutes] = useState(10)

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editTaskName, setEditTaskName] = useState('')
  const [editTaskMinutes, setEditTaskMinutes] = useState(10)

  if (!isParentUnlocked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)' }}>
        <button className="btn-primary" onClick={() => navigate('/parent')}>🔒 Ir al panel de padres</button>
      </div>
    )
  }

  const startEditChild = (child: typeof children[0]) => {
    setEditingChildId(child.id)
    setTempLimit(child.daily_limit_minutes)
    setTempAccumulate(child.accumulate_extra)
  }

  const saveChildSettings = async (childId: string) => {
    await updateChild(childId, {
      daily_limit_minutes: tempLimit,
      accumulate_extra: tempAccumulate,
    })
    setEditingChildId(null)
  }

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskName.trim() || !family) return
    await addTask(family.id, {
      name: newTaskName.trim(),
      icon: newTaskIcon,
      reward_minutes: newTaskMinutes,
    })
    setNewTaskName('')
    setNewTaskIcon('⭐')
    setNewTaskMinutes(10)
    setShowAddTask(false)
  }

  const startEditTask = (task: typeof tasks[0]) => {
    setEditingTaskId(task.id)
    setEditTaskName(task.name)
    setEditTaskMinutes(task.reward_minutes)
  }

  const saveTaskEdit = async (taskId: string) => {
    await updateTask(taskId, { name: editTaskName, reward_minutes: editTaskMinutes })
    setEditingTaskId(null)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-app)', fontFamily: 'Nunito, sans-serif' }}>
      {/* Header */}
      <header style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid rgba(163,177,198,0.3)' }}>
        <button onClick={() => navigate('/parent')} className="btn-ghost" style={{ padding: '0.5rem' }}>
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.4rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <SettingsIcon size={20} style={{ color: 'var(--primary)' }} /> Ajustes
        </h1>
      </header>

      <main style={{ padding: '1.5rem', maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* Child limits section */}
        <section>
          <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '1rem' }}>
            👶 Configuración por hijo/a
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {children.map((child) => {
              const isEditing = editingChildId === child.id
              const suggested = getDefaultDailyLimit(child.age)
              return (
                <div key={child.id} className="neumorphic" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: isEditing ? '1rem' : 0 }}>
                    <span style={{ fontSize: '2rem' }}>{child.avatar}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.1rem', color: 'var(--text-main)' }}>
                        {child.name}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {child.age} años · Límite: {formatMinutes(child.daily_limit_minutes)}/día ·{' '}
                        {child.accumulate_extra ? '📦 Acumula extra' : '✋ Sin acumular extra'}
                      </p>
                    </div>
                    <button
                      onClick={() => isEditing ? saveChildSettings(child.id) : startEditChild(child)}
                      className={isEditing ? 'btn-success' : 'btn-ghost'}
                      style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      {isEditing ? <><Check size={14} /> Guardar</> : <><Edit2 size={14} /> Editar</>}
                    </button>
                  </div>

                  {isEditing && (
                    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(163,177,198,0.3)' }}>
                      {/* Limit */}
                      <div>
                        <label style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                          ⏱ Límite diario (minutos)
                          <span style={{ color: 'var(--text-light)', fontWeight: 400, marginLeft: 8 }}>
                            Sugerido para {child.age} años: {suggested} min
                          </span>
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <button onClick={() => setTempLimit((l) => Math.max(5, l - 5))}
                            className="neumorphic-sm"
                            style={{ width: 40, height: 40, border: 'none', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fredoka', color: 'var(--text-main)' }}>−</button>
                          <input type="range" min={5} max={240} step={5} value={tempLimit}
                            onChange={(e) => setTempLimit(Number(e.target.value))}
                            style={{ flex: 1, accentColor: 'var(--primary)' }} />
                          <button onClick={() => setTempLimit((l) => Math.min(240, l + 5))}
                            className="neumorphic-sm"
                            style={{ width: 40, height: 40, border: 'none', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fredoka', color: 'var(--text-main)' }}>+</button>
                          <span style={{ minWidth: 60, fontFamily: 'Fredoka, sans-serif', fontSize: '1.1rem', color: 'var(--primary)', fontWeight: 700, textAlign: 'center' }}>
                            {formatMinutes(tempLimit)}
                          </span>
                        </div>
                      </div>

                      {/* Accumulate extra */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: 12, background: 'rgba(77,168,218,0.06)' }}>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                            📦 Guardar minutos extra
                          </p>
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Si supera el límite, los minutos se guardan para el día siguiente
                          </p>
                        </div>
                        <button
                          onClick={() => setTempAccumulate((a) => !a)}
                          style={{
                            width: 52,
                            height: 28,
                            borderRadius: 100,
                            border: 'none',
                            cursor: 'pointer',
                            background: tempAccumulate
                              ? 'linear-gradient(145deg, #77dba8, #55bb88)'
                              : 'rgba(163,177,198,0.5)',
                            position: 'relative',
                            flexShrink: 0,
                            transition: 'background 0.3s',
                            boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.15)',
                          }}
                          aria-pressed={tempAccumulate}
                          aria-label="Activar/desactivar acumulación de minutos extra"
                        >
                          <div style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: 'white',
                            position: 'absolute',
                            top: 3,
                            left: tempAccumulate ? 27 : 3,
                            transition: 'left 0.3s',
                            boxShadow: '1px 1px 4px rgba(0,0,0,0.2)',
                          }} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Task catalog section */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.25rem', color: 'var(--text-main)' }}>
              📋 Catálogo de tareas
            </h2>
            <button
              onClick={() => setShowAddTask((v) => !v)}
              className="btn-primary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              + Nueva tarea
            </button>
          </div>

          {/* Add task form */}
          {showAddTask && (
            <form
              onSubmit={handleAddTask}
              className="neumorphic animate-slide-up"
              style={{ padding: '1.25rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
            >
              <h3 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1rem', color: 'var(--text-main)' }}>✨ Nueva tarea</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                {DEFAULT_TASK_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setNewTaskIcon(icon)}
                    style={{
                      fontSize: '1.3rem', padding: '0.2rem 0.3rem', border: 'none', borderRadius: 8, cursor: 'pointer',
                      background: newTaskIcon === icon ? 'rgba(77,168,218,0.2)' : 'transparent',
                      boxShadow: newTaskIcon === icon ? '0 0 0 2px var(--primary)' : 'none',
                    }}
                  >{icon}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input type="text" className="input-neumorphic" style={{ flex: 2 }}
                  value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)}
                  placeholder="Nombre de la tarea" />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1 }}>
                  <input type="number" className="input-neumorphic" min={5} max={60} step={5}
                    value={newTaskMinutes} onChange={(e) => setNewTaskMinutes(Number(e.target.value))}
                    style={{ width: 70, textAlign: 'center' }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>min</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddTask(false)} className="btn-ghost">Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Añadir al catálogo</button>
              </div>
            </form>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {tasks.length === 0 && (
              <div className="neumorphic-inset" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p>No hay tareas en el catálogo. ¡Añade la primera!</p>
              </div>
            )}
            {tasks.map((task) => {
              const isEditing = editingTaskId === task.id
              return (
                <div
                  key={task.id}
                  className="neumorphic-sm"
                  style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                >
                  <span style={{ fontSize: '1.5rem' }}>{task.icon}</span>
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        className="input-neumorphic"
                        style={{ flex: 1, padding: '0.5rem 0.75rem' }}
                        value={editTaskName}
                        onChange={(e) => setEditTaskName(e.target.value)}
                      />
                      <input
                        type="number"
                        className="input-neumorphic"
                        style={{ width: 70, textAlign: 'center', padding: '0.5rem' }}
                        value={editTaskMinutes}
                        onChange={(e) => setEditTaskMinutes(Number(e.target.value))}
                        min={5} max={120}
                      />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>min</span>
                      <button onClick={() => saveTaskEdit(task.id)} className="btn-success" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                        <Check size={14} />
                      </button>
                      <button onClick={() => setEditingTaskId(null)} className="btn-ghost" style={{ padding: '0.4rem' }}>✕</button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1, fontFamily: 'Fredoka, sans-serif', fontSize: '1rem', color: 'var(--text-main)' }}>
                        {task.name}
                      </span>
                      <span className="tag">{task.reward_minutes} min</span>
                      <button onClick={() => startEditTask(task)} className="btn-ghost" style={{ padding: '0.3rem' }}>
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => window.confirm(`¿Eliminar "${task.name}" del catálogo?`) && deleteTask(task.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: '0.3rem', display: 'flex', transition: 'color 0.2s' }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--danger)' }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-light)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Sign out */}
        <section style={{ paddingTop: '1rem', borderTop: '1px solid rgba(163,177,198,0.3)', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => { signOut(); navigate('/') }}
            className="btn-ghost"
            style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            🚪 Cerrar sesión
          </button>
        </section>
      </main>
    </div>
  )
}
