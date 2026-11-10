import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChildrenStore } from '../store/childrenStore'
import { useTasksStore, DEFAULT_TASK_ICONS } from '../store/tasksStore'
import { useAuthStore } from '../store/authStore'
import { useRecurringStore } from '../store/recurringStore'
import { useRewardsStore } from '../store/rewardsStore'
import { useFamilyData } from '../hooks/useFamilyData'
import { getDefaultDailyLimit, formatMinutes, formatWeekdays } from '../lib/limits'
import { getThemeMode, setThemeMode } from '../lib/theme'
import type { ThemeMode } from '../lib/theme'
import { isSoundEnabled, setSoundEnabled } from '../lib/celebrate'
import { isValidPin } from '../lib/pin'
import ParentNav from '../components/ParentNav'
import WeekdayPicker from '../components/WeekdayPicker'
import { ArrowLeft, Settings as SettingsIcon, Trash2, Edit2, Check, Sun, Moon, Monitor } from 'lucide-react'

const REWARD_ICONS = ['🎁', '🍕', '🍦', '🎬', '🎮', '🧸', '📖', '🏞️', '🍿', '🛝', '🎨', '⚽', '🍫', '🛌', '🎡', '👑']

const REWARD_SUGGESTIONS = [
  { name: 'Elegir la cena', icon: '🍕', cost_stars: 60 },
  { name: 'Helado', icon: '🍦', cost_stars: 40 },
  { name: 'Noche de peli', icon: '🎬', cost_stars: 120 },
  { name: 'Acostarse 30 min más tarde', icon: '🛌', cost_stars: 80 },
  { name: 'Ir al parque', icon: '🛝', cost_stars: 50 },
]

const labelStyle: React.CSSProperties = { fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }
const h2Style: React.CSSProperties = { fontFamily: 'Fredoka, sans-serif', fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '1rem' }
const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.85rem 1rem' }

