import { Notification, type NativeImage, type Rectangle } from 'electron'
import { APP_NAME } from '@shared/constants'
import type { ClipDraft, ItemSource } from '@shared/types/item'
import { RESTART_NOTE, openPrivacyPane, requestScreen } from '@main/platform/permissions'
import { addImage } from '@main/features/items/service'
import { beginSourceCapture, takeCapturedSource } from '@main/features/source-capture'
import { broadcastItems } from '@main/ipc/broadcast'
import { closeClipForm, openClipForm } from '@main/windows/clipper-form'
import { closeOverlays, openOverlays, overlaysOpen } from '@main/windows/clipper-overlay'
import { ScreenPermissionError } from './backends/chromium'
import { captureDisplays, cropFrame } from './capture'
import { clearDraft, clearFrames, displayFrame, frameCount, setDraft, setFrames } from './frames'

let draft: NativeImage | null = null
let pendingDraft: ClipDraft | null = null
let source: Promise<ItemSource | undefined> | null = null
let starting = false

export function currentDraft(): ClipDraft | null {
  return pendingDraft
}

export async function startClip(): Promise<void> {
  if (starting || overlaysOpen()) return
  starting = true

  try {
    if (!(await ensureScreenAccess())) return

    reset()
    beginSourceCapture()

    const captured = await captureDisplays()
    setFrames(captured)

    if (frameCount() === 0) {
      notify('Could not read the screen')
      return
    }

    source = takeCapturedSource()
    openOverlays(captured)
  } catch (error) {
    console.error('[clipper] capture failed', error)
    notify(
      error instanceof ScreenPermissionError
        ? 'Coffer needs Screen Recording access to clip'
        : 'Could not read the screen'
    )
    if (error instanceof ScreenPermissionError) openPrivacyPane('screen')
    reset()
  } finally {
    starting = false
  }
}

/* The prompt, the pane and the caching quirk all live in the permissions
   module now, because Settings raises the same request. */
async function ensureScreenAccess(): Promise<boolean> {
  if (await requestScreen()) return true

  notify(`Coffer needs Screen Recording access to clip. ${RESTART_NOTE}`)
  return false
}

export function selectRegion(displayId: number, region: Rectangle): void {
  closeOverlays()

  const frame = displayFrame(displayId)
  if (!frame) return cancelClip()

  const cropped = cropFrame(frame, region)
  if (!cropped) return cancelClip()

  draft = cropped
  clearFrames()

  const size = cropped.getSize()
  pendingDraft = { url: setDraft(cropped), width: size.width, height: size.height }

  openClipForm(pendingDraft)
}

export async function commitClip(caption: string): Promise<void> {
  const image = draft
  const attribution = await source
  reset()
  closeClipForm()

  if (!image) return

  const size = image.getSize()
  broadcastItems(
    await addImage(image, { caption, ...(attribution ? { source: attribution } : {}) })
  )
  notify(caption || `Clipped ${size.width}×${size.height}`)
}

export function cancelClip(): void {
  closeOverlays()
  closeClipForm()
  reset()
}

function reset(): void {
  clearFrames()
  clearDraft()
  draft = null
  pendingDraft = null
  source = null
}

function notify(body: string): void {
  if (!Notification.isSupported()) return
  new Notification({ title: APP_NAME, body, silent: true }).show()
}
