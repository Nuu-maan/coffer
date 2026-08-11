import { contextBridge, ipcRenderer } from 'electron'
import { CH } from '@shared/ipc/channels'
import type {
  AddImageInput,
  AddItemInput,
  ClipRegion,
  CofferApi,
  OverlayFrame,
  ReorderInput,
  Unsubscribe
} from '@shared/ipc/contract'
import type { HotkeyStatus, Item, Settings } from '@shared/types/item'

function subscribe<T>(channel: string, callback: (payload: T) => void): Unsubscribe {
  const listener = (_event: Electron.IpcRendererEvent, payload: T): void => callback(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.off(channel, listener)
}

const api: CofferApi = {
  items: {
    list: () => ipcRenderer.invoke(CH.ITEMS_LIST),
    add: (input: AddItemInput) => ipcRenderer.invoke(CH.ITEMS_ADD, input),
    addImage: (input: AddImageInput) => ipcRenderer.invoke(CH.ITEMS_ADD_IMAGE, input),
    toggle: (id: string) => ipcRenderer.invoke(CH.ITEMS_TOGGLE, id),
    update: (id: string, text: string) => ipcRenderer.invoke(CH.ITEMS_UPDATE, id, text),
    remove: (id: string) => ipcRenderer.invoke(CH.ITEMS_DELETE, id),
    reorder: (input: ReorderInput) => ipcRenderer.invoke(CH.ITEMS_REORDER, input),
    clearDone: () => ipcRenderer.invoke(CH.ITEMS_CLEAR_DONE)
  },
  clipboard: {
    read: () => ipcRenderer.invoke(CH.CLIPBOARD_READ),
    write: (text: string) => ipcRenderer.invoke(CH.CLIPBOARD_WRITE, text),
    writeImage: (file: string, text?: string) =>
      ipcRenderer.invoke(CH.CLIPBOARD_WRITE_IMAGE, file, text)
  },
  stash: {
    selection: () => ipcRenderer.invoke(CH.STASH_SELECTION)
  },
  clipper: {
    start: () => ipcRenderer.invoke(CH.CLIPPER_START),
    draft: () => ipcRenderer.invoke(CH.CLIPPER_DRAFT),
    mounted: () => ipcRenderer.send(CH.CLIPPER_MOUNTED),
    painted: () => ipcRenderer.send(CH.CLIPPER_PAINTED),
    region: (region: ClipRegion) => ipcRenderer.send(CH.CLIPPER_REGION, region),
    cancel: () => ipcRenderer.send(CH.CLIPPER_CANCEL),
    commit: (caption: string) => ipcRenderer.invoke(CH.CLIPPER_COMMIT, caption)
  },
  platform: {
    info: () => ipcRenderer.invoke(CH.PLATFORM_INFO)
  },
  hotkeys: {
    status: () => ipcRenderer.invoke(CH.HOTKEY_STATUS)
  },
  settings: {
    get: () => ipcRenderer.invoke(CH.SETTINGS_GET),
    set: (patch: Partial<Settings>) => ipcRenderer.invoke(CH.SETTINGS_SET, patch)
  },
  window: {
    openMain: () => ipcRenderer.send(CH.WINDOW_OPEN_MAIN),
    minimize: () => ipcRenderer.send(CH.WINDOW_MINIMIZE),
    hideMain: () => ipcRenderer.send(CH.WINDOW_HIDE_MAIN)
  },
  on: {
    clipperFrame: (callback) => subscribe<OverlayFrame>(CH.ON_CLIPPER_FRAME, callback),
    itemsChanged: (callback) => subscribe<Item[]>(CH.ON_ITEMS_CHANGED, callback),
    settingsChanged: (callback) => subscribe<Settings>(CH.ON_SETTINGS_CHANGED, callback),
    hotkeyStatus: (callback) => subscribe<HotkeyStatus>(CH.ON_HOTKEY_STATUS, callback)
  }
}

contextBridge.exposeInMainWorld('coffer', api)
