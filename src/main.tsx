import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyTheme, getThemeMode } from './lib/theme'
import { isNative } from './lib/native'

applyTheme(getThemeMode())
// Si el tema es "Auto", actualizar el color de la barra del navegador cuando cambie el del sistema
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (getThemeMode() === 'system') applyTheme('system')
})

// PWA: registrar el service worker solo en la web de producción
// (en desarrollo interfiere con Vite y en la app nativa no hace falta)
if (import.meta.env.PROD && !isNative && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('Service worker:', err))
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
