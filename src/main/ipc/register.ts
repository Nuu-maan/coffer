import { readFile } from 'node:fs/promises'
import { BrowserWindow, clipboard, ipcMain, nativeImage } from 'electron'
import { CH } from '@shared/ipc/channels'
import type {
  AddImageInput,
  AddItemInput,
  ClipRegion,
  ReorderInput
} from '@shared/ipc/contract'
import type { HotkeyStatus, Settings } from '@shared/types/item'
import {
  addImage,
  addItem,
  clearDone,
  listItems,
  removeItem,
  reorderItem,
  toggleItem,
  updateItem
} from '@main/features/items/service'
import { resolveImage } from '@main/features/images/store'
import { applySettings, getSettings } from '@main/features/settings/service'
import { stashSelection } from '@main/features/stash/capture-flow'
import {
  cancelClip,
  commitClip,
  currentDraft,
  selectRegion,
  startClip
} from '@main/features/clipper'
import {
  markOverlayMounted,
  markOverlayPainted,
  overlayDisplayId
} from '@main/windows/clipper-overlay'
import { platformInfo } from '@main/platform/session'
import { hideMainWindow, showMainWindow } from '@main/windows/main-window'
import { broadcast, broadcastItems } from './broadcast'

type IpcHooks = {
  onSettingsChanged: (settings: Settings) => void
  hotkeyStatus: () => HotkeyStatus
}

export function registerIpc({ onSettingsChanged, hotkeyStatus }: IpcHooks): void {
  ipcMain.handle(CH.ITEMS_LIST, () => listItems())
  ipcMain.handle(CH.ITEMS_ADD, (_event, input: AddItemInput) => broadcastItems(addItem(input)))
  ipcMain.handle(CH.ITEMS_ADD_IMAGE, async (_event, input: AddImageInput) => {
    const image = nativeImage.createFromBuffer(Buffer.from(input.data))
    return broadcastItems(await addImage(image, { caption: input.caption, source: input.source }))
  })
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
  ipcMain.handle(CH.CLIPBOARD_WRITE_IMAGE, async (_event, file: string, text?: string) => {
    const path = resolveImage(file)
    if (!path) return false
    try {
      const image = nativeImage.createFromBuffer(await readFile(path))
      const caption = text?.trim()
      if (caption) clipboard.write({ image, text: caption })
      else clipboard.writeImage(image)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle(CH.STASH_SELECTION, () => stashSelection())

  ipcMain.handle(CH.CLIPPER_START, () => startClip())
  ipcMain.handle(CH.CLIPPER_DRAFT, () => currentDraft())
  ipcMain.on(CH.CLIPPER_MOUNTED, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window) markOverlayMounted(window)
  })
  ipcMain.on(CH.CLIPPER_PAINTED, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window) markOverlayPainted(window)
  })
  ipcMain.handle(CH.CLIPPER_COMMIT, (_event, caption: string) => commitClip(caption))
  ipcMain.on(CH.CLIPPER_CANCEL, () => cancelClip())
  ipcMain.on(CH.CLIPPER_REGION, (event, region: ClipRegion) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const displayId = window ? overlayDisplayId(window) : null
    if (displayId === null) return cancelClip()
    selectRegion(displayId, region)
  })

  ipcMain.handle(CH.PLATFORM_INFO, () => platformInfo())
  ipcMain.handle(CH.HOTKEY_STATUS, () => hotkeyStatus())

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
