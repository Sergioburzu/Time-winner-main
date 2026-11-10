import React, { useState, useRef } from 'react'
import { Lock, KeyRound } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

interface PinLockProps {
  onUnlocked: () => void
}

export default function PinLock({ onUnlocked }: PinLockProps) {
  const [digits, setDigits] = useState(['', '', '', ''])
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  // Create PIN mode states
  const [createStep, setCreateStep] = useState<'enter' | 'confirm'>('enter')
  const [firstPin, setFirstPin] = useState('')
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]
  const { unlockParent, parentPin, setParentPin } = useAuthStore()
  const isCreateMode = !parentPin

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newDigits = [...digits]
    newDigits[index] = value.slice(-1)
    setDigits(newDigits)
    setError(false)

    if (value && index < 3) {
      refs[index + 1].current?.focus()
    }

    // Auto-check when all filled
    if (index === 3 && value) {
      const pin = [...newDigits.slice(0, 3), value].join('')
      checkPin(pin)
    } else if (newDigits.every((d) => d !== '')) {
      checkPin(newDigits.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs[index - 1].current?.focus()
    }
  }

  const checkPin = (pin: string) => {
    if (isCreateMode) {
      // Create PIN flow
      if (createStep === 'enter') {
        setFirstPin(pin)
        setCreateStep('confirm')
        setDigits(['', '', '', ''])
        setTimeout(() => refs[0].current?.focus(), 50)
      } else {
        // Confirm step
        if (pin === firstPin) {
          setParentPin(pin)
          unlockParent(pin)
          onUnlocked()
        } else {
          setError(true)
          setShake(true)
          setDigits(['', '', '', ''])
          setCreateStep('enter')
          setFirstPin('')
          setTimeout(() => { setShake(false); refs[0].current?.focus() }, 500)
        }
      }
    } else {
      // Normal unlock flow
      if (unlockParent(pin)) {
        onUnlocked()
      } else {
        setError(true)
        setShake(true)
        setDigits(['', '', '', ''])
        refs[0].current?.focus()
        setTimeout(() => setShake(false), 500)
      }
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-app)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div
        className={`neumorphic-lg ${shake ? 'animate-bounce-in' : ''}`}
        style={{
          padding: '2.5rem',
          maxWidth: 360,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'linear-gradient(145deg, #5bb8ea, #4099c8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '4px 4px 10px rgba(77,168,218,0.4), -4px -4px 10px rgba(255,255,255,0.8)',
          }}
        >
          <Lock size={32} color="white" />
        </div>

        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.6rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
            {isCreateMode ? 'Crear PIN de Padres' : 'Zona de Padres'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            {isCreateMode
              ? createStep === 'enter'
                ? '🔐 Elige un PIN de 4 dígitos'
                : '✅ Repite el PIN para confirmar'
              : 'Introduce tu PIN de 4 dígitos'
            }
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={refs[i]}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="pin-digit"
              autoFocus={i === 0}
              style={{
                boxShadow: error
                  ? 'inset 4px 4px 8px rgba(255,107,107,0.25), inset -4px -4px 8px rgba(255,255,255,0.8), 0 0 0 2px rgba(255,107,107,0.4)'
                  : undefined,
              }}
              aria-label={`Dígito ${i + 1} del PIN`}
            />
          ))}
        </div>

        {error && (
          <p
            style={{ color: 'var(--danger)', fontWeight: 700, fontSize: '0.9rem' }}
            className="animate-slide-up"
          >
            {isCreateMode ? '❌ Los PINs no coinciden. Inténtalo de nuevo.' : '❌ PIN incorrecto. Inténtalo de nuevo.'}
          </p>
        )}

        {isCreateMode ? (
          <p style={{ fontSize: '0.8rem', color: 'var(--primary)', textAlign: 'center', fontWeight: 600 }}>
            <KeyRound size={13} style={{ display: 'inline', marginRight: 4 }} />
            Este PIN protegerá el panel de padres
          </p>
        ) : (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', textAlign: 'center' }}>
            ¿Eres un niño? Pídele el PIN a mamá o papá 😊
          </p>
        )}
      </div>
    </div>
  )
}
