import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useChildrenStore } from '../store/childrenStore'
import { useAuthStore } from '../store/authStore'
import { formatMinutes } from '../lib/limits'
import { ArrowLeft, Calendar, BarChart2 } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface DayRecord {
  date: string
  minutes_earned: number
  tasks: { name: string; icon: string; minutes_granted: number; status: string }[]
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const { children } = useChildrenStore()
  const { isParentUnlocked } = useAuthStore()
  const [selectedChildId, setSelectedChildId] = useState<string>(children[0]?.id ?? '')
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const [records, setRecords] = useState<DayRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id)
    }
  }, [children, selectedChildId])

  useEffect(() => {
    if (!selectedChildId) return
    loadHistory()
  }, [selectedChildId, period])

  const loadHistory = async () => {
    setIsLoading(true)
    const days = period === 'week' ? 7 : 30
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - days + 1)
    const fromStr = fromDate.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('assigned_tasks')
      .select(`
        date,
        status,
        minutes_granted,
        task:tasks(name, icon)
      `)
      .eq('child_id', selectedChildId)
      .gte('date', fromStr)
      .order('date', { ascending: false })

    if (!error && data) {
      // Group by date
      const grouped: Record<string, DayRecord> = {}
      data.forEach((item: any) => {
        if (!grouped[item.date]) {
          grouped[item.date] = { date: item.date, minutes_earned: 0, tasks: [] }
        }
        if (item.status === 'completed') {
          grouped[item.date].minutes_earned += item.minutes_granted
        }
        grouped[item.date].tasks.push({
          name: item.task?.name ?? 'Tarea',
          icon: item.task?.icon ?? '⭐',
          minutes_granted: item.minutes_granted,
          status: item.status,
        })
      })
      setRecords(Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date)))
    }
    setIsLoading(false)
  }

  const chartData = [...records]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({
      day: new Date(r.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
      minutos: r.minutes_earned,
    }))

  const totalMinutes = records.reduce((sum, r) => sum + r.minutes_earned, 0)
  const avgMinutes = records.length > 0 ? Math.round(totalMinutes / records.length) : 0

  if (!isParentUnlocked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)' }}>
        <div className="neumorphic" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.3rem' }}>🔒 Acceso restringido</p>
          <button className="btn-primary" onClick={() => navigate('/parent')} style={{ marginTop: '1rem' }}>
            Ir al panel de padres
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-app)', fontFamily: 'Nunito, sans-serif' }}>
      {/* Header */}
      <header style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid rgba(163,177,198,0.3)' }}>
        <button onClick={() => navigate('/parent')} className="btn-ghost" style={{ padding: '0.5rem' }}>
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.4rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BarChart2 size={22} style={{ color: 'var(--primary)' }} /> Historial
        </h1>
      </header>

      <main style={{ padding: '1.5rem', maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Child selector */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={`nav-tab ${selectedChildId === child.id ? 'active' : ''}`}
                style={{ flexDirection: 'row', gap: '0.4rem', fontSize: '0.9rem' }}
              >
                <span>{child.avatar}</span> {child.name}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
            {(['week', 'month'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`nav-tab ${period === p ? 'active' : ''}`}
                style={{ flexDirection: 'row', gap: '0.4rem', fontSize: '0.85rem' }}
              >
                <Calendar size={14} /> {p === 'week' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
        </div>

        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {[
            { label: 'Total ganado', value: formatMinutes(totalMinutes), icon: '⏱' },
            { label: 'Promedio diario', value: formatMinutes(avgMinutes), icon: '📊' },
            { label: 'Días activos', value: `${records.length}`, icon: '📅' },
          ].map((stat) => (
            <div key={stat.label} className="neumorphic" style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{stat.icon}</div>
              <div style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.3rem', color: 'var(--primary)', fontWeight: 700 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="neumorphic" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '1rem' }}>
              📈 Minutos ganados por día
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(163,177,198,0.3)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fontFamily: 'Nunito', fill: '#888' }} />
                <YAxis tick={{ fontSize: 11, fontFamily: 'Nunito', fill: '#888' }} />
                <Tooltip
                  contentStyle={{
                    fontFamily: 'Nunito',
                    borderRadius: 12,
                    border: 'none',
                    boxShadow: '4px 4px 12px rgba(163,177,198,0.5)',
                    background: 'var(--bg-app)',
                  }}
                  formatter={(v: any) => [`${v} min`, 'Minutos ganados']}
                />
                <Bar dataKey="minutos" fill="#4DA8DA" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Day-by-day log */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.2rem' }}>⏳ Cargando...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="neumorphic" style={{ padding: '2.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📭</div>
            <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.2rem', color: 'var(--text-muted)' }}>
              Sin historial en este período
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {records.map((record) => {
              const completedTasks = record.tasks.filter((t) => t.status === 'completed')
              return (
                <div key={record.date} className="neumorphic" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div>
                      <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.05rem', color: 'var(--text-main)' }}>
                        {new Date(record.date + 'T12:00:00').toLocaleDateString('es-ES', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {completedTasks.length}/{record.tasks.length} tareas completadas
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.2rem', color: 'var(--primary)', fontWeight: 700 }}>
                        {formatMinutes(record.minutes_earned)}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ganados</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {record.tasks.map((task, i) => (
                      <span
                        key={i}
                        style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: 100,
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          background: task.status === 'completed' ? 'rgba(102,204,153,0.15)' : 'rgba(163,177,198,0.15)',
                          color: task.status === 'completed' ? 'var(--success-dark)' : 'var(--text-muted)',
                        }}
                      >
                        {task.icon} {task.name} {task.status === 'completed' && `+${task.minutes_granted}min`}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
