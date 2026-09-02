import { APP_ID } from '@shared/constants'
import type { HotkeyStatus, Settings } from '@shared/types/item'
import { platformInfo } from '@main/platform/session'
import { ensureDesktopEntry } from '@main/platform/desktop-entry'
import { startAcceleratorHotkey, type FallbackHandle } from './fallback'
import { AX_DENIED, startDoubleShiftHook, type HookHandle } from './hook'
import {
  STALE_HYPRLAND_SESSION,
  bindPortalShortcuts,
  hyprlandHoldsOurShortcuts,
  type PortalHandle
} from './portal'
import { toPortalTrigger } from './trigger'

export type HotkeyTriggers = {
  onStash: () => void
  onClip: () => void
}

export type HotkeyManager = {
  apply(settings: Settings): void
  refresh(settings: Settings): void
  dispose(): Promise<void>
  status(): HotkeyStatus
}

const IDLE: HotkeyStatus = { mode: 'none', error: null, portalShortcuts: [], activated: [] }

/** Everything the bindings are built from, and nothing else. */
function bindingKey(settings: Settings): string {
  return [
    settings.hotkeyMode,
    settings.accelerator,
    settings.clipperAccelerator,
    settings.doubleTapWindowMs
  ].join('|')
}

export function createHotkeyManager(
  triggers: HotkeyTriggers,
  onStatusChange: (status: HotkeyStatus) => void = () => undefined
): HotkeyManager {
  let hook: HookHandle | null = null
  let stashAccelerator: FallbackHandle | null = null
  let clipAccelerator: FallbackHandle | null = null
  let portal: PortalHandle | null = null
  let current: HotkeyStatus = IDLE
  let appliedKey: string | null = null
  let deniedAccessibility = false
  const activated = new Set<string>()

  // Portal binding is asynchronous, so a settings change that lands mid-flight
  // must be able to discard the work it started.
  let generation = 0
  let closing: Promise<void> = Promise.resolve()

  function publish(next: Omit<HotkeyStatus, 'activated'>): void {
    current = { ...next, activated: [...activated] }
    onStatusChange(current)
  }

  function fired(id: string, trigger: () => void): () => void {
    return () => {
      if (!activated.has(id)) {
        activated.add(id)
        publish(current)
      }
      trigger()
    }
  }

  function teardown(): void {
    generation += 1
    hook?.stop()
    hook = null
    stashAccelerator?.stop()
    stashAccelerator = null
    clipAccelerator?.stop()
    clipAccelerator = null
    closing = portal?.close() ?? Promise.resolve()
    portal = null
  }

  function applyViaPortal(settings: Settings): void {
    const mine = generation
    publish({ mode: 'portal', error: null, portalShortcuts: [] })

    void (async () => {
      try {
        await closing
        if (platformInfo().desktop.includes('hyprland') && (await staleAfterSettling())) {
          if (mine !== generation) return
          publish({ mode: 'none', error: STALE_HYPRLAND_SESSION, portalShortcuts: [] })
          return
        }
        await ensureDesktopEntry()

        const handle = await bindPortalShortcuts([
          {
            id: 'stash',
            description: 'Stash the selection',
            preferredTrigger: toPortalTrigger(settings.accelerator),
            onActivated: fired(`${APP_ID}:stash`, triggers.onStash)
          },
          {
            id: 'clip',
            description: 'Clip a region of the screen',
            preferredTrigger: toPortalTrigger(settings.clipperAccelerator),
            onActivated: fired(`${APP_ID}:clip`, triggers.onClip)
          }
        ])

        if (mine !== generation) {
          void handle.close()
          return
        }

        portal = handle
        publish({ mode: 'portal', error: null, portalShortcuts: handle.shortcuts() })
      } catch (error) {
        if (mine !== generation) return
        console.error('[hotkey] the desktop portal would not bind shortcuts', error)
        publish({
          mode: 'none',
          error: error instanceof Error ? error.message : String(error),
          portalShortcuts: []
        })
      }
    })()
  }

  async function staleAfterSettling(): Promise<boolean> {
    if (!(await hyprlandHoldsOurShortcuts())) return false
    await new Promise((resolve) => setTimeout(resolve, 750))
    return hyprlandHoldsOurShortcuts()
  }

  function applyViaAccelerators(settings: Settings): void {
    if (settings.accelerator === settings.clipperAccelerator) {
      publish({
        mode: 'none',
        error: 'Both shortcuts use the same keys, so neither one is registered.',
        portalShortcuts: []
      })
      return
    }

    clipAccelerator = startAcceleratorHotkey(settings.clipperAccelerator, triggers.onClip)
    stashAccelerator = startAcceleratorHotkey(settings.accelerator, triggers.onStash)

    const refused = [
      clipAccelerator ? null : settings.clipperAccelerator,
      stashAccelerator ? null : settings.accelerator
    ].filter((value): value is string => value !== null)

    publish({
      mode: stashAccelerator ? 'accelerator' : 'none',
      error: refused.length
        ? `The system or another application already owns ${refused.join(' and ')}.`
        : deniedAccessibility
          ? 'Double-tap Shift needs Accessibility access. Coffer is using the keyboard shortcut instead.'
          : null,
      portalShortcuts: []
    })
  }

  function apply(settings: Settings): void {
    // Rebinding is expensive and, on the portal path, visible — the compositor
    // drops and re-announces the shortcuts. Settings that have nothing to do
    // with the bindings (the theme, always on top) must not pay for it.
    const next = bindingKey(settings)
    if (next === appliedKey) return
    appliedKey = next
    deniedAccessibility = false

    teardown()
    activated.clear()

    const platform = platformInfo()

    if (!platform.supportsAccelerators) {
      applyViaPortal(settings)
      return
    }

    clipAccelerator = startAcceleratorHotkey(settings.clipperAccelerator, triggers.onClip)

    if (settings.hotkeyMode === 'double-shift' && platform.supportsDoubleShift) {
      try {
        hook = startDoubleShiftHook(triggers.onStash, settings.doubleTapWindowMs)
        publish({
          mode: 'double-shift',
          error: clipAccelerator
            ? null
            : `Another application already owns ${settings.clipperAccelerator}.`,
          portalShortcuts: []
        })
        return
      } catch (error) {
        console.error('[hotkey] the low level hook is unavailable, falling back', error)
        deniedAccessibility = (error as NodeJS.ErrnoException).code === AX_DENIED
      }
    }

    clipAccelerator?.stop()
    clipAccelerator = null
    applyViaAccelerators(settings)
  }

  return {
    apply,
    refresh(settings) {
      appliedKey = null
      apply(settings)
    },
    dispose() {
      teardown()
      appliedKey = null
      current = IDLE
      return closing
    },
    status: () => current
  }
}
