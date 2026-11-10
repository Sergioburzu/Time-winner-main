import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyTheme, getThemeMode } from './lib/theme'

applyTheme(getThemeMode())
// Si el tema es "Auto", actualizar el color de la barra del navegador cuando cambie el del sistema
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (getThemeMode() === 'system') applyTheme('system')
})

// PWA: registrar el service worker solo en producción (en desarrollo interfiere con Vite)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('Service worker:', err))
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
