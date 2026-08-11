import { BrowserWindow, screen } from 'electron'
import type { ClipDraft } from '@shared/types/item'
import { loadPage, preloadPath } from './load'

const WIDTH = 420
const MAX_HEIGHT = 560

let form: BrowserWindow | null = null

export function openClipForm(draft: ClipDraft): void {
  closeClipForm()

  const previewHeight = Math.min(Math.round((WIDTH - 32) * (draft.height / draft.width)), 320)
  const height = Math.min(MAX_HEIGHT, Math.max(230, previewHeight + 140))
  const cursor = screen.getCursorScreenPoint()
  const area = screen.getDisplayNearestPoint(cursor).workArea

  const window = new BrowserWindow({
    width: WIDTH,
    height,
    x: Math.round(area.x + (area.width - WIDTH) / 2),
    y: Math.round(area.y + (area.height - height) / 2),
    frame: false,
    show: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: preloadPath(),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  window.setAlwaysOnTop(true, 'screen-saver')

  window.webContents.once('did-finish-load', () => {
    if (window.isDestroyed()) return
    window.show()
    window.focus()
  })

  window.on('closed', () => {
    if (form === window) form = null
  })

  form = window
  loadPage(window, 'compose.html')
}

export function closeClipForm(): void {
  if (form && !form.isDestroyed()) form.destroy()
  form = null
}
