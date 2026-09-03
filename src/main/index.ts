import { writeSync } from 'node:fs'
import { app, screen } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { APP_ID } from '@shared/constants'
import { CH } from '@shared/ipc/channels'
import { createHotkeyManager } from './hotkey'
import { broadcast, broadcastItems } from './ipc/broadcast'
import { registerIpc } from './ipc/register'
import { installMenu, watchActivation } from './menu'
import { applyLinuxCommandLineFlags } from './platform/linux-flags'
import { registerCofferScheme, serveCofferScheme } from './protocol/coffer'
import { setWindowVisible } from './platform/activation'
import { isMac } from './platform/session'
import { watchPermissions } from './platform/permissions'
import { flushStore, loadStore, storeIntact } from './store/store'
import { pruneOrphans } from './features/images/store'
import { createTray, destroyTray } from './tray'
import { showMainWindow } from './windows/main-window'
import { destroyOverlays, primeOverlays } from './windows/clipper-overlay'
import { parseForwardedAction } from './features/cli/args'
import { copyItem } from './features/items/clipboard'
import { setItemDone } from './features/items/service'
import { stashSelection } from './features/stash/capture-flow'
import { startClip } from './features/clipper'
import { getSettings, syncLoginItem, syncTheme } from './features/settings/service'
import { startUpdateChecks, stopUpdateChecks } from './features/updates'

/* Startup is the one place a failure leaves nothing behind to look at: no
   window, no log, and a process that is still running. Off unless asked for. */
/* writeSync, not console.log: stdout to a pipe is asynchronous, so if the main
   thread wedges in a native call the queued lines are lost — which is exactly
   the failure being traced. */
const trace = process.env['COFFER_TRACE']
  ? (step: string): void => {
      writeSync(1, `[boot] ${step}\n`)
    }
  : (): void => undefined

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  applyLinuxCommandLineFlags()
  registerCofferScheme()

  /* Anything that escapes boot() leaves a process that is running, has a
     debugger port, and will never show a window — which looks like a hang and
     is impossible to diagnose from the outside. Say what happened and stop. */
  boot().catch((error) => {
    console.error('[app] failed to start', error)
    app.exit(1)
  })
}

function runForwardedAction(argv: string[]): boolean {
  const action = parseForwardedAction(argv)
  if (!action) return false

  if (action.kind === 'stash') void stashSelection()
  else if (action.kind === 'clip') void startClip()
  else if (action.kind === 'copy') void copyItem(action.id)
  else broadcastItems(setItemDone(action.id, true))

  return true
}

function isForwardedAction(argv: string[]): boolean {
  return parseForwardedAction(argv) !== null
}

/*
 * Launching at login should leave Coffer in the tray, not put a window in front
 * of whatever the user opened their machine to do. Windows and Linux are told
 * to pass --hidden; macOS ignores extra arguments on a login item entirely and
 * reports the same fact its own way.
 */
function startedHidden(): boolean {
  if (!isMac()) return process.argv.includes('--hidden')

  // SMAppService throws rather than answering for a bundle it does not consider
  // installed. Not knowing means showing the window, which is the safe way to
  // be wrong.
  try {
    return app.getLoginItemSettings().wasOpenedAtLogin
  } catch {
    return false
  }
}

async function boot(): Promise<void> {
  trace('start')
  const store = await loadStore()
  trace('store loaded')

  const hotkeys = createHotkeyManager(
    {
      onStash: () => void stashSelection(),
      onClip: () => void startClip()
    },
    (status) => broadcast(CH.ON_HOTKEY_STATUS, status)
  )

  // Compositors that cannot bind portal shortcuts (or users who would rather
  // not) can bind a command instead: a second launch forwards the action here.
  app.on('second-instance', (_event, argv) => {
    if (!runForwardedAction(argv)) showMainWindow()
  })

  trace('waiting for ready')
  await app.whenReady()
  trace('ready')

  electronApp.setAppUserModelId(APP_ID)
  app.on('browser-window-created', (_event, window) => optimizer.watchWindowShortcuts(window))

  serveCofferScheme()
  trace('scheme served')
  registerIpc({
    onSettingsChanged: (settings) => hotkeys.apply(settings),
    hotkeyStatus: () => hotkeys.status()
  })
  trace('ipc registered')

  installMenu()
  trace('menu installed')
  createTray()
  trace('tray created')
  hotkeys.apply(store.settings)
  trace('hotkeys applied')
  watchPermissions((next) => {
    broadcast(CH.ON_PERMISSIONS_CHANGED, next)
    hotkeys.refresh(getSettings())
  })
  syncTheme(store.settings.theme)
  trace('theme synced')
  syncLoginItem(store.settings.launchOnLogin)
  trace('login item synced')

  if (storeIntact()) {
    const kept = new Set(
      store.items.flatMap((item) =>
        item.kind === 'image' ? item.images.map((image) => image.file) : []
      )
    )
    void pruneOrphans(kept).then((count) => {
      if (count > 0) console.log(`[images] reclaimed ${count} orphaned file(s)`)
    })
  }

  startUpdateChecks()
  trace('update checks started')

  primeOverlays()
  trace('overlays primed')
  screen.on('display-added', () => primeOverlays())
  screen.on('display-removed', () => primeOverlays())
  screen.on('display-metrics-changed', () => primeOverlays())

  // Launched into the menu bar rather than onto the screen: no window, so on
  // macOS no Dock tile either until there is one.
  const hidden = startedHidden()
  trace(`started hidden: ${hidden}`)
  if (!hidden && !isForwardedAction(process.argv)) showMainWindow()
  else setWindowVisible(false)

  trace('window decided')
  watchActivation()
  app.on('window-all-closed', () => undefined)

  runForwardedAction(process.argv)

  /* Quitting is held open just long enough to finish the debounced write. A
     failed write must not hold it open forever, so the exit is in the finally
     and not after the await. */
  let quitting = false
  app.on('before-quit', async (event) => {
    if (quitting) return
    quitting = true
    event.preventDefault()

    try {
      await hotkeys.dispose()
      stopUpdateChecks()
      destroyOverlays()
      destroyTray()
      await flushStore()
    } catch (error) {
      console.error('[app] shutdown failed', error)
    } finally {
      app.exit(0)
    }
  })

  trace('booted')
}
