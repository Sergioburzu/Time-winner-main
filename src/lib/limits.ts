/**
 * Returns the default daily screen time limit in minutes based on age.
 * Based on WHO/AAP guidelines.
 */
export function getDefaultDailyLimit(age: number): number {
  if (age <= 1) return 0
  if (age <= 4) return 30
  if (age <= 7) return 45
  if (age <= 12) return 60
  return 90
}

export interface MinuteStatus {
  available: number       // minutes currently available to use
  earned: number          // total earned today (before cap)
  effective: number       // actual minutes counted (capped at limit)
  overflow: number        // minutes above the daily limit
  percentUsed: number     // 0-100 for progress ring
  isAtLimit: boolean
  isNearLimit: boolean    // >= 80%
}

export function calculateMinuteStatus(
  earnedToday: number,
  dailyLimit: number,
  usedToday: number = 0,
  carriedOver: number = 0
): MinuteStatus {
  const effective = Math.min(earnedToday, dailyLimit)
  const overflow = Math.max(0, earnedToday - dailyLimit)
  const available = Math.max(0, effective + carriedOver - usedToday)
  const percentUsed = dailyLimit > 0 ? Math.min(100, (effective / dailyLimit) * 100) : 0
  const isAtLimit = effective >= dailyLimit
  const isNearLimit = percentUsed >= 80

  return {
    available,
    earned: earnedToday,
    effective,
    overflow,
    percentUsed,
    isAtLimit,
    isNearLimit,
  }
}

export function getProgressColor(percent: number): string {
  if (percent >= 100) return '#66CC99' // success green
  if (percent >= 80) return '#FFB347'  // warning orange
  return '#4DA8DA'                       // primary blue
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

/** Fecha local YYYY-MM-DD (no UTC: en España toISOString daría "ayer" entre las 00:00 y las 02:00). */
export function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function todayString(): string {
  return toDateString(new Date())
}

/** Fecha local desplazada N días respecto a hoy (negativo = pasado). */
export function daysAgoString(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toDateString(d)
}

export interface ScreenBalance {
  pool: number         // ganados hoy + traídos de ayer
  usableToday: number  // lo que se puede usar hoy (respeta el límite diario)
  available: number    // lo que queda por usar hoy
  used: number
  carried: number
}

/**
 * Saldo de pantalla del día.
 * El límite diario nunca se supera: aunque se acumulen minutos, como mucho se
 * usan `dailyLimit` minutos al día. Lo que sobra se guarda para mañana (si el
 * hijo tiene activado "Guardar minutos extra").
 */
export function calculateBalance(
  earnedToday: number,
  dailyLimit: number,
  usedToday: number,
  carriedOver: number
): ScreenBalance {
  const pool = earnedToday + carriedOver
  const usableToday = Math.min(pool, dailyLimit)
  const available = Math.max(0, usableToday - usedToday)
  return { pool, usableToday, available, used: usedToday, carried: carriedOver }
}

/** Minutos que pasan al día siguiente (con tope = límite diario). */
export function calculateCarryOver(
  earned: number,
  carried: number,
  used: number,
  dailyLimit: number,
  accumulate: boolean
): number {
  if (!accumulate) return 0
  return Math.min(dailyLimit, Math.max(0, earned + carried - used))
}

export const WEEKDAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] // índice = getDay()
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] // lunes primero

export function formatWeekdays(days: number[]): string {
  const set = new Set(days)
  if (set.size === 7) return 'Todos los días'
  if (set.size === 5 && [1, 2, 3, 4, 5].every((d) => set.has(d))) return 'De lunes a viernes'
  if (set.size === 2 && set.has(0) && set.has(6)) return 'Fines de semana'
  return WEEKDAY_ORDER.filter((d) => set.has(d)).map((d) => WEEKDAY_LABELS[d]).join(' · ')
}
