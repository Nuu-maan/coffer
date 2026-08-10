import { BrowserWindow } from 'electron'
import { CH } from '@shared/ipc/channels'
import type { Item } from '@shared/types/item'

export function broadcast(channel: string, payload: unknown): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send(channel, payload)
  }
}

export function broadcastItems(items: Item[]): Item[] {
  broadcast(CH.ON_ITEMS_CHANGED, items)
  return items
}
