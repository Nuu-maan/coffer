import { app, screen } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { APP_ID } from '@shared/constants'
import { CH } from '@shared/ipc/channels'
import { createHotkeyManager } from './hotkey'
import { broadcast } from './ipc/broadcast'
import { registerIpc } from './ipc/register'
import { applyLinuxCommandLineFlags } from './platform/linux-flags'
import { registerCofferScheme, serveCofferScheme } from './protocol/coffer'
import { flushStore, loadStore, storeIntact } from './store/store'
import { pruneOrphans } from './features/images/store'
import { createTray, destroyTray } from './tray'
import { showMainWindow } from './windows/main-window'
import { destroyOverlays, primeOverlays } from './windows/clipper-overlay'
import { stashSelection } from './features/stash/capture-flow'
import { startClip } from './features/clipper'
import { syncLoginItem, syncTheme } from './features/settings/service'

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  applyLinuxCommandLineFlags()
  registerCofferScheme()
  void boot()
}

function isForwardedAction(argv: string[]): boolean {
  return argv.includes('--stash') || argv.includes('--clip')
}

async function boot(): Promise<void> {
  const store = await loadStore()

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
    if (argv.includes('--stash')) return void stashSelection()
    if (argv.includes('--clip')) return void startClip()
    showMainWindow()
  })

  await app.whenReady()

  electronApp.setAppUserModelId(APP_ID)
  app.on('browser-window-created', (_event, window) => optimizer.watchWindowShortcuts(window))

  serveCofferScheme()
  registerIpc({
    onSettingsChanged: (settings) => hotkeys.apply(settings),
    hotkeyStatus: () => hotkeys.status()
  })

  createTray()
  hotkeys.apply(store.settings)
  syncTheme(store.settings.theme)
  syncLoginItem(store.settings.launchOnLogin)

  if (storeIntact()) {
    const kept = new Set(
      store.items.filter((item) => item.kind === 'image').map((item) => item.file)
    )
    void pruneOrphans(kept).then((count) => {
      if (count > 0) console.log(`[images] reclaimed ${count} orphaned file(s)`)
    })
  }

  primeOverlays()
  screen.on('display-added', () => primeOverlays())
  screen.on('display-removed', () => primeOverlays())
  screen.on('display-metrics-changed', () => primeOverlays())

  if (!process.argv.includes('--hidden') && !isForwardedAction(process.argv)) showMainWindow()

  app.on('window-all-closed', () => undefined)

  if (process.argv.includes('--stash')) void stashSelection()
  if (process.argv.includes('--clip')) void startClip()

  /* Quitting is held open just long enough to finish the debounced write. A
     failed write must not hold it open forever, so the exit is in the finally
     and not after the await. */
  let quitting = false
  app.on('before-quit', async (event) => {
    if (quitting) return
    quitting = true
    event.preventDefault()

    try {
      hotkeys.dispose()
      destroyOverlays()
      destroyTray()
      await flushStore()
    } catch (error) {
      console.error('[app] shutdown failed', error)
    } finally {
      app.exit(0)
    }
  })
}
