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
 * An allow-list, not a deny-list, because the cost of getting this wrong is
 * paid in the user's bandwidth. Only two packagings can actually apply an
 * update:
 *
 *   Windows, through NSIS.
 *   The Linux AppImage, which is what the APPIMAGE variable identifies. A .deb
 *   belongs to apt and electron-updater cannot touch it.
 *
 * macOS is absent on purpose. Updating there means Squirrel.Mac, which verifies
 * the bundle carries a Developer ID before it will do anything — and Coffer's
 * macOS build is signed ad-hoc. The failure is not a clean refusal either: the
 * signature is checked when the feed URL is set, and that happens only after
 * the whole update has been downloaded. Left running, this would fetch a
 * hundred-odd megabytes every six hours, log one warning, and wait forever on a
 * promise nothing settles.
 */
function canApplyUpdates(): boolean {
  if (process.platform === 'win32') return true
  if (process.platform === 'linux') return !!process.env['APPIMAGE']
  return false
}

export function startUpdateChecks(): void {
  if (!app.isPackaged) return
  if (!canApplyUpdates()) return

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