export default function SettingsPage() {
  const navigate = useNavigate()
  useFamilyData()
  const { children, updateChild } = useChildrenStore()
  const { tasks, addTask, deleteTask, updateTask } = useTasksStore()
  const { family, isParentUnlocked, signOut, setParentPin, updateFamily } = useAuthStore()
  const { recurring, available: recurringAvailable, fetchRecurring, saveRecurring, removeRecurring } = useRecurringStore()
  const { rewards, available: rewardsAvailable, fetchRewards, addReward, deleteReward } = useRewardsStore()

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

  // Apariencia
  const [theme, setTheme] = useState<ThemeMode>(getThemeMode())
  const [sound, setSound] = useState(isSoundEnabled())

  // PIN
  const [newPin, setNewPin] = useState('')
  const [newPinConfirm, setNewPinConfirm] = useState('')
  const [pinMsg, setPinMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Aprobación
  const [approvalError, setApprovalError] = useState('')

  // Recurrentes
  const [editingRecurringId, setEditingRecurringId] = useState<string | null>(null)
  const [tempWeekdays, setTempWeekdays] = useState<number[]>([])

  // Premios
  const [showAddReward, setShowAddReward] = useState(false)
  const [rewardName, setRewardName] = useState('')
  const [rewardIcon, setRewardIcon] = useState('🎁')
  const [rewardCost, setRewardCost] = useState(60)
  const [rewardError, setRewardError] = useState('')

  const childIdsKey = children.map((c) => c.id).join(',')
  useEffect(() => {
    if (childIdsKey) void fetchRecurring(childIdsKey.split(','))
  }, [childIdsKey, fetchRecurring])

  useEffect(() => {
    if (family) void fetchRewards(family.id)
  }, [family, fetchRewards])

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

  const changeTheme = (mode: ThemeMode) => {
    setTheme(mode)
    setThemeMode(mode)
  }

  const toggleSound = () => {
    setSoundEnabled(!sound)
    setSound(!sound)
  }

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault()
    setPinMsg(null)
    if (!isValidPin(newPin)) { setPinMsg({ ok: false, text: 'El PIN debe tener 4 dígitos' }); return }
    if (newPin !== newPinConfirm) { setPinMsg({ ok: false, text: 'Los PINs no coinciden' }); return }
    await setParentPin(newPin)
    const saved = Boolean(useAuthStore.getState().family?.parent_pin_hash)
    setNewPin('')
    setNewPinConfirm('')
    setPinMsg(saved
      ? { ok: true, text: 'PIN actualizado en todos tus dispositivos ✓' }
      : { ok: false, text: 'PIN guardado solo en este navegador. Ejecuta supabase_migration_v2.sql para sincronizarlo.' })
  }

  const toggleApproval = async () => {
    if (!family) return
    setApprovalError('')
    try {
      await updateFamily({ require_approval: !family.require_approval })
    } catch {
      setApprovalError('No se pudo guardar. ¿Has ejecutado supabase_migration_v2.sql en Supabase?')
    }
  }

  const handleAddReward = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!family || !rewardName.trim()) return
    setRewardError('')
    try {
      await addReward(family.id, { name: rewardName.trim(), icon: rewardIcon, cost_stars: rewardCost })
      setRewardName('')
      setRewardIcon('🎁')
      setRewardCost(60)
      setShowAddReward(false)
    } catch (err) {
      setRewardError(err instanceof Error ? err.message : 'No se pudo crear el premio')
    }
  }

  const migrationHint = (
    <div className="neumorphic-inset" style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
      ⚙️ Para activar esta función ejecuta el archivo <strong>supabase_migration_v2.sql</strong> en el SQL Editor de Supabase y recarga la página.
    </div>
  )

  return (
    <div className="has-bottom-nav" style={{ minHeight: '100vh', background: 'var(--bg-app)', fontFamily: 'Nunito, sans-serif' }}>
      {/* Header */}
      <header style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid rgba(163,177,198,0.3)' }}>
        <button onClick={() => navigate('/parent')} className="btn-ghost only-desktop" style={{ padding: '0.5rem' }} aria-label="Volver al panel">
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.4rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <SettingsIcon size={20} style={{ color: 'var(--primary)' }} /> Ajustes
        </h1>
      </header>

      <main className="page-main" style={{ padding: '1.5rem', maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* Apariencia */}
        <section>
          <h2 style={h2Style}>🎨 Apariencia</h2>
          <div className="neumorphic" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ ...rowStyle, flexWrap: 'wrap' }}>
              <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>Tema</p>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {([
                  { mode: 'light', label: 'Claro', icon: <Sun size={15} /> },
                  { mode: 'dark', label: 'Oscuro', icon: <Moon size={15} /> },
                  { mode: 'system', label: 'Auto', icon: <Monitor size={15} /> },
                ] as const).map((o) => (
                  <button
                    key={o.mode}
                    onClick={() => changeTheme(o.mode)}
                    className={`nav-tab ${theme === o.mode ? 'active' : ''}`}
                    style={{ flexDirection: 'row', gap: '0.35rem', fontSize: '0.85rem' }}
                    aria-pressed={theme === o.mode}
                  >
                    {o.icon} {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="divider" style={{ margin: 0 }} />
            <div style={rowStyle}>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>🔊 Sonidos y celebraciones</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Sonido al completar tareas y al acabar el temporizador (en este dispositivo)</p>
              </div>
              <button onClick={toggleSound} className={`switch ${sound ? 'on' : ''}`} aria-pressed={sound} aria-label="Activar o desactivar sonidos" />
            </div>
          </div>
        </section>

        {/* Seguridad */}
        <section>
          <h2 style={h2Style}>🔐 Control parental</h2>
          <div className="neumorphic" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={rowStyle}>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>✅ Aprobar las tareas</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Cuando el niño marca una tarea, los minutos no cuentan hasta que tú la apruebes
                </p>
              </div>
              <button
                onClick={toggleApproval}
                className={`switch ${family?.require_approval ? 'on' : ''}`}
                aria-pressed={family?.require_approval}
                aria-label="Exigir aprobación de tareas"
              />
            </div>
            {approvalError && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 600, padding: '0 1rem 0.75rem' }}>⚠️ {approvalError}</p>}
            <div className="divider" style={{ margin: 0 }} />
            <form onSubmit={handleChangePin} style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>🔑 Cambiar PIN de padres</p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input
                  type="password" inputMode="numeric" maxLength={4} placeholder="Nuevo PIN"
                  className="input-neumorphic" style={{ flex: '1 1 120px' }}
                  value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  aria-label="Nuevo PIN"
                />
                <input
                  type="password" inputMode="numeric" maxLength={4} placeholder="Repetir PIN"
                  className="input-neumorphic" style={{ flex: '1 1 120px' }}
                  value={newPinConfirm} onChange={(e) => setNewPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  aria-label="Repetir nuevo PIN"
                />
                <button type="submit" className="btn-primary" style={{ padding: '0.6rem 1.2rem', fontSize: '0.95rem' }}>Guardar</button>
              </div>
              {pinMsg && (
                <p style={{ fontSize: '0.82rem', fontWeight: 700, color: pinMsg.ok ? 'var(--success-dark)' : 'var(--danger)' }}>{pinMsg.text}</p>
              )}
            </form>
          </div>
        </section>

        {/* Child limits section */}
        <section>
          <h2 style={h2Style}>👶 Configuración por hijo/a</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {children.map((child) => {
              const isEditing = editingChildId === child.id
              const suggested = getDefaultDailyLimit(child.age)
              return (
                <div key={child.id} className="neumorphic" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: isEditing ? '1rem' : 0 }}>
                    <span style={{ fontSize: '2rem' }}>{child.avatar}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.1rem', color: 'var(--text-main)' }}>{child.name}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {child.age} años · Límite: {formatMinutes(child.daily_limit_minutes)}/día ·{' '}
                        {child.accumulate_extra ? '📦 Guarda minutos' : '✋ No guarda minutos'}
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
                      <div>
                        <label style={labelStyle}>
                          ⏱ Límite diario (minutos)
                          <span style={{ color: 'var(--text-light)', fontWeight: 400, marginLeft: 8 }}>
                            Sugerido para {child.age} años: {suggested} min
                          </span>
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <button onClick={() => setTempLimit((l) => Math.max(5, l - 5))}
                            className="neumorphic-sm"
                            style={{ width: 40, height: 40, border: 'none', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fredoka', color: 'var(--text-main)', flexShrink: 0 }}>−</button>
                          <input type="range" min={5} max={240} step={5} value={tempLimit}
                            onChange={(e) => setTempLimit(Number(e.target.value))}
                            style={{ flex: 1, accentColor: 'var(--primary)', minWidth: 0 }} />
                          <button onClick={() => setTempLimit((l) => Math.min(240, l + 5))}
                            className="neumorphic-sm"
                            style={{ width: 40, height: 40, border: 'none', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fredoka', color: 'var(--text-main)', flexShrink: 0 }}>+</button>
                          <span style={{ minWidth: 60, fontFamily: 'Fredoka, sans-serif', fontSize: '1.1rem', color: 'var(--primary)', fontWeight: 700, textAlign: 'center' }}>
                            {formatMinutes(tempLimit)}
                          </span>
                        </div>
                      </div>

                      <div style={{ ...rowStyle, borderRadius: 12, background: 'var(--surface-tint)' }}>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>📦 Guardar minutos para mañana</p>
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Los minutos que no use (o que gane por encima del límite) pasan al día siguiente. Nunca se supera el límite diario.
                          </p>
                        </div>
                        <button
                          onClick={() => setTempAccumulate((a) => !a)}
                          className={`switch ${tempAccumulate ? 'on' : ''}`}
                          aria-pressed={tempAccumulate}
                          aria-label="Activar/desactivar acumulación de minutos"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Recurrentes */}
        <section>
          <h2 style={h2Style}>🔁 Tareas que se repiten</h2>
          {!recurringAvailable ? migrationHint : recurring.length === 0 ? (
            <div className="neumorphic-inset" style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Aún no hay tareas repetidas. Al asignar una tarea desde el panel, elige los días en "🔁 Repetir".
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {children.map((child) => {
                const items = recurring.filter((r) => r.child_id === child.id)
                if (items.length === 0) return null
                return (
                  <div key={child.id} className="neumorphic" style={{ padding: '1rem 1.25rem' }}>
                    <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.05rem', color: 'var(--text-main)', marginBottom: '0.6rem' }}>
                      {child.avatar} {child.name}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {items.map((r) => (
                        <div key={r.id} className="neumorphic-sm" style={{ padding: '0.65rem 0.9rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <span style={{ fontSize: '1.3rem' }}>{r.task?.icon ?? '⭐'}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontFamily: 'Fredoka, sans-serif', color: 'var(--text-main)' }}>{r.task?.name ?? 'Tarea'}</p>
                              <p style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>{formatWeekdays(r.weekdays)}</p>
                            </div>
                            <button
                              onClick={() => {
                                if (editingRecurringId === r.id) { setEditingRecurringId(null); return }
                                setEditingRecurringId(r.id)
                                setTempWeekdays(r.weekdays)
                              }}
                              className="btn-ghost" style={{ padding: '0.3rem' }} aria-label="Editar días"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => window.confirm(`¿Dejar de repetir "${r.task?.name}"?`) && removeRecurring(r.id)}
                              className="btn-ghost" style={{ padding: '0.3rem', color: 'var(--danger)' }} aria-label="Dejar de repetir"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          {editingRecurringId === r.id && (
                            <div className="animate-slide-up" style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                              <WeekdayPicker value={tempWeekdays} onChange={setTempWeekdays} />
                              <button
                                className="btn-success" style={{ padding: '0.5rem', fontSize: '0.9rem' }}
                                onClick={async () => {
                                  if (tempWeekdays.length === 0) await removeRecurring(r.id)
                                  else await saveRecurring(r.child_id, r.task_id, tempWeekdays)
                                  setEditingRecurringId(null)
                                }}
                              >
                                Guardar días
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Premios */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '0.75rem' }}>
            <h2 style={{ ...h2Style, marginBottom: 0 }}>🎁 Premios</h2>
            {rewardsAvailable && (
              <button onClick={() => setShowAddReward((v) => !v)} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                + Nuevo premio
              </button>
            )}
          </div>
          {!rewardsAvailable ? migrationHint : (
            <>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                Cada minuto ganado con tareas da 1 ⭐. Las estrellas se acumulan y los niños las canjean por estos premios desde su vista. Canjear no quita tiempo de pantalla.
              </p>

              {showAddReward && (
                <form onSubmit={handleAddReward} className="neumorphic animate-slide-up" style={{ padding: '1.25rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {REWARD_SUGGESTIONS.filter((sg) => !rewards.some((r) => r.name === sg.name)).map((sg) => (
                      <button
                        key={sg.name} type="button"
                        onClick={() => { setRewardName(sg.name); setRewardIcon(sg.icon); setRewardCost(sg.cost_stars) }}
                        className="tag" style={{ border: '1.5px dashed rgba(77,168,218,0.4)', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        {sg.icon} {sg.name}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {REWARD_ICONS.map((icon) => (
                      <button
                        key={icon} type="button" onClick={() => setRewardIcon(icon)}
                        style={{
                          fontSize: '1.3rem', padding: '0.2rem 0.3rem', border: 'none', borderRadius: 8, cursor: 'pointer',
                          background: rewardIcon === icon ? 'rgba(77,168,218,0.2)' : 'transparent',
                          boxShadow: rewardIcon === icon ? '0 0 0 2px var(--primary)' : 'none',
                        }}
                      >{icon}</button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <input type="text" className="input-neumorphic" style={{ flex: '2 1 180px' }} maxLength={50}
                      value={rewardName} onChange={(e) => setRewardName(e.target.value)} placeholder="Nombre del premio" aria-label="Nombre del premio" />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: '1 1 110px' }}>
                      <input type="number" className="input-neumorphic" min={1} max={100000} step={5}
                        value={rewardCost} onChange={(e) => setRewardCost(Math.max(1, Number(e.target.value)))}
                        style={{ width: 90, textAlign: 'center' }} aria-label="Coste en estrellas" />
                      <span style={{ fontSize: '0.9rem' }}>⭐</span>
                    </div>
                  </div>
                  {rewardError && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600 }}>⚠️ {rewardError}</p>}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" onClick={() => setShowAddReward(false)} className="btn-ghost">Cancelar</button>
                    <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={!rewardName.trim()}>Crear premio</button>
                  </div>
                </form>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {rewards.length === 0 && !showAddReward && (
                  <div className="neumorphic-inset" style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Aún no hay premios. ¡Crea el primero!
                  </div>
                )}
                {rewards.map((r) => (
                  <div key={r.id} className="neumorphic-sm" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>{r.icon}</span>
                    <span style={{ flex: 1, fontFamily: 'Fredoka, sans-serif', fontSize: '1rem', color: 'var(--text-main)' }}>{r.name}</span>
                    <span className="tag tag-warning">{r.cost_stars} ⭐</span>
                    <button
                      onClick={() => window.confirm(`¿Eliminar el premio "${r.name}"?`) && deleteReward(r.id)}
                      className="btn-ghost" style={{ padding: '0.3rem', color: 'var(--text-light)' }} aria-label="Eliminar premio"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Task catalog section */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '0.75rem' }}>
            <h2 style={{ ...h2Style, marginBottom: 0 }}>📋 Catálogo de tareas</h2>
            <button onClick={() => setShowAddTask((v) => !v)} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
              + Nueva tarea
            </button>
          </div>

          {showAddTask && (
            <form onSubmit={handleAddTask} className="neumorphic animate-slide-up" style={{ padding: '1.25rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h3 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1rem', color: 'var(--text-main)' }}>✨ Nueva tarea</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                {DEFAULT_TASK_ICONS.map((icon) => (
                  <button
                    key={icon} type="button" onClick={() => setNewTaskIcon(icon)}
                    style={{
                      fontSize: '1.3rem', padding: '0.2rem 0.3rem', border: 'none', borderRadius: 8, cursor: 'pointer',
                      background: newTaskIcon === icon ? 'rgba(77,168,218,0.2)' : 'transparent',
                      boxShadow: newTaskIcon === icon ? '0 0 0 2px var(--primary)' : 'none',
                    }}
                  >{icon}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input type="text" className="input-neumorphic" style={{ flex: '2 1 180px' }}
                  value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)}
                  placeholder="Nombre de la tarea" aria-label="Nombre de la tarea" />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: '1 1 100px' }}>
                  <input type="number" className="input-neumorphic" min={5} max={60} step={5}
                    value={newTaskMinutes} onChange={(e) => setNewTaskMinutes(Number(e.target.value))}
                    style={{ width: 70, textAlign: 'center' }} aria-label="Minutos de recompensa" />
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
                <div key={task.id} className="neumorphic-sm" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: isEditing ? 'wrap' : 'nowrap' }}>
                  <span style={{ fontSize: '1.5rem' }}>{task.icon}</span>
                  {isEditing ? (
                    <>
                      <input type="text" className="input-neumorphic" style={{ flex: '1 1 140px', padding: '0.5rem 0.75rem' }}
                        value={editTaskName} onChange={(e) => setEditTaskName(e.target.value)} aria-label="Nombre de la tarea" />
                      <input type="number" className="input-neumorphic" style={{ width: 70, textAlign: 'center', padding: '0.5rem' }}
                        value={editTaskMinutes} onChange={(e) => setEditTaskMinutes(Number(e.target.value))} min={5} max={120} aria-label="Minutos" />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>min</span>
                      <button onClick={() => saveTaskEdit(task.id)} className="btn-success" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} aria-label="Guardar">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setEditingTaskId(null)} className="btn-ghost" style={{ padding: '0.4rem' }} aria-label="Cancelar">✕</button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1, minWidth: 0, fontFamily: 'Fredoka, sans-serif', fontSize: '1rem', color: 'var(--text-main)' }}>{task.name}</span>
                      <span className="tag">{task.reward_minutes} min</span>
                      <button onClick={() => startEditTask(task)} className="btn-ghost" style={{ padding: '0.3rem' }} aria-label="Editar tarea">
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => window.confirm(`¿Eliminar "${task.name}" del catálogo?`) && deleteTask(task.id)}
                        className="btn-ghost" style={{ padding: '0.3rem', color: 'var(--text-light)' }} aria-label="Eliminar tarea"
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
          <button onClick={() => { signOut(); navigate('/') }} className="btn-ghost" style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🚪 Cerrar sesión
          </button>
        </section>
      </main>

      <ParentNav active="settings" />
    </div>
  )
}
