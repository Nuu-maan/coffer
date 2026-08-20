import { Notification } from 'electron'
import { APP_NAME } from '@shared/constants'
import { addImage, addItem } from '@main/features/items/service'
import { beginSourceCapture, takeCapturedSource } from '@main/features/source-capture'
import { readSelection, type Capture } from '@main/features/selection-capture'
import { broadcastItems } from '@main/ipc/broadcast'

let running = false

export async function stashSelection(): Promise<void> {
  if (running) return
  running = true

  try {
    beginSourceCapture()

    const selection = await readSelection()

    if (!selection.ok) {
      await takeCapturedSource()
      notify(reasonMessage(selection.reason))
      return
    }

    const source = await takeCapturedSource()
    const attribution = source ? { source } : {}

    if (selection.kind === 'image') {
      const size = selection.image.getSize()
      broadcastItems(await addImage(selection.image, attribution))
      notify(`Image ${size.width}×${size.height}`)
      return
    }

    broadcastItems(addItem({ text: selection.text, ...attribution }))
    notify(preview(selection.text))
  } finally {
    running = false
  }
}

function reasonMessage(reason: Exclude<Capture, { ok: true }>['reason']): string {
  if (reason === 'empty') return 'Nothing selected'
  if (reason === 'unsupported') return 'Selection capture is not available in this session'
  if (reason === 'no-permission') {
    return 'Coffer needs Accessibility access to copy from other apps'
  }
  return 'Could not read the selection'
}

function notify(body: string): void {
  if (!Notification.isSupported()) return
  new Notification({ title: `Stashed to ${APP_NAME}`, body, silent: true }).show()
}

function preview(value: string): string {
  const single = value.replace(/\s+/g, ' ')
  return single.length > 80 ? `${single.slice(0, 80)}…` : single
}
