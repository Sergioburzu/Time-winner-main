/**
 * El PIN de padres se guarda en Supabase como hash SHA-256 (nunca en texto plano),
 * así funciona en cualquier dispositivo donde inicies sesión.
 * Se usa el id de la familia como "sal" para que el mismo PIN dé hashes distintos.
 */
export async function hashPin(pin: string, familyId: string): Promise<string> {
  const data = new TextEncoder().encode(`time-winner:${familyId}:${pin}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin)
}
