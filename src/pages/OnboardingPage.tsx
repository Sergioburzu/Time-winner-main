import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useChildrenStore } from '../store/childrenStore'
import { useTasksStore, DEFAULT_TASKS } from '../store/tasksStore'

type Step = 'welcome' | 'account' | 'family' | 'firstChild' | 'done'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { signUp, signIn, isLoading, error: authError } = useAuthStore()
  const { addChild } = useChildrenStore()
  const { addTask } = useTasksStore()

  const [step, setStep] = useState<Step>('welcome')
  const [mode, setMode] = useState<'signup' | 'signin'>('signup')

  // Account form
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [formError, setFormError] = useState('')

  // Child form
  const [childName, setChildName] = useState('')
  const [childAge, setChildAge] = useState(7)
  const [childAvatar, setChildAvatar] = useState('🦁')

  const AVATARS = ['🦁', '🐯', '🐻', '🐼', '🦊', '🐸', '🦄', '🐬', '🦋', '🌟', '🚀', '⚡']

  const handleAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (mode === 'signup') {
      if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        setFormError('El PIN debe tener exactamente 4 dígitos')
        return
      }
      if (pin !== pinConfirm) {
        setFormError('Los PINs no coinciden')
        return
      }
      if (!familyName.trim()) {
        setFormError('El nombre de familia es obligatorio')
        return
      }
      try {
        await signUp(email, password, familyName.trim(), pin)
        setStep('firstChild')
      } catch {
        // error shown from store
      }
    } else {
      try {
        await signIn(email, password)
        navigate('/parent')
      } catch {
        // error shown from store
      }
    }
  }

  const handleAddFirstChild = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!childName.trim()) { setFormError('Introduce el nombre del niño/a'); return }

    const { family: currentFamily } = useAuthStore.getState()
    if (!currentFamily) {
      setFormError('Error: no se pudo cargar la familia. Recarga la página e inténtalo de nuevo.')
      return
    }

    try {
      await addChild(currentFamily.id, {
        name: childName.trim(),
        age: childAge,
        avatar: childAvatar,
      })

      // Seed default tasks for the family
      for (const dt of DEFAULT_TASKS.slice(0, 5)) {
        try {
          await addTask(currentFamily.id, dt)
        } catch { /* ignore duplicates */ }
      }

      setStep('done')
      setTimeout(() => navigate('/parent'), 1800)
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error al añadir el niño/a')
    }
  }

  const displayError = formError || authError

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-app)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        fontFamily: 'Nunito, sans-serif',
      }}
    >
      {/* Welcome */}
      {step === 'welcome' && (
        <div className="neumorphic-lg animate-bounce-in" style={{ maxWidth: 420, width: '100%', padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '5rem', marginBottom: '1rem', lineHeight: 1 }} className="animate-float">⏰</div>
          <h1 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '2rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>
            Time winner
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: 1.6 }}>
            Recompensa a tus hijos con tiempo de pantalla cuando completan sus tareas del hogar 🏠✨
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
            <button className="btn-primary" onClick={() => { setMode('signup'); setStep('account') }}>
              🎉 Crear cuenta familiar
            </button>
            <button className="btn-ghost" onClick={() => { setMode('signin'); setStep('account') }}>
              Ya tengo cuenta — Iniciar sesión
            </button>
          </div>
        </div>
      )}

      {/* Account creation / Sign in */}
      {step === 'account' && (
        <div className="neumorphic-lg animate-slide-up" style={{ maxWidth: 420, width: '100%', padding: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{mode === 'signup' ? '👨‍👩‍👧' : '👋'}</div>
            <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.7rem', color: 'var(--text-main)' }}>
              {mode === 'signup' ? 'Crear cuenta' : 'Bienvenido de vuelta'}
            </h2>
          </div>

          <form onSubmit={handleAccount} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {mode === 'signup' && (
              <div>
                <label htmlFor="family-name" style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  🏠 Nombre de tu familia
                </label>
                <input
                  id="family-name"
                  type="text"
                  className="input-neumorphic"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="Ej: Familia García"
                  autoFocus
                />
              </div>
            )}

            <div>
              <label htmlFor="email" style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                📧 Email
              </label>
              <input
                id="email"
                type="email"
                className="input-neumorphic"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                autoFocus={mode === 'signin'}
              />
            </div>

            <div>
              <label htmlFor="password" style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                🔑 Contraseña
              </label>
              <input
                id="password"
                type="password"
                className="input-neumorphic"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'Mínimo 6 caracteres' : '••••••••'}
              />
            </div>

            {mode === 'signup' && (
              <>
                <div>
                  <label htmlFor="pin" style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                    🔐 PIN de 4 dígitos (para acceder al panel de padres)
                  </label>
                  <input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    className="input-neumorphic"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="1234"
                  />
                </div>
                <div>
                  <label htmlFor="pin-confirm" style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                    🔐 Confirmar PIN
                  </label>
                  <input
                    id="pin-confirm"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    className="input-neumorphic"
                    value={pinConfirm}
                    onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="1234"
                  />
                </div>
              </>
            )}

            {displayError && (
              <p style={{ color: 'var(--danger)', fontWeight: 700, fontSize: '0.9rem', textAlign: 'center', padding: '0.5rem', background: 'rgba(255,107,107,0.1)', borderRadius: 8 }}>
                ⚠️ {displayError}
              </p>
            )}

            <button type="submit" className="btn-primary" disabled={isLoading} style={{ marginTop: '0.5rem' }}>
              {isLoading ? '⏳ Cargando...' : mode === 'signup' ? '🚀 Crear familia' : '🔓 Entrar'}
            </button>

            <button
              type="button"
              className="btn-ghost"
              onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setFormError('') }}
              style={{ textAlign: 'center', fontSize: '0.9rem' }}
            >
              {mode === 'signup' ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Créala gratis'}
            </button>

            <button type="button" className="btn-ghost" onClick={() => setStep('welcome')} style={{ fontSize: '0.85rem' }}>
              ← Volver
            </button>
          </form>
        </div>
      )}

      {/* First child */}
      {step === 'firstChild' && (
        <div className="neumorphic-lg animate-bounce-in" style={{ maxWidth: 420, width: '100%', padding: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }} className="animate-float">{childAvatar}</div>
            <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.6rem', color: 'var(--text-main)' }}>
              ¡Añade tu primer hijo/a!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Puedes añadir más después.</p>
          </div>

          <form onSubmit={handleAddFirstChild} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Avatar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setChildAvatar(a)}
                  style={{
                    fontSize: '1.8rem',
                    width: 52,
                    height: 52,
                    border: 'none',
                    borderRadius: 14,
                    cursor: 'pointer',
                    background: childAvatar === a ? 'rgba(77,168,218,0.2)' : 'transparent',
                    transform: childAvatar === a ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.15s',
                    boxShadow: childAvatar === a ? '0 0 0 2.5px var(--primary)' : 'none',
                  }}
                >{a}</button>
              ))}
            </div>

            <div>
              <label htmlFor="child-name-onboard" style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                Nombre
              </label>
              <input
                id="child-name-onboard"
                type="text"
                className="input-neumorphic"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder="Ej: Sofía"
                autoFocus
              />
            </div>

            <div>
              <label style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                Edad: <span style={{ color: 'var(--primary)', fontFamily: 'Fredoka, sans-serif', fontSize: '1.1rem' }}>{childAge} años</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button type="button" onClick={() => setChildAge((a) => Math.max(2, a - 1))}
                  className="neumorphic-sm"
                  style={{ width: 44, height: 44, border: 'none', cursor: 'pointer', fontSize: '1.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fredoka, sans-serif', color: 'var(--text-main)' }}>−</button>
                <input type="range" min={2} max={18} value={childAge}
                  onChange={(e) => setChildAge(Number(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--primary)' }} />
                <button type="button" onClick={() => setChildAge((a) => Math.min(18, a + 1))}
                  className="neumorphic-sm"
                  style={{ width: 44, height: 44, border: 'none', cursor: 'pointer', fontSize: '1.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fredoka, sans-serif', color: 'var(--text-main)' }}>+</button>
              </div>
            </div>

            {formError && <p style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.9rem' }}>⚠️ {formError}</p>}

            <button type="submit" className="btn-primary">
              ✅ Añadir y empezar
            </button>
          </form>
        </div>
      )}

      {/* Done */}
      {step === 'done' && (
        <div className="neumorphic-lg animate-bounce-in" style={{ maxWidth: 380, width: '100%', padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }} className="animate-float">🎉</div>
          <h2 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '2rem', color: 'var(--success-dark)', marginBottom: '0.5rem' }}>
            ¡Todo listo!
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>Cargando tu panel familiar...</p>
        </div>
      )}
    </div>
  )
}
