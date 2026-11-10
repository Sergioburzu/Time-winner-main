export type ThemeMode = 'light' | 'dark' | 'system'

const THEME_KEY = 'tw-theme'

export function getThemeMode(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch { /* ignorar */ }
  return 'system'
}

/** Aplica el tema al <html>. 'system' quita el atributo y deja que mande el sistema operativo. */
export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement
  if (mode === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', mode)

  const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#23262d' : '#4DA8DA')
}

export function setThemeMode(mode: ThemeMode) {
  try { localStorage.setItem(THEME_KEY, mode) } catch { /* ignorar */ }
  applyTheme(mode)
}
