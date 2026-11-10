/**
 * Celebraciones para la vista del niño: confeti (canvas, sin dependencias) y sonidos (Web Audio).
 */

const SOUND_KEY = 'tw-sound'

export function isSoundEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setSoundEnabled(enabled: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, enabled ? 'on' : 'off')
  } catch {
    /* sin almacenamiento: ignorar */
  }
}

let audioCtx: AudioContext | null = null
function getAudio(): AudioContext | null {
  if (!isSoundEnabled()) return null
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      audioCtx = new Ctx()
    }
    if (audioCtx.state === 'suspended') void audioCtx.resume()
    return audioCtx
  } catch {
    return null
  }
}

function playNotes(notes: { freq: number; at: number; dur: number }[], type: OscillatorType = 'sine', volume = 0.18) {
  const ctx = getAudio()
  if (!ctx) return
  const now = ctx.currentTime
  for (const n of notes) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = n.freq
    gain.gain.setValueAtTime(0.0001, now + n.at)
    gain.gain.exponentialRampToValueAtTime(volume, now + n.at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + n.at + n.dur)
    osc.connect(gain).connect(ctx.destination)
    osc.start(now + n.at)
    osc.stop(now + n.at + n.dur + 0.05)
  }
}

/** "Ding" corto al completar una tarea */
export function playSuccess() {
  playNotes([
    { freq: 660, at: 0, dur: 0.15 },
    { freq: 990, at: 0.1, dur: 0.25 },
  ], 'triangle')
}

/** Fanfarria al terminar todas las tareas o canjear un premio */
export function playFanfare() {
  playNotes([
    { freq: 523, at: 0, dur: 0.18 },
    { freq: 659, at: 0.15, dur: 0.18 },
    { freq: 784, at: 0.3, dur: 0.18 },
    { freq: 1047, at: 0.45, dur: 0.45 },
  ], 'triangle')
}

/** Alarma suave cuando se acaba el tiempo de pantalla */
export function playTimeUp() {
  playNotes([
    { freq: 880, at: 0, dur: 0.3 },
    { freq: 660, at: 0.35, dur: 0.3 },
    { freq: 880, at: 0.7, dur: 0.3 },
    { freq: 660, at: 1.05, dur: 0.5 },
  ], 'sine', 0.25)
}

const CONFETTI_COLORS = ['#4DA8DA', '#66CC99', '#FFB347', '#FF6B6B', '#9b6dda', '#FFD93D']

/** Lanza confeti a pantalla completa. `intensity` 1 = normal, 2 = gran celebración. */
export function launchConfetti(intensity = 1) {
  if (typeof window === 'undefined') return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999'
  const dpr = window.devicePixelRatio || 1
  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  if (!ctx) { canvas.remove(); return }
  ctx.scale(dpr, dpr)

  const W = window.innerWidth
  const H = window.innerHeight
  const count = Math.round(90 * intensity)
  const pieces = Array.from({ length: count }, () => ({
    x: W / 2 + (Math.random() - 0.5) * W * 0.3,
    y: H * 0.35,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 14 - 6,
    size: Math.random() * 8 + 6,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    round: Math.random() > 0.6,
  }))

  const start = performance.now()
  const duration = 2600
  const frame = (t: number) => {
    const elapsed = t - start
    ctx.clearRect(0, 0, W, H)
    for (const p of pieces) {
      p.vy += 0.35
      p.vx *= 0.99
      p.x += p.vx
      p.y += p.vy
      p.rot += p.vr
      ctx.save()
      ctx.globalAlpha = Math.max(0, 1 - elapsed / duration)
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.color
      if (p.round) {
        ctx.beginPath()
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
      }
      ctx.restore()
    }
    if (elapsed < duration) requestAnimationFrame(frame)
    else canvas.remove()
  }
  requestAnimationFrame(frame)
}

/** Vibración corta en móviles compatibles */
export function vibrate(ms = 40) {
  try { navigator.vibrate?.(ms) } catch { /* no soportado */ }
}
