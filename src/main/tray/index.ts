import { join } from 'node:path'
import { Menu, Tray, app, nativeImage } from 'electron'
import { APP_NAME } from '@shared/constants'
import { showMainWindow } from '@main/windows/main-window'
import { stashSelection } from '@main/features/stash/capture-flow'

let tray: Tray | null = null

export function createTray(): Tray {
  const icon = nativeImage.createFromPath(join(__dirname, '../../resources/tray.png'))
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)

  tray.setToolTip(APP_NAME)
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: `Open ${APP_NAME}`, click: () => showMainWindow() },
      { label: 'Stash selection', click: () => void stashSelection() },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ])
  )

  tray.on('click', () => showMainWindow())
  return tray
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
