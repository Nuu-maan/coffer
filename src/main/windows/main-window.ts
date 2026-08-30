import { join } from 'node:path'
import { BrowserWindow, shell } from 'electron'
import { is } from '@electron-toolkit/utils'
import { HEADER_HEIGHT, MAIN_HEIGHT, MAIN_WIDTH } from '@shared/constants'
import { getStore } from '@main/store/store'
import { setWindowVisible } from '@main/platform/activation'
import { mainWindowOrigin } from './positioning'

let mainWindow: BrowserWindow | null = null

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

/*
 * macOS keeps its window controls. Asking for a frameless window there does not
 * remove them — Electron builds a buttons proxy whenever the title bar style is
 * anything but normal — so the traffic lights were being drawn at the system
 * default inset, on top of the wordmark, alongside Coffer's own buttons.
 *
 * Handing the header height to titleBarOverlay is what centres them in a 38px
 * bar and publishes env(titlebar-area-x) for the renderer to inset itself by.
 */
/*
 * The panel is a translucent sheet, so the frame under it has to be transparent
 * and the renderer draws the surface itself — including the corners, which is
 * why the radius lives in global.css rather than being asked of the window.
 *
 * macOS gets the real thing: `vibrancy` is the system material, sampled and
 * blurred by the compositor, which is the only way to get the saturation pass
 * Apple's own panels have. Elsewhere the renderer's own backdrop-filter stands
 * in — on Wayland what it can sample is up to the compositor, so the result is
 * a tint rather than a true blur unless a rule like Hyprland's `blur` is set
 * for this window.
 */
const CHROME =
  process.platform === 'darwin'
    ? {
        titleBarStyle: 'hidden' as const,
        titleBarOverlay: { height: HEADER_HEIGHT },
        vibrancy: 'sidebar' as const,
        visualEffectState: 'active' as const,
        transparent: true
      }
    : { frame: false, titleBarStyle: 'hidden' as const, transparent: true }

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
    ...CHROME,
    alwaysOnTop: getStore().settings.alwaysOnTop,
    /* Nothing, so the sheet the renderer draws is what is seen and no opaque
       rectangle flashes behind it on a cold start. The panel's own colour is
       --background in global.css. */
    backgroundColor: '#00000000',
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
    setWindowVisible(false)
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
  setWindowVisible(true)
  if (window.isMinimized()) window.restore()
  window.show()
  window.focus()
}

export function hideMainWindow(): void {
  mainWindow?.hide()
  setWindowVisible(false)
}
