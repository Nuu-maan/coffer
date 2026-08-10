import { BrowserWindow } from 'electron'
import type { DisplayFrame } from '@main/features/clipper/capture'
import { loadPage, preloadPath } from './load'

const overlays = new Map<number, BrowserWindow>()

export function openOverlays(frames: DisplayFrame[]): void {
  closeOverlays()

  for (const frame of frames) {
    const window = new BrowserWindow({
      ...frame.bounds,
      frame: false,
      show: false,
      backgroundColor: '#000000',
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      hasShadow: false,
      alwaysOnTop: true,
      webPreferences: {
        preload: preloadPath(),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    window.setAlwaysOnTop(true, 'screen-saver')
    window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

    window.webContents.once('did-finish-load', () => {
      if (window.isDestroyed()) return
      window.setBounds(frame.bounds)
      window.show()
      window.focus()
    })

    overlays.set(frame.displayId, window)
    loadPage(window, 'clipper.html')
  }
}

export function overlayDisplayId(window: BrowserWindow): number | null {
  for (const [displayId, candidate] of overlays) {
    if (candidate === window) return displayId
  }
  return null
}

export function closeOverlays(): void {
  for (const window of overlays.values()) {
    if (!window.isDestroyed()) window.destroy()
  }
  overlays.clear()
}
