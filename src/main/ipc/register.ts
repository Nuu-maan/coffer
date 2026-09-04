import { BrowserWindow, app, clipboard, ipcMain, nativeImage } from 'electron'
import { CH } from '@shared/ipc/channels'
import type {
  AddImageInput,
  AddItemInput,
  ClipRegion,
  ReorderInput,
  ReorderSectionInput
} from '@shared/ipc/contract'
import type { HotkeyStatus, PermissionKind, Settings } from '@shared/types/item'
import {
  addImages,
  addItem,
  addSection,
  clearDone,
  moveSectionItems,
  removeItem,
  removeItems,
  removeSection,
  restoreItems,
  renameTag,
  reorderItem,
  reorderSection,
  setSectionDone,
  setTag,
  snapshot,
  toggleItem,
  updateItem
} from '@main/features/items/service'
import { writeImageToClipboard } from '@main/features/items/clipboard'
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
import { permissions, requestPermission } from '@main/platform/permissions'
import { hideMainWindow, showMainWindow } from '@main/windows/main-window'
import { broadcast, broadcastItems } from './broadcast'

type IpcHooks = {
  onSettingsChanged: (settings: Settings) => void
  hotkeyStatus: () => HotkeyStatus
}

export function registerIpc({ onSettingsChanged, hotkeyStatus }: IpcHooks): void {
  ipcMain.handle(CH.ITEMS_LIST, () => snapshot())
  ipcMain.handle(CH.ITEMS_ADD, (_event, input: AddItemInput) => broadcastItems(addItem(input)))
  ipcMain.handle(CH.ITEMS_ADD_IMAGE, async (_event, input: AddImageInput) => {
    const images = input.data.map((bytes) => nativeImage.createFromBuffer(Buffer.from(bytes)))
    return broadcastItems(await addImages(images, { caption: input.caption, source: input.source }))
  })
  ipcMain.handle(CH.ITEMS_TOGGLE, (_event, id: string) => broadcastItems(toggleItem(id)))
  ipcMain.handle(CH.ITEMS_UPDATE, (_event, id: string, text: string) =>
    broadcastItems(updateItem(id, text))
  )
  ipcMain.handle(CH.ITEMS_DELETE, (_event, id: string) => broadcastItems(removeItem(id)))
  ipcMain.handle(CH.ITEMS_DELETE_MANY, (_event, ids: string[]) => broadcastItems(removeItems(ids)))
  ipcMain.handle(CH.ITEMS_RESTORE, (_event, ids: string[]) => broadcastItems(restoreItems(ids)))
  ipcMain.handle(CH.ITEMS_REORDER, (_event, input: ReorderInput) =>
    broadcastItems(reorderItem(input))
  )
  ipcMain.handle(CH.ITEMS_CLEAR_DONE, () => broadcastItems(clearDone()))
  ipcMain.handle(CH.ITEMS_SET_TAG, (_event, id: string, tag: string) =>
    broadcastItems(setTag(id, tag))
  )

  ipcMain.handle(CH.SECTIONS_ADD, (_event, name: string) => broadcastItems(addSection(name)))
  ipcMain.handle(CH.SECTIONS_RENAME, (_event, from: string, to: string) =>
    broadcastItems(renameTag(from, to))
  )
  ipcMain.handle(CH.SECTIONS_REMOVE, (_event, name: string) => broadcastItems(removeSection(name)))
  ipcMain.handle(CH.SECTIONS_REORDER, (_event, input: ReorderSectionInput) =>
    broadcastItems(reorderSection(input))
  )
  ipcMain.handle(CH.SECTIONS_MOVE_ITEMS, (_event, from: string, to: string) =>
    broadcastItems(moveSectionItems(from, to))
  )
  ipcMain.handle(CH.SECTIONS_SET_DONE, (_event, name: string, done: boolean) =>
    broadcastItems(setSectionDone(name, done))
  )

  ipcMain.handle(CH.CLIPBOARD_READ, () => clipboard.readText())
  ipcMain.handle(CH.CLIPBOARD_WRITE, (_event, text: string) => {
    clipboard.writeText(text)
  })
  ipcMain.handle(CH.CLIPBOARD_WRITE_IMAGE, (_event, file: string, text?: string) =>
    writeImageToClipboard(file, text)
  )

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

  ipcMain.handle(CH.PERMISSIONS_STATUS, () => permissions())
  ipcMain.handle(CH.PERMISSIONS_REQUEST, (_event, kind: PermissionKind) => requestPermission(kind))
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

  ipcMain.on(CH.APP_RELAUNCH, () => {
    app.relaunch()
    app.quit()
  })
}
