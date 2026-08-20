import { app, nativeTheme } from 'electron'
import type { Settings, ThemeChoice } from '@shared/types/item'
import { getStore, setSettings } from '@main/store/store'
import { setLinuxAutostart } from '@main/platform/autostart'
import { isLinux, isMac } from '@main/platform/session'
import { getMainWindow } from '@main/windows/main-window'

export function getSettings(): Settings {
  return getStore().settings
}

/*
 * Only what moved is re-applied. Each of these reaches outside the app — the
 * theme repaints every window, always-on-top restacks the window, and the login
 * item rewrites a file on disk — so running all three on every change made
 * flipping one switch look like the app reloading itself.
 */
export function applySettings(patch: Partial<Settings>): Settings {
  const previous = getSettings()
  const next = setSettings(patch)

  if (next.theme !== previous.theme) syncTheme(next.theme)
  if (next.alwaysOnTop !== previous.alwaysOnTop) syncAlwaysOnTop(next.alwaysOnTop)
  if (next.launchOnLogin !== previous.launchOnLogin) syncLoginItem(next.launchOnLogin)

  return next
}

export function syncAlwaysOnTop(enabled: boolean): void {
  // 'floating' keeps Coffer above ordinary windows without fighting the
  // compositor's own overlays, which is what you want for a scratch pad you
  // keep beside another app.
  getMainWindow()?.setAlwaysOnTop(enabled, 'floating')
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

  /* args and openAsHidden are Windows-only — macOS ignores both, and Electron
     routes macOS 13 and later through SMAppService, which can land the app in
     'requires-approval' with the user still to enable it in System Settings.
     Reporting that as success is how a login item silently never happens. */
  if (isMac()) {
    app.setLoginItemSettings({ openAtLogin: enabled })

    const { status } = app.getLoginItemSettings()
    if (enabled && status === 'requires-approval') {
      console.warn('[settings] the login item needs approving in System Settings')
    }
    return
  }

  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: true,
    args: ['--hidden']
  })
}
