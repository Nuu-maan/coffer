import { BrowserWindow } from 'electron'
import { CH } from '@shared/ipc/channels'
import type { Snapshot } from '@shared/types/item'

export function broadcast(channel: string, payload: unknown): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send(channel, payload)
  }
}

/* The list and its sections travel together — a rename moves items between
   captions and can delete a caption outright, and two events for that would
   have the renderer draw one frame with the items already moved and the caption
   still there. */
export function broadcastItems(snapshot: Snapshot): Snapshot {
  broadcast(CH.ON_ITEMS_CHANGED, snapshot)
  return snapshot
}
