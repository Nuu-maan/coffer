import type { Settings } from '@shared/types/item'
import { startAcceleratorHotkey, type FallbackHandle } from './fallback'
import { startDoubleShiftHook, type HookHandle } from './hook'

export type HotkeyManager = {
  apply(settings: Settings): void
  dispose(): void
  activeMode(): 'double-shift' | 'accelerator' | 'none'
}

export function createHotkeyManager(onTrigger: () => void): HotkeyManager {
  let hook: HookHandle | null = null
  let fallback: FallbackHandle | null = null
  let mode: 'double-shift' | 'accelerator' | 'none' = 'none'

  function teardown(): void {
    hook?.stop()
    hook = null
    fallback?.stop()
    fallback = null
    mode = 'none'
  }

  function apply(settings: Settings): void {
    teardown()

    if (settings.hotkeyMode === 'double-shift') {
      try {
        hook = startDoubleShiftHook(onTrigger, settings.doubleTapWindowMs)
        mode = 'double-shift'
        return
      } catch (error) {
        console.error('[hotkey] low level hook unavailable, falling back', error)
      }
    }

    fallback = startAcceleratorHotkey(settings.accelerator, onTrigger)
    mode = fallback ? 'accelerator' : 'none'

    if (!fallback) {
      console.error(`[hotkey] could not register accelerator ${settings.accelerator}`)
    }
  }

  return { apply, dispose: teardown, activeMode: () => mode }
}
