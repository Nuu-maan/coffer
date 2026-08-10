import type { Settings } from '@shared/types/item'
import { platformInfo } from '@main/platform/session'
import { startAcceleratorHotkey, type FallbackHandle } from './fallback'
import { startDoubleShiftHook, type HookHandle } from './hook'

export type HotkeyTriggers = {
  onStash: () => void
  onClip: () => void
}

export type HotkeyManager = {
  apply(settings: Settings): void
  dispose(): void
  activeMode(): 'double-shift' | 'accelerator' | 'none'
}

export function createHotkeyManager(triggers: HotkeyTriggers): HotkeyManager {
  let hook: HookHandle | null = null
  let stashAccelerator: FallbackHandle | null = null
  let clipAccelerator: FallbackHandle | null = null
  let mode: 'double-shift' | 'accelerator' | 'none' = 'none'

  function teardown(): void {
    hook?.stop()
    hook = null
    stashAccelerator?.stop()
    stashAccelerator = null
    clipAccelerator?.stop()
    clipAccelerator = null
    mode = 'none'
  }

  function apply(settings: Settings): void {
    teardown()

    if (settings.clipperAccelerator) {
      clipAccelerator = startAcceleratorHotkey(settings.clipperAccelerator, triggers.onClip)
      if (!clipAccelerator) {
        console.error(`[hotkey] could not register clipper ${settings.clipperAccelerator}`)
      }
    }

    if (settings.hotkeyMode === 'double-shift' && platformInfo().supportsDoubleShift) {
      try {
        hook = startDoubleShiftHook(triggers.onStash, settings.doubleTapWindowMs)
        mode = 'double-shift'
        return
      } catch (error) {
        console.error('[hotkey] low level hook unavailable, falling back', error)
      }
    }

    if (settings.accelerator === settings.clipperAccelerator) {
      console.error('[hotkey] stash and clipper accelerators collide')
      mode = 'none'
      return
    }

    stashAccelerator = startAcceleratorHotkey(settings.accelerator, triggers.onStash)
    mode = stashAccelerator ? 'accelerator' : 'none'

    if (!stashAccelerator) {
      console.error(`[hotkey] could not register accelerator ${settings.accelerator}`)
    }
  }

  return { apply, dispose: teardown, activeMode: () => mode }
}
