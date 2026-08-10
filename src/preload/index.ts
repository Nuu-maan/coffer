import { contextBridge, ipcRenderer } from 'electron'
import { CH } from '@shared/ipc/channels'
import type { AddItemInput, CofferApi, ReorderInput, Unsubscribe } from '@shared/ipc/contract'
import type { Item, Settings } from '@shared/types/item'

function subscribe<T>(channel: string, callback: (payload: T) => void): Unsubscribe {
  const listener = (_event: Electron.IpcRendererEvent, payload: T): void => callback(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.off(channel, listener)
}

const api: CofferApi = {
  items: {
    list: () => ipcRenderer.invoke(CH.ITEMS_LIST),
    add: (input: AddItemInput) => ipcRenderer.invoke(CH.ITEMS_ADD, input),
    toggle: (id: string) => ipcRenderer.invoke(CH.ITEMS_TOGGLE, id),
    update: (id: string, text: string) => ipcRenderer.invoke(CH.ITEMS_UPDATE, id, text),
    remove: (id: string) => ipcRenderer.invoke(CH.ITEMS_DELETE, id),
    reorder: (input: ReorderInput) => ipcRenderer.invoke(CH.ITEMS_REORDER, input),
    clearDone: () => ipcRenderer.invoke(CH.ITEMS_CLEAR_DONE)
  },
  clipboard: {
    read: () => ipcRenderer.invoke(CH.CLIPBOARD_READ),
    write: (text: string) => ipcRenderer.invoke(CH.CLIPBOARD_WRITE, text)
  },
  stash: {
    selection: () => ipcRenderer.invoke(CH.STASH_SELECTION)
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
    itemsChanged: (callback) => subscribe<Item[]>(CH.ON_ITEMS_CHANGED, callback),
    settingsChanged: (callback) => subscribe<Settings>(CH.ON_SETTINGS_CHANGED, callback)
  }
}

contextBridge.exposeInMainWorld('coffer', api)
