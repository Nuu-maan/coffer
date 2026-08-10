export type KeyEvent = {
  type: 'down' | 'up'
  isShift: boolean
  time: number
}

export type DoubleTapOptions = {
  windowMs: number
  maxHoldMs: number
  cooldownMs: number
}

export const DEFAULT_DOUBLE_TAP_OPTIONS: DoubleTapOptions = {
  windowMs: 350,
  maxHoldMs: 500,
  cooldownMs: 400
}

export type DoubleTapDetector = {
  handle(event: KeyEvent): boolean
  reset(): void
}

export function createDoubleTapDetector(
  options: Partial<DoubleTapOptions> = {}
): DoubleTapDetector {
  const { windowMs, maxHoldMs, cooldownMs } = { ...DEFAULT_DOUBLE_TAP_OPTIONS, ...options }

  let shiftDownAt: number | null = null
  let lastTapAt: number | null = null
  let lastTriggerAt: number | null = null

  function reset(): void {
    shiftDownAt = null
    lastTapAt = null
  }

  function handle(event: KeyEvent): boolean {
    if (!event.isShift) {
      if (event.type === 'down') reset()
      return false
    }

    if (event.type === 'down') {
      if (shiftDownAt === null) shiftDownAt = event.time
      return false
    }

    const heldFor = shiftDownAt === null ? 0 : event.time - shiftDownAt
    shiftDownAt = null

    if (heldFor > maxHoldMs) {
      lastTapAt = null
      return false
    }

    if (lastTapAt !== null && event.time - lastTapAt <= windowMs) {
      lastTapAt = null
      if (lastTriggerAt !== null && event.time - lastTriggerAt < cooldownMs) return false
      lastTriggerAt = event.time
      return true
    }

    lastTapAt = event.time
    return false
  }

  return { handle, reset }
}
