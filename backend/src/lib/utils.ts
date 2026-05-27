export const today = () => new Date().toISOString().slice(0, 10)

export function generateNumber(prefix: string): string {
  const now = new Date()
  const yy = now.getFullYear().toString().slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const ts = Date.now().toString().slice(-5)
  return `${prefix}/${yy}${mm}/${ts}`
}
