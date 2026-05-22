export const LOCK_AT = new Date(
  process.env.NEXT_PUBLIC_POOL_LOCK_AT ?? '2026-06-11T00:00:00Z'
)

export function isLocked(): boolean {
  return Date.now() >= LOCK_AT.getTime()
}
