import { app, nativeTheme } from 'electron'
import type { Settings, ThemeChoice } from '@shared/types/item'
import { getStore, setSettings } from '@main/store/store'
import { setLinuxAutostart } from '@main/platform/autostart'
import { isLinux } from '@main/platform/session'

export function getSettings(): Settings {
  return getStore().settings
}

export function applySettings(patch: Partial<Settings>): Settings {
  const next = setSettings(patch)
  syncTheme(next.theme)
  syncLoginItem(next.launchOnLogin)
  return next
}

export function syncTheme(theme: ThemeChoice): void {
  nativeTheme.themeSource = theme
}

export function syncLoginItem(enabled: boolean): void {
  if (!app.isPackaged) return

  if (isLinux()) {
    void setLinuxAutostart(enabled).catch((error) => {
      console.error('[settings] could not write autostart entry', error)
    })
    return
  }

  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: true,
    args: ['--hidden']
  })
}
