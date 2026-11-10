/**
 * Integración con la app nativa (Capacitor). En la web todas estas funciones
 * no hacen nada, así que el mismo código sirve para Vercel y para Google Play.
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { LocalNotifications } from '@capacitor/local-notifications'

export const isNative = Capacitor.isNativePlatform()

const TIMER_CHANNEL = 'screen-timer'
let channelReady = false

/** ID numérico estable por hijo (las notificaciones nativas usan enteros) */
function notificationId(childId: string): number {
  let h = 0
  for (let i = 0; i < childId.length; i++) h = (Math.imul(31, h) + childId.charCodeAt(i)) | 0
  return Math.abs(h) % 2_000_000_000
}

async function ensurePermissionAndChannel(): Promise<boolean> {
  let perm = await LocalNotifications.checkPermissions()
  if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions()
  if (perm.display !== 'granted') return false

  if (!channelReady && Capacitor.getPlatform() === 'android') {
    await LocalNotifications.createChannel({
      id: TIMER_CHANNEL,
      name: 'Temporizador de pantalla',
      description: 'Aviso cuando se acaba el tiempo de pantalla',
      importance: 5, // máxima: suena y aparece en pantalla
      visibility: 1,
      vibration: true,
    })
    channelReady = true
  }
  return true
}

/**
 * Programa una notificación para cuando acabe el tiempo de pantalla.
 * Suena aunque el niño haya salido de la app (p. ej. para ver vídeos).
 */
export async function scheduleTimerEnd(childId: string, childName: string, endsAt: number) {
  if (!isNative) return
  try {
    if (!(await ensurePermissionAndChannel())) return
    const id = notificationId(childId)
    await LocalNotifications.cancel({ notifications: [{ id }] })
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title: '⏰ ¡Se acabó el tiempo!',
          body: `${childName}, tu tiempo de pantalla ha terminado. ¡Hora de apagar! 👏`,
          channelId: TIMER_CHANNEL,
          schedule: { at: new Date(endsAt), allowWhileIdle: true },
        },
      ],
    })
  } catch (err) {
    console.warn('No se pudo programar la notificación:', err)
  }
}

/** Cancela la notificación pendiente (si el niño termina antes). */
export async function cancelTimerEnd(childId: string) {
  if (!isNative) return
  try {
    await LocalNotifications.cancel({ notifications: [{ id: notificationId(childId) }] })
  } catch { /* ignorar */ }
}

/**
 * Botón "atrás" de Android: navega hacia atrás dentro de la app y, si ya no hay
 * historial, minimiza la app (en vez de cerrarla de golpe).
 */
export function useNativeBackButton() {
  const navigate = useNavigate()
  useEffect(() => {
    if (!isNative) return
    const sub = App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) navigate(-1)
      else void App.minimizeApp()
    })
    return () => { void sub.then((s) => s.remove()) }
  }, [navigate])
}
