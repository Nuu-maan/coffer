import { BrowserWindow, clipboard, ipcMain } from 'electron'
import { CH } from '@shared/ipc/channels'
import type { AddItemInput, ReorderInput } from '@shared/ipc/contract'
import type { Settings } from '@shared/types/item'
import {
  addItem,
  clearDone,
  listItems,
  removeItem,
  reorderItem,
  toggleItem,
  updateItem
} from '@main/features/items/service'
import { applySettings, getSettings } from '@main/features/settings/service'
import { stashSelection } from '@main/features/stash/capture-flow'
import { hideMainWindow, showMainWindow } from '@main/windows/main-window'
import { broadcast, broadcastItems } from './broadcast'

type OnSettingsChanged = (settings: Settings) => void

export function registerIpc(onSettingsChanged: OnSettingsChanged): void {
  ipcMain.handle(CH.ITEMS_LIST, () => listItems())
  ipcMain.handle(CH.ITEMS_ADD, (_event, input: AddItemInput) => broadcastItems(addItem(input)))
  ipcMain.handle(CH.ITEMS_TOGGLE, (_event, id: string) => broadcastItems(toggleItem(id)))
  ipcMain.handle(CH.ITEMS_UPDATE, (_event, id: string, text: string) =>
    broadcastItems(updateItem(id, text))
  )
  ipcMain.handle(CH.ITEMS_DELETE, (_event, id: string) => broadcastItems(removeItem(id)))
  ipcMain.handle(CH.ITEMS_REORDER, (_event, input: ReorderInput) =>
    broadcastItems(reorderItem(input))
  )
  ipcMain.handle(CH.ITEMS_CLEAR_DONE, () => broadcastItems(clearDone()))

  ipcMain.handle(CH.CLIPBOARD_READ, () => clipboard.readText())
  ipcMain.handle(CH.CLIPBOARD_WRITE, (_event, text: string) => {
    clipboard.writeText(text)
  })

  ipcMain.handle(CH.STASH_SELECTION, () => stashSelection())

  ipcMain.handle(CH.SETTINGS_GET, () => getSettings())
  ipcMain.handle(CH.SETTINGS_SET, (_event, patch: Partial<Settings>) => {
    const next = applySettings(patch)
    onSettingsChanged(next)
    broadcast(CH.ON_SETTINGS_CHANGED, next)
    return next
  })

  ipcMain.on(CH.WINDOW_OPEN_MAIN, () => showMainWindow())
  ipcMain.on(CH.WINDOW_HIDE_MAIN, () => hideMainWindow())
  ipcMain.on(CH.WINDOW_MINIMIZE, (event) => BrowserWindow.fromWebContents(event.sender)?.minimize())
}
