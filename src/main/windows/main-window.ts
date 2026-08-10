import { join } from 'node:path'
import { BrowserWindow, shell } from 'electron'
import { is } from '@electron-toolkit/utils'
import { MAIN_HEIGHT, MAIN_WIDTH } from '@shared/constants'
import { mainWindowOrigin } from './positioning'

let mainWindow: BrowserWindow | null = null

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function createMainWindow(): BrowserWindow {
  const { x, y } = mainWindowOrigin(MAIN_WIDTH, MAIN_HEIGHT)

  const window = new BrowserWindow({
    x,
    y,
    width: MAIN_WIDTH,
    height: MAIN_HEIGHT,
    minWidth: 360,
    minHeight: 420,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#131110',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  window.on('ready-to-show', () => window.show())
  window.on('closed', () => {
    mainWindow = null
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/index.html`)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow = window
  return window
}

export function showMainWindow(): void {
  const window = mainWindow ?? createMainWindow()
  if (window.isMinimized()) window.restore()
  window.show()
  window.focus()
}

export function hideMainWindow(): void {
  mainWindow?.hide()
}
