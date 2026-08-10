import { app } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { APP_ID } from '@shared/constants'
import { createHotkeyManager } from './hotkey'
import { registerIpc } from './ipc/register'
import { applyLinuxCommandLineFlags } from './platform/linux-flags'
import { registerCofferScheme, serveCofferScheme } from './protocol/coffer'
import { flushStore, loadStore } from './store/store'
import { createTray, destroyTray } from './tray'
import { showMainWindow } from './windows/main-window'
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

async function boot(): Promise<void> {
  const store = await loadStore()

  const hotkeys = createHotkeyManager({
    onStash: () => void stashSelection(),
    onClip: () => void startClip()
  })

  app.on('second-instance', () => showMainWindow())

  await app.whenReady()

  electronApp.setAppUserModelId(APP_ID)
  app.on('browser-window-created', (_event, window) => optimizer.watchWindowShortcuts(window))

  serveCofferScheme()
  registerIpc((settings) => hotkeys.apply(settings))

  createTray()
  hotkeys.apply(store.settings)
  syncTheme(store.settings.theme)
  syncLoginItem(store.settings.launchOnLogin)

  if (!process.argv.includes('--hidden')) showMainWindow()

  app.on('window-all-closed', () => undefined)

  app.on('before-quit', async (event) => {
    event.preventDefault()
    hotkeys.dispose()
    destroyTray()
    await flushStore()
    app.exit(0)
  })
}
