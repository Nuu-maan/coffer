import { Menu, app, type MenuItemConstructorOptions } from 'electron'
import { is } from '@electron-toolkit/utils'
import { CH } from '@shared/ipc/channels'
import { isMac } from './platform/session'
import { getMainWindow, hideMainWindow, showMainWindow } from './windows/main-window'

/*
 * Electron installs a default menu when an app does not, so Cmd+C and friends
 * were never broken. The problem is the other direction: that default ships
 * Cmd+R and Alt+Cmd+I to everyone, and neither belongs in a released build.
 * AppKit dispatches menu key equivalents before a window's own key handling
 * ever runs, so nothing in the renderer can take them back — only replacing the
 * menu can.
 *
 * Windows and Linux draw their own title bar and have no menu bar to put this
 * in, so they keep having none at all.
 */
export function installMenu(): void {
  if (!isMac()) return Menu.setApplicationMenu(null)

  const developer: MenuItemConstructorOptions[] = is.dev
    ? [{ type: 'separator' }, { role: 'reload' }, { role: 'toggleDevTools' }]
    : []

  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        role: 'appMenu',
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          {
            label: 'Settings…',
            accelerator: 'Command+,',
            click: () => {
              showMainWindow()
              getMainWindow()?.webContents.send(CH.ON_SHOW_SETTINGS)
            }
          },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      },
      { role: 'editMenu' },
      {
        role: 'windowMenu',
        submenu: [
          { role: 'minimize' },
          /* Closing puts Coffer back in the menu bar rather than destroying the
             window, which is what Esc and the tray already do. Quitting is ⌘Q. */
          { label: 'Close', accelerator: 'Command+W', click: () => hideMainWindow() },
          { type: 'separator' },
          { role: 'front' },
          ...developer
        ]
      }
    ])
  )
}

/*
 * Reopening from the Dock or the app switcher fires this, and nothing else
 * does — 'second-instance' is not involved, because macOS does not launch a
 * second copy. Deliberately not gated on how many windows exist: the overlay
 * pool keeps one hidden window per display alive at all times, so that count is
 * never zero and the usual guard would never let this fire.
 */
export function watchActivation(): void {
  if (!isMac()) return
  app.on('activate', () => showMainWindow())
}
