import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useChildrenStore } from '../store/childrenStore'
import type { Child } from '../store/childrenStore'
import { useTasksStore } from '../store/tasksStore'
import { useTodayStore } from '../store/todayStore'
import { todayString, formatMinutes } from '../lib/limits'
import ChildProfileCard from '../components/ChildProfileCard'
import AddChildModal from '../components/AddChildModal'
import AddTaskModal from '../components/AddTaskModal'
import PinLock from '../components/PinLock'
import ParentNav from '../components/ParentNav'
import { LogOut, Plus, History, Settings, RefreshCw, Info, X, Lock, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useFamilyData, invalidateFamilyData } from '../hooks/useFamilyData'
import { useRecurringStore } from '../store/recurringStore'
import { useMinutesStore } from '../store/minutesStore'
import { useRewardsStore } from '../store/rewardsStore'
import { calculateBalance } from '../lib/limits'

export default function ParentDashboard() {
  const navigate = useNavigate()
  const { family, user, signOut, isParentUnlocked, lockParent, loadSession } = useAuthStore()
  const { children, fetchChildren, addChild, updateChild, deleteChild } = useChildrenStore()
  const { tasks, fetchTasks, addTask } = useTasksStore()
  const { assignedTasks, approvals, fetchTodayTasks, fetchApprovals, assignTask, removeAssignedTask, approveTask, rejectTask } = useTodayStore()
  const { recurring, available: recurringAvailable, fetchRecurring, saveRecurring } = useRecurringStore()
  const { records: minuteRecords, loadToday } = useMinutesStore()
  const { redemptions, fetchPendingRedemptions, markDelivered } = useRewardsStore()
  useFamilyData()

  const [showAddChild, setShowAddChild] = useState(false)
  const [editingChild, setEditingChild] = useState<Child | null>(null)
  const [addingTaskForChild, setAddingTaskForChild] = useState<Child | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isCreatingFamily, setIsCreatingFamily] = useState(false)
  const [familyNameInput, setFamilyNameInput] = useState('')
  const [familyError, setFamilyError] = useState('')
  const [showInfo, setShowInfo] = useState(false)

  // Datos "vivos": tareas de hoy, aprobaciones pendientes y premios por entregar.
  const childIdsKey = children.map((c) => c.id).join(',')
  const refreshLive = useCallback(async () => {
    const ids = childIdsKey ? childIdsKey.split(',') : []
    await Promise.all([
      ...ids.map((id) => fetchTodayTasks(id)),
      fetchApprovals(ids),
      fetchPendingRedemptions(ids),
    ])
  }, [childIdsKey, fetchTodayTasks, fetchApprovals, fetchPendingRedemptions])

  useEffect(() => {
    void refreshLive()
    // Refresco automático cada 30 s para ver lo que marcan los niños en otro dispositivo
    const id = window.setInterval(() => void refreshLive(), 30_000)
    return () => window.clearInterval(id)
  }, [refreshLive])

  useEffect(() => {
    void fetchRecurring(children.map((c) => c.id))
    children.forEach((c) => void loadToday(c))
  }, [children, fetchRecurring, loadToday])

  const handleRefresh = async () => {
    if (!family) return
    setIsRefreshing(true)
    invalidateFamilyData()
    await Promise.all([fetchChildren(family.id), fetchTasks(family.id)])
    await refreshLive()
    setIsRefreshing(false)
  }

  const handleAssignTask = async (task: import('../store/tasksStore').Task, weekdays: number[]) => {
    if (!addingTaskForChild || !family) return
    await assignTask(addingTaskForChild.id, task.id, task.reward_minutes)
    if (weekdays.length > 0) await saveRecurring(addingTaskForChild.id, task.id, weekdays)
  }

  const handleCreateAndAssignTask = async (taskData: Parameters<typeof addTask>[1], weekdays: number[]) => {
    if (!addingTaskForChild || !family) return
    const newTask = await addTask(family.id, taskData)
    await assignTask(addingTaskForChild.id, newTask.id, newTask.reward_minutes)
    if (weekdays.length > 0) await saveRecurring(addingTaskForChild.id, newTask.id, weekdays)
  }

  const handleApproveAll = async () => {
    for (const a of approvals) await approveTask(a.id)
  }

  const handleDeleteChild = async (child: Child) => {
    if (!window.confirm(`¿Eliminar el perfil de ${child.name}? Se perderán todos sus datos.`)) return
    await deleteChild(child.id)
  }

  // Handle missing family — create it on the spot
  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!familyNameInput.trim() || !user) return
    setIsCreatingFamily(true)
    setFamilyError('')
    try {
      const { error } = await supabase
        .from('families')
        .insert({ name: familyNameInput.trim(), owner_id: user.id })
        .select()
        .single()
      if (error) throw error
      await loadSession()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('relation') || msg.includes('does not exist')) {
        setFamilyError('Las tablas de la base de datos no existen aún. Ejecuta el archivo supabase_migration.sql en el SQL Editor de Supabase y vuelve a intentarlo.')
      } else {
        setFamilyError(msg)
      }
    } finally {
      setIsCreatingFamily(false)
    }
  }

  if (!isParentUnlocked) {
    return <PinLock onUnlocked={() => {}} />
  }

  // Family missing — guide user to create it
  if (!family) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <div className="neumorphic-lg" style={{ maxWidth: 420, width: '100%', padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👨‍👩‍👧</div>
          <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.6rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            Configura tu familia
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Tu cuenta está lista pero falta crear el perfil familiar. Ponle un nombre para empezar.
          </p>
          <form onSubmit={handleCreateFamily} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input
              type="text"
              className="input-neumorphic"
              placeholder="Ej: Familia García"
              value={familyNameInput}
              onChange={(e) => setFamilyNameInput(e.target.value)}
              autoFocus
            />
            {familyError && (
              <div style={{ background: 'rgba(255,107,107,0.1)', border: '1.5px solid rgba(255,107,107,0.3)', borderRadius: 12, padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 600, textAlign: 'left', lineHeight: 1.5 }}>
                ⚠️ {familyError}
              </div>
            )}
            <button type="submit" className="btn-primary" disabled={isCreatingFamily || !familyNameInput.trim()}>
              {isCreatingFamily ? '⏳ Creando...' : '🎉 Crear familia'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => { signOut(); navigate('/') }}>
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    )
  }

  const getChildTasks = (childId: string) =>
    assignedTasks.filter((t) => t.child_id === childId && t.date === todayString())

  return (
    <div className="has-bottom-nav" style={{ minHeight: '100vh', background: 'var(--bg-app)', fontFamily: 'Nunito, sans-serif' }}>
      {/* Header */}
      <header
        className="neumorphic"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          borderRadius: 0,
          padding: '0.85rem 1.25rem',
          gap: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(163,177,198,0.3)',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.4rem', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
            ⏰ Time winner
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {family?.name} · {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexShrink: 0 }}>
          <button
            onClick={() => setShowInfo(true)}
            className="btn-ghost"
            style={{ padding: '0.5rem', display: 'flex', alignItems: 'center' }}
            title="¿De dónde salen estos tiempos?"
          >
            <Info size={18} style={{ color: 'var(--primary)' }} />
          </button>
          <button
            onClick={handleRefresh}
            className="btn-ghost"
            style={{ padding: '0.5rem', display: 'flex', alignItems: 'center' }}
            title="Actualizar"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => navigate('/history')}
            className="btn-ghost only-desktop"
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}
          >
            <History size={16} /> Historial
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="btn-ghost only-desktop"
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}
          >
            <Settings size={16} /> Ajustes
          </button>
          <button
            onClick={() => lockParent()}
            className="btn-ghost only-desktop"
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}
            title="Bloquear zona de padres (antes de dejarle el dispositivo al niño)"
          >
            <Lock size={16} />
          </button>
          <button
            onClick={() => { lockParent(); signOut() }}
            className="btn-ghost only-desktop"
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', color: 'var(--danger)' }}
            title="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Info modal */}
      {showInfo && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setShowInfo(false)}
        >
          <div
            className="modal-box"
            style={{ maxWidth: 500, padding: '2rem' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary), #6dd5fa)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Info size={18} color="#fff" />
                </div>
                <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.25rem', color: 'var(--text-main)', lineHeight: 1.2 }}>
                  ¿De dónde salen estos tiempos?
                </h2>
              </div>
              <button
                onClick={() => setShowInfo(false)}
                className="btn-ghost"
                style={{ padding: '0.3rem', flexShrink: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div
                style={{
                  background: 'rgba(77,168,218,0.08)',
                  border: '1.5px solid rgba(77,168,218,0.25)',
                  borderRadius: 'var(--border-radius-sm)',
                  padding: '1rem 1.1rem',
                  lineHeight: 1.65,
                }}
              >
                <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', marginBottom: '0.85rem' }}>
                  En <strong style={{ color: 'var(--primary)' }}>Time Winner</strong> no fomentamos el uso excesivo de pantallas.
                  Todos los límites máximos configurables en la aplicación se basan estrictamente en las guías
                  pediátricas internacionales de la <strong>OMS</strong>, la <strong>Academia Americana de Pediatría (AAP)</strong>{' '}
                  y la <strong>Asociación Española de Pediatría (AEP)</strong>.
                </p>
                <p style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>
                  Asimismo, la asignación de tareas domésticas y rutinas de autocuidado sigue las conclusiones del{' '}
                  <strong>Harvard Grant Study</strong>, demostrando que la cooperación diaria en el hogar fortalece
                  la autonomía, las funciones ejecutivas y la autoestima infantil.
                </p>
              </div>

              {/* Sources pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {([
                  { label: 'OMS', url: 'https://www.who.int/es/news/item/24-04-2019-to-grow-up-healthy-children-need-to-sit-less-and-play-more' },
                  { label: 'AAP', url: 'https://www.healthychildren.org/Spanish/family-life/media/Paginas/how-to-make-a-family-media-use-plan.aspx' },
                  { label: 'AEP', url: 'https://enfamilia.aeped.es/vida-sana/pantallas-en-infancia-adolescencia' },
                  { label: 'Harvard Grant Study', url: 'https://www.adultdevelopmentstudy.org/' },
                ] as { label: string; url: string }[]).map(({ label, url }) => (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: 'rgba(77,168,218,0.12)',
                      color: 'var(--primary)',
                      borderRadius: 99,
                      padding: '0.25rem 0.75rem',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      fontFamily: 'Nunito, sans-serif',
                      border: '1px solid rgba(77,168,218,0.3)',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(77,168,218,0.25)'
                      ;(e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-1px)'
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(77,168,218,0.12)'
                      ;(e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)'
                    }}
                  >
                    📚 {label} ↗
                  </a>
                ))}
              </div>

              <button
                onClick={() => setShowInfo(false)}
                className="btn-primary"
                style={{ marginTop: '0.25rem' }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="page-main" style={{ padding: '2rem 1.5rem 3rem', maxWidth: 1200, margin: '0 auto' }}>
        {/* Tareas por aprobar */}
        {approvals.length > 0 && (
          <section className="neumorphic animate-slide-up" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--warning)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.15rem', color: 'var(--text-main)' }}>
                ⏳ Por aprobar ({approvals.length})
              </h2>
              {approvals.length > 1 && (
                <button onClick={handleApproveAll} className="btn-success icon-btn" style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}>
                  <Check size={14} /> Aprobar todo
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {approvals.map((a) => {
                const kid = children.find((c) => c.id === a.child_id)
                const isToday = a.date === todayString()
                return (
                  <div key={a.id} className="neumorphic-sm" style={{ padding: '0.65rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ fontSize: '1.4rem' }}>{kid?.avatar ?? '👤'}</span>
                    <span style={{ fontSize: '1.4rem' }}>{a.task?.icon ?? '⭐'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.task?.name ?? 'Tarea'}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {kid?.name} · +{a.minutes_granted} min
                        {!isToday && ' · ' + new Date(a.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <button onClick={() => approveTask(a.id)} className="btn-success" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} aria-label="Aprobar">
                      <Check size={16} />
                    </button>
                    <button onClick={() => rejectTask(a.id)} className="btn-ghost" style={{ padding: '0.4rem 0.6rem', color: 'var(--danger)' }} aria-label="Rechazar" title="Rechazar (vuelve a 'por hacer')">
                      <X size={16} />
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Premios por entregar */}
        {redemptions.length > 0 && (
          <section className="neumorphic animate-slide-up" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--success)' }}>
            <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.15rem', color: 'var(--text-main)', marginBottom: '0.75rem' }}>
              🎁 Premios por entregar ({redemptions.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {redemptions.map((r) => {
                const kid = children.find((c) => c.id === r.child_id)
                return (
                  <div key={r.id} className="neumorphic-sm" style={{ padding: '0.65rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ fontSize: '1.4rem' }}>{kid?.avatar ?? '👤'}</span>
                    <span style={{ fontSize: '1.4rem' }}>{r.reward_icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1rem', color: 'var(--text-main)' }}>{r.reward_name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{kid?.name} · {r.cost_stars} ⭐</p>
                    </div>
                    <button onClick={() => markDelivered(r.id)} className="btn-success icon-btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}>
                      <Check size={14} /> Entregado
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Stats bar */}
        {children.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
            }}
          >
            {children.map((child) => {
              const childTasks = getChildTasks(child.id)
              const completed = childTasks.filter((t) => t.status === 'completed').length
              const total = childTasks.length
              const earned = childTasks
                .filter((t) => t.status === 'completed')
                .reduce((sum, t) => sum + t.minutes_granted, 0)
              return (
                <button
                  key={child.id}
                  onClick={() => navigate(`/child/${child.id}`)}
                  className="neumorphic-sm"
                  style={{
                    padding: '0.75rem 1.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    border: 'none',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
                >
                  <span style={{ fontSize: '1.6rem' }}>{child.avatar}</span>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '0.95rem', color: 'var(--text-main)' }}>{child.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>
                      ⏱ {formatMinutes(earned)} · {completed}/{total} tareas
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Children grid */}
        {children.length === 0 ? (
          <div
            className="neumorphic"
            style={{ padding: '3rem', textAlign: 'center', maxWidth: 480, margin: '3rem auto' }}
          >
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }} className="animate-float">👨‍👧</div>
            <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.5rem', color: 'var(--text-main)', marginBottom: '0.75rem' }}>
              ¡Añade tu primer hijo/a!
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Crea perfiles para cada uno de tus hijos y empieza a asignarles tareas.
            </p>
            <button onClick={() => setShowAddChild(true)} className="btn-primary">
              <Plus size={18} style={{ display: 'inline', marginRight: 6 }} /> Añadir hijo/a
            </button>
          </div>
        ) : (
          <>
            <div className="children-grid">
              {children.map((child) => (
                <ChildProfileCard
                  key={child.id}
                  child={child}
                  assignedTasks={getChildTasks(child.id)}
                  onAddTask={(c) => setAddingTaskForChild(c)}
                  onEditChild={(c) => setEditingChild(c)}
                  onDeleteChild={handleDeleteChild}
                  onRemoveTask={(id) => removeAssignedTask(id)}
                  onApproveTask={(id) => approveTask(id)}
                  recurringTaskIds={recurring.filter((r) => r.child_id === child.id).map((r) => r.task_id)}
                  availableMinutes={(() => {
                    const rec = minuteRecords[child.id]
                    if (!rec) return null
                    const earned = getChildTasks(child.id).filter((t) => t.status === 'completed').reduce((sum, t) => sum + t.minutes_granted, 0)
                    return calculateBalance(earned, child.daily_limit_minutes, rec.minutes_used, rec.minutes_carried_over).available
                  })()}
                />
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => setShowAddChild(true)}
                className="neumorphic"
                style={{
                  padding: '1rem 2rem',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  fontFamily: 'Fredoka, sans-serif',
                  fontSize: '1.1rem',
                  color: 'var(--primary)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
                id="add-child-btn"
              >
                <Plus size={22} /> Añadir otro hijo/a
              </button>
            </div>
          </>
        )}
      </main>

      {/* Modals */}
      {showAddChild && (
        <AddChildModal
          onClose={() => setShowAddChild(false)}
          onAdd={async (data) => {
            if (!family) throw new Error('Sin familia')
            await addChild(family.id, data)
          }}
        />
      )}

      {editingChild && (
        <AddChildModal
          onClose={() => setEditingChild(null)}
          onAdd={async (data) => {
            if (!family) throw new Error('Sin familia')
            await addChild(family.id, data)
          }}
          editChild={editingChild}
          onUpdate={(id, data) => updateChild(id, data)}
        />
      )}

      {addingTaskForChild && (
        <AddTaskModal
          child={addingTaskForChild}
          existingTasks={tasks}
          assignedTaskIds={getChildTasks(addingTaskForChild.id).map((t) => t.task_id)}
          onClose={() => setAddingTaskForChild(null)}
          onAssignExisting={handleAssignTask}
          onCreateAndAssign={handleCreateAndAssignTask}
          recurringAvailable={recurringAvailable}
        />
      )}

      <ParentNav active="panel" />
    </div>
  )
}
