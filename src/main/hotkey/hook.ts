import { UiohookKey, uIOhook } from 'uiohook-napi'
import { hasAccessibility } from '@main/platform/permissions'
import { isMac } from '@main/platform/session'
import { createDoubleTapDetector, type DoubleTapDetector } from './double-tap'

export const AX_DENIED = 'UIOHOOK_ERROR_AXAPI_DISABLED'

const SHIFT_KEYCODES = new Set<number>([UiohookKey.Shift, UiohookKey.ShiftRight])

export type HookHandle = {
  stop(): void
  setWindowMs(ms: number): void
}

export function startDoubleShiftHook(onTrigger: () => void, windowMs: number): HookHandle {
  /* Asked first so Coffer can say why the trigger is unavailable. Left to
     libuiohook, the check happens on a worker thread with the prompt flag set,
     and the user gets the bare system alert with no idea what asked for it. */
  if (isMac() && !hasAccessibility()) {
    throw Object.assign(new Error('Accessibility access has not been granted'), { code: AX_DENIED })
  }

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

  /* The listeners have to go on before start(), and start() is the call that
     throws when the OS refuses the tap. Without this the throw escapes leaving
     both of them attached and no handle to take them off again, so every retry
     stacked another pair on a hook that was never running. */
  try {
    uIOhook.start()
  } catch (error) {
    uIOhook.off('keydown', onKeyDown)
    uIOhook.off('keyup', onKeyUp)
    throw error
  }

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
