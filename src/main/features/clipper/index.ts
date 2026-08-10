import { Notification, type NativeImage, type Rectangle } from 'electron'
import { APP_NAME } from '@shared/constants'
import type { ClipDraft, ItemSource } from '@shared/types/item'
import type { OverlayFrame } from '@shared/ipc/contract'
import { addImage } from '@main/features/items/service'
import { beginSourceCapture, takeCapturedSource } from '@main/features/source-capture'
import { broadcastItems } from '@main/ipc/broadcast'
import { closeClipForm, openClipForm } from '@main/windows/clipper-form'
import { closeOverlays, openOverlays } from '@main/windows/clipper-overlay'
import { captureDisplays, cropFrame, type DisplayFrame } from './capture'

let frames: DisplayFrame[] = []
let draft: NativeImage | null = null
let pendingDraft: ClipDraft | null = null
let source: ItemSource | undefined
let starting = false

export function frameFor(displayId: number): OverlayFrame | null {
  const frame = frames.find((candidate) => candidate.displayId === displayId)
  if (!frame) return null

  const size = frame.image.getSize()
  return { dataUrl: frame.image.toDataURL(), width: size.width, height: size.height }
}

export function currentDraft(): ClipDraft | null {
  return pendingDraft
}

export async function startClip(): Promise<void> {
  if (starting) return
  starting = true

  try {
    reset()
    beginSourceCapture()

    frames = await captureDisplays()
    source = await takeCapturedSource()

    if (frames.length === 0) {
      notify('Could not read the screen')
      return
    }

    openOverlays(frames)
  } catch (error) {
    console.error('[clipper] capture failed', error)
    notify('Could not read the screen')
    reset()
  } finally {
    starting = false
  }
}

export function selectRegion(displayId: number, region: Rectangle): void {
  closeOverlays()

  const frame = frames.find((candidate) => candidate.displayId === displayId)
  if (!frame) return cancelClip()

  const cropped = cropFrame(frame, region)
  if (!cropped) return cancelClip()

  draft = cropped
  frames = []

  const size = cropped.getSize()
  pendingDraft = {
    dataUrl: cropped.toDataURL(),
    width: size.width,
    height: size.height,
    ...(source ? { source } : {})
  }

  openClipForm(pendingDraft)
}

export async function commitClip(caption: string): Promise<void> {
  const image = draft
  const attribution = source
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
  frames = []
  draft = null
  pendingDraft = null
  source = undefined
}

function notify(body: string): void {
  if (!Notification.isSupported()) return
  new Notification({ title: APP_NAME, body, silent: true }).show()
}
