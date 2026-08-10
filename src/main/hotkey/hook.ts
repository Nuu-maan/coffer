import { UiohookKey, uIOhook } from 'uiohook-napi'
import { createDoubleTapDetector, type DoubleTapDetector } from './double-tap'

const SHIFT_KEYCODES = new Set<number>([UiohookKey.Shift, UiohookKey.ShiftRight])

export type HookHandle = {
  stop(): void
  setWindowMs(ms: number): void
}

export function startDoubleShiftHook(onTrigger: () => void, windowMs: number): HookHandle {
  let detector: DoubleTapDetector = createDoubleTapDetector({ windowMs })

  const onKeyDown = (event: { keycode: number }): void => {
    if (detector.handle({ type: 'down', isShift: SHIFT_KEYCODES.has(event.keycode), time: now() })) {
      onTrigger()
    }
  }

  const onKeyUp = (event: { keycode: number }): void => {
    if (detector.handle({ type: 'up', isShift: SHIFT_KEYCODES.has(event.keycode), time: now() })) {
      onTrigger()
    }
  }

  uIOhook.on('keydown', onKeyDown)
  uIOhook.on('keyup', onKeyUp)
  uIOhook.start()

  return {
    stop() {
      uIOhook.off('keydown', onKeyDown)
      uIOhook.off('keyup', onKeyUp)
      uIOhook.stop()
    },
    setWindowMs(ms: number) {
      detector = createDoubleTapDetector({ windowMs: ms })
    }
  }
}

function now(): number {
  return Number(process.hrtime.bigint() / 1_000_000n)
}
