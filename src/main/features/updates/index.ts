import { app } from 'electron'
import electronUpdater from 'electron-updater'

const FIRST_CHECK_MS = 30_000
const INTERVAL_MS = 6 * 60 * 60 * 1000

let timer: NodeJS.Timeout | null = null

/*
 * Checks quietly and installs on the next quit. Nothing is asked of anyone
 * mid-session: this is a window you leave open beside your work, and an app
 * that interrupts that to talk about itself has misjudged what it is.
 *
 * Only where an update can actually be applied. A .deb belongs to the system
 * package manager and electron-updater cannot touch it, so on Linux this runs
 * for the AppImage alone — which is what the APPIMAGE variable identifies.
 */
export function startUpdateChecks(): void {
  if (!app.isPackaged) return
  if (process.platform === 'linux' && !process.env['APPIMAGE']) return

  const { autoUpdater } = electronUpdater
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('error', (error) => console.error('[updates] check failed', error))

  const check = (): void => {
    autoUpdater.checkForUpdatesAndNotify().catch((error) => {
      console.error('[updates] check failed', error)
    })
  }

  setTimeout(check, FIRST_CHECK_MS)
  timer = setInterval(check, INTERVAL_MS)
}

export function stopUpdateChecks(): void {
  if (timer) clearInterval(timer)
  timer = null
}
