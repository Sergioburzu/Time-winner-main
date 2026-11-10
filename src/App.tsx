import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import OnboardingPage from './pages/OnboardingPage'
import ParentDashboard from './pages/ParentDashboard'
import ChildView from './pages/ChildView'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import PinLock from './components/PinLock'

function ProtectedParentRoute({ children }: { children: React.ReactNode }) {
  const { isParentUnlocked } = useAuthStore()

  if (!isParentUnlocked) {
    // onUnlocked is a no-op: PinLock already sets isParentUnlocked=true
    // in the store directly, triggering this component to re-render
    return <PinLock onUnlocked={() => {}} />
  }
  return <>{children}</>
}

function AppRoutes() {
  const { user, family, loadSession, isInitializing } = useAuthStore()

  useEffect(() => {
    loadSession()
  }, [loadSession])

  if (isInitializing) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-app)',
          gap: '1rem',
        }}
      >
        <div style={{ fontSize: '4rem' }} className="animate-float">⏰</div>
        <p style={{ fontFamily: 'Fredoka, sans-serif', fontSize: '1.5rem', color: 'var(--primary)' }}>
          Time winner
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Cargando...</p>
      </div>
    )
  }

  return (
    <Routes>
      {/* Public: onboarding / auth */}
      <Route
        path="/"
        element={
          user && family ? <Navigate to="/parent" replace /> : <OnboardingPage />
        }
      />

      {/* Protected parent routes */}
      <Route
        path="/parent"
        element={
          !user ? (
            <Navigate to="/" replace />
          ) : (
            <ProtectedParentRoute>
              <ParentDashboard />
            </ProtectedParentRoute>
          )
        }
      />
      <Route
        path="/history"
        element={
          !user ? (
            <Navigate to="/" replace />
          ) : (
            <ProtectedParentRoute>
              <HistoryPage />
            </ProtectedParentRoute>
          )
        }
      />
      <Route
        path="/settings"
        element={
          !user ? (
            <Navigate to="/" replace />
          ) : (
            <ProtectedParentRoute>
              <SettingsPage />
            </ProtectedParentRoute>
          )
        }
      />

      {/* Child view — accessible without parent unlock */}
      <Route
        path="/child/:childId"
        element={!user ? <Navigate to="/" replace /> : <ChildView />}
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
