import { join } from 'node:path'
import { Menu, Tray, nativeImage } from 'electron'
import { APP_NAME } from '@shared/constants'
import { isMac } from '@main/platform/session'
import { showMainWindow } from '@main/windows/main-window'
import { stashSelection } from '@main/features/stash/capture-flow'
import { startClip } from '@main/features/clipper'

let tray: Tray | null = null

/*
 * The menu bar wants a template image, which is a shape in alpha and nothing
 * else — macOS discards the colour and paints it itself, so it inverts for a
 * dark menu bar and again when the item is highlighted. Electron reads the
 * Template suffix off the filename and picks up the @2x sibling from the same
 * convention, so the one path covers both densities.
 */
function iconPath(): string {
  const file = isMac() ? 'trayTemplate.png' : 'tray.png'
  return join(__dirname, '../../resources', file)
}

export function createTray(): Tray {
  const icon = nativeImage.createFromPath(iconPath())
  if (isMac()) icon.setTemplateImage(true)

  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)

  tray.setToolTip(APP_NAME)
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: `Open ${APP_NAME}`, click: () => showMainWindow() },
      { label: 'Stash selection', click: () => void stashSelection() },
      { label: 'Clip a region', click: () => void startClip() },
      { type: 'separator' },
      // The role carries the platform's own label and its ⌘Q on macOS.
      { role: 'quit' }
    ])
  )

  /* Not on macOS: a click there already opens the menu attached to the item,
     and AppKit reports it to us as well, so handling it would open the menu and
     raise the window at the same time. The menu's first item does that job. */
  if (!isMac()) tray.on('click', () => showMainWindow())

  return tray
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
