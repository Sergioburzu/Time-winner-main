import React, { useState } from 'react'
import { useAuthStore } from '../store/authStore'

const CONFIRM_WORD = 'BORRAR'

/**
 * Formulario para eliminar la cuenta. Si no hay sesión pide también el email
 * (para la página pública que exige Google Play).
 */
export default function DeleteAccountForm({ onDeleted }: { onDeleted: () => void }) {
  const { user, signIn, deleteAccount } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (confirm.trim().toUpperCase() !== CONFIRM_WORD) {
      setError(`Escribe ${CONFIRM_WORD} para confirmar`)
      return
    }
    setBusy(true)
    try {
      if (!user) await signIn(email.trim(), password)
      await deleteAccount(password)
      onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la cuenta')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ background: 'rgba(255,107,107,0.1)', border: '1.5px solid rgba(255,107,107,0.3)', borderRadius: 12, padding: '0.85rem 1rem', fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
        ⚠️ Se borrarán <strong>para siempre</strong> tu cuenta, tu familia, los perfiles de tus hijos, las tareas,
        el historial y los premios. No se puede deshacer.
      </div>

      {user ? (
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          Cuenta: <strong style={{ color: 'var(--text-main)' }}>{user.email}</strong>
        </p>
      ) : (
        <input
          type="email" required autoComplete="email" placeholder="Email de la cuenta"
          className="input-neumorphic" value={email} onChange={(e) => setEmail(e.target.value)}
          aria-label="Email de la cuenta"
        />
      )}
      <input
        type="password" required autoComplete="current-password" placeholder="Contraseña"
        className="input-neumorphic" value={password} onChange={(e) => setPassword(e.target.value)}
        aria-label="Contraseña"
      />
      <input
        type="text" placeholder={`Escribe ${CONFIRM_WORD} para confirmar`}
        className="input-neumorphic" value={confirm} onChange={(e) => setConfirm(e.target.value)}
        aria-label={`Escribe ${CONFIRM_WORD} para confirmar`} autoCapitalize="characters"
      />

      {error && <p style={{ color: 'var(--danger)', fontWeight: 700, fontSize: '0.88rem' }}>⚠️ {error}</p>}

      <button type="submit" className="btn-danger" disabled={busy} style={{ padding: '0.8rem', fontSize: '1rem' }}>
        {busy ? '⏳ Eliminando...' : '🗑️ Eliminar mi cuenta definitivamente'}
      </button>
    </form>
  )
}
