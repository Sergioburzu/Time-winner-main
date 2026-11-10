import { useNavigate } from 'react-router-dom'
import { LayoutDashboard, BarChart2, Settings, Lock } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

type Section = 'panel' | 'history' | 'settings'

/** Barra de navegación inferior para móvil (en escritorio se usan los botones de la cabecera). */
export default function ParentNav({ active }: { active: Section }) {
  const navigate = useNavigate()
  const lockParent = useAuthStore((s) => s.lockParent)

  const items: { key: Section | 'lock'; label: string; icon: React.ReactNode; onClick: () => void }[] = [
    { key: 'panel', label: 'Panel', icon: <LayoutDashboard size={20} />, onClick: () => navigate('/parent') },
    { key: 'history', label: 'Historial', icon: <BarChart2 size={20} />, onClick: () => navigate('/history') },
    { key: 'settings', label: 'Ajustes', icon: <Settings size={20} />, onClick: () => navigate('/settings') },
    { key: 'lock', label: 'Bloquear', icon: <Lock size={20} />, onClick: () => { lockParent(); navigate('/parent') } },
  ]

  return (
    <nav className="bottom-nav only-mobile" aria-label="Navegación de padres">
      {items.map((item) => (
        <button
          key={item.key}
          onClick={item.onClick}
          className={`nav-tab ${active === item.key ? 'active' : ''}`}
          aria-current={active === item.key ? 'page' : undefined}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </nav>
  )
}
