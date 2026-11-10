import React, { useState } from 'react'
import { X } from 'lucide-react'
import { getDefaultDailyLimit } from '../lib/limits'

const AVATARS = [
  '🦁', '🐯', '🐻', '🐼', '🐨', '🦊', '🐺', '🐸',
  '🐙', '🦋', '🐬', '🦄', '🐲', '🦅', '🦉', '🐧',
  '🌟', '🚀', '⚡', '🌈', '🎮', '🎨', '🎵', '🏆',
  '👾', '🤖', '🦸', '🧙', '🧚', '🧜', '🦝', '🦥',
]

interface AddChildModalProps {
  onClose: () => void
  onAdd: (data: { name: string; age: number; avatar: string }) => Promise<void>
  editChild?: {
    id: string
    name: string
    age: number
    avatar: string
    daily_limit_minutes: number
  } | null
  onUpdate?: (id: string, data: Partial<{ name: string; age: number; avatar: string; daily_limit_minutes: number }>) => Promise<void>
}

export default function AddChildModal({ onClose, onAdd, editChild, onUpdate }: AddChildModalProps) {
  const [name, setName] = useState(editChild?.name ?? '')
  const [age, setAge] = useState(editChild?.age ?? 7)
  const [avatar, setAvatar] = useState(editChild?.avatar ?? '🦁')
  const [customLimit, setCustomLimit] = useState<number | null>(
    editChild ? editChild.daily_limit_minutes : null
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const suggestedLimit = getDefaultDailyLimit(age)
  const effectiveLimit = customLimit !== null ? customLimit : suggestedLimit

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    if (age < 2 || age > 18) { setError('La edad debe estar entre 2 y 18 años'); return }

    setLoading(true)
    setError('')
    try {
      if (editChild && onUpdate) {
        await onUpdate(editChild.id, { name: name.trim(), age, avatar, daily_limit_minutes: effectiveLimit })
      } else {
        await onAdd({ name: name.trim(), age, avatar })
      }
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 440 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.5rem', color: 'var(--text-main)' }}>
            {editChild ? '✏️ Editar perfil' : '👶 Añadir hijo/a'}
          </h2>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '0.4rem' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Avatar picker */}
          <div>
            <label style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
              Avatar
            </label>
            {/* Preview */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <div className="avatar-circle avatar-circle-xl animate-bounce-in" key={avatar}>
                {avatar}
              </div>
            </div>
            {/* Grid */}
            <div
              className="neumorphic-inset"
              style={{
                padding: '0.75rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(8, 1fr)',
                gap: '0.35rem',
              }}
            >
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  style={{
                    fontSize: '1.5rem',
                    padding: '0.25rem',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    background: avatar === a ? 'rgba(77,168,218,0.2)' : 'transparent',
                    transform: avatar === a ? 'scale(1.2)' : 'scale(1)',
                    transition: 'all 0.15s ease',
                    boxShadow: avatar === a ? '0 0 0 2px var(--primary)' : 'none',
                  }}
                  aria-label={`Avatar ${a}`}
                  aria-pressed={avatar === a}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label htmlFor="child-name" style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
              Nombre
            </label>
            <input
              id="child-name"
              type="text"
              className="input-neumorphic"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: María, Lucas..."
              maxLength={30}
              autoFocus={!editChild}
            />
          </div>

          {/* Age */}
          <div>
            <label style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
              Edad: <span style={{ color: 'var(--primary)', fontFamily: 'Fredoka, sans-serif', fontSize: '1.1rem' }}>{age} años</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => setAge((a) => Math.max(2, a - 1))}
                className="neumorphic-sm"
                style={{ width: 44, height: 44, border: 'none', cursor: 'pointer', fontSize: '1.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'Fredoka, sans-serif', color: 'var(--text-main)' }}
              >−</button>
              <input
                type="range"
                min={2}
                max={18}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--primary)' }}
              />
              <button
                type="button"
                onClick={() => setAge((a) => Math.min(18, a + 1))}
                className="neumorphic-sm"
                style={{ width: 44, height: 44, border: 'none', cursor: 'pointer', fontSize: '1.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'Fredoka, sans-serif', color: 'var(--text-main)' }}
              >+</button>
            </div>
          </div>

          {/* Daily limit */}
          <div className="neumorphic-inset" style={{ padding: '1rem', borderRadius: 'var(--border-radius-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Límite diario sugerido</span>
              <span style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.1rem', color: 'var(--primary)', fontWeight: 700 }}>
                {suggestedLimit} min
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>
              Basado en guías de salud para {age} años.{' '}
              {customLimit !== null && (
                <button
                  type="button"
                  onClick={() => setCustomLimit(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}
                >
                  Restaurar sugerido
                </button>
              )}
            </p>
            {/* Custom limit */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Personalizar:</span>
              <input
                type="number"
                min={5}
                max={240}
                value={effectiveLimit}
                onChange={(e) => setCustomLimit(Number(e.target.value))}
                className="input-neumorphic"
                style={{ width: 80, textAlign: 'center', fontSize: '1rem' }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>min/día</span>
            </div>
          </div>

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: '0.9rem', fontWeight: 600, textAlign: 'center' }}>
              ⚠️ {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" style={{ flex: 2 }} disabled={loading}>
              {loading ? '⏳ Guardando...' : editChild ? '✅ Guardar cambios' : '🎉 Añadir hijo/a'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
