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

export function todayString(): string {
  return new Date().toISOString().split('T')[0]
}
