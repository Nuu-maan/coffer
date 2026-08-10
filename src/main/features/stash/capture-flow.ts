import { Notification } from 'electron'
import { APP_NAME } from '@shared/constants'
import { addItem } from '@main/features/items/service'
import { beginSourceCapture, takeCapturedSource } from '@main/features/source-capture'
import { readSelection } from '@main/features/selection-capture'
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
      notify(
        selection.reason === 'empty'
          ? 'Nothing selected'
          : 'Could not read the selection'
      )
      return
    }

    const source = await takeCapturedSource()
    broadcastItems(addItem({ text: selection.text, ...(source ? { source } : {}) }))
    notify(preview(selection.text))
  } finally {
    running = false
  }
}

function notify(body: string): void {
  if (!Notification.isSupported()) return
  new Notification({ title: `Stashed to ${APP_NAME}`, body, silent: true }).show()
}

function preview(value: string): string {
  const single = value.replace(/\s+/g, ' ')
  return single.length > 80 ? `${single.slice(0, 80)}…` : single
}
