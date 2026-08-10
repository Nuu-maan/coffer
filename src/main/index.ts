import { app } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { APP_ID } from '@shared/constants'
import { createHotkeyManager } from './hotkey'
import { registerIpc } from './ipc/register'
import { flushStore, loadStore } from './store/store'
import { createTray, destroyTray } from './tray'
import { showMainWindow } from './windows/main-window'
import { stashSelection } from './features/stash/capture-flow'
import { syncLoginItem } from './features/settings/service'

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  void boot()
}

async function boot(): Promise<void> {
  const store = await loadStore()

  const hotkeys = createHotkeyManager(() => {
    void stashSelection()
  })

  app.on('second-instance', () => showMainWindow())

  await app.whenReady()

  electronApp.setAppUserModelId(APP_ID)
  app.on('browser-window-created', (_event, window) => optimizer.watchWindowShortcuts(window))

  registerIpc((settings) => hotkeys.apply(settings))

  createTray()
  hotkeys.apply(store.settings)
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
