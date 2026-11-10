import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/** Marco común para las páginas públicas (privacidad, borrar cuenta). */
export default function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate()
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-app)', fontFamily: 'Nunito, sans-serif' }}>
      <header style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', maxWidth: 760, margin: '0 auto' }}>
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          className="btn-ghost"
          style={{ padding: '0.5rem' }}
          aria-label="Volver"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.4rem', color: 'var(--text-main)' }}>{title}</h1>
      </header>
      <main className="legal-content" style={{ padding: '0.5rem 1.25rem 3rem', maxWidth: 760, margin: '0 auto' }}>
        <div className="neumorphic" style={{ padding: '1.5rem 1.5rem 2rem' }}>{children}</div>
      </main>
    </div>
  )
}
