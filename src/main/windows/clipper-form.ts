import { BrowserWindow, screen } from 'electron'
import type { ClipDraft } from '@shared/types/item'
import { loadPage, preloadPath } from './load'

/* Kept in step with the main panel — a sheet that appears wider than the
   window it files into reads as a different app. */
const WIDTH = 360
const MAX_HEIGHT = 480

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
    /* The form draws its own rounded card and its own shadow. A system shadow
       on a transparent window traces the square frame instead of the card,
       which on macOS reads as a grey box behind it. */
    hasShadow: false,
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
