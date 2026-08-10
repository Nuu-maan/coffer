import { app } from 'electron'
import type { Settings } from '@shared/types/item'
import { getStore, setSettings } from '@main/store/store'

export function getSettings(): Settings {
  return getStore().settings
}

export function applySettings(patch: Partial<Settings>): Settings {
  const next = setSettings(patch)
  syncLoginItem(next.launchOnLogin)
  return next
}

export function syncLoginItem(enabled: boolean): void {
  if (!app.isPackaged) return
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: true,
    args: ['--hidden']
  })
}
