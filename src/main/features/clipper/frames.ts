import { screen, type NativeImage } from 'electron'
import { draftUrl, frameUrl } from '@shared/constants'
import type { OverlayFrame } from '@shared/ipc/contract'
import type { DisplayFrame } from './capture'

const JPEG_QUALITY = 92

let frames: DisplayFrame[] = []
let encoded = new Map<number, Buffer>()
let draftBuffer: Buffer | null = null
let token = 0

export function setFrames(next: DisplayFrame[]): void {
  frames = next
  encoded = new Map()
  token += 1
}

export function clearFrames(): void {
  frames = []
  encoded = new Map()
}

export function setDraft(image: NativeImage): string {
  token += 1
  draftBuffer = image.toPNG()
  return draftUrl(token)
}

export function clearDraft(): void {
  draftBuffer = null
}

export function draftBytes(): Buffer | null {
  return draftBuffer
}

export function frameCount(): number {
  return frames.length
}

export function displayFrame(displayId: number): DisplayFrame | undefined {
  return frames.find((frame) => frame.displayId === displayId)
}

export function frameFor(displayId: number): OverlayFrame | null {
  const frame = displayFrame(displayId)
  if (!frame) return null

  const size = frame.image.getSize()
  const display = screen.getAllDisplays().find((candidate) => candidate.id === displayId)

  return {
    url: frameUrl(displayId, token),
    width: size.width,
    height: size.height,
    /* The measured ratio wins over the display's reported scale factor,
       because the crop is taken at the measured one. The two agree on Windows
       and on X11; on macOS they do not, since the capture is sized by fitting
       the display's aspect ratio into the requested box and a scaled HiDPI
       mode gives a non-integer result. Laying the frozen frame out at one
       scale and cropping it at another offsets the result from the rectangle
       the user actually drew. */
    scaleFactor:
      frame.bounds.width > 0 ? size.width / frame.bounds.width : (display?.scaleFactor ?? 1)
  }
}

export function frameBytes(displayId: number): Buffer | null {
  const cached = encoded.get(displayId)
  if (cached) return cached

  const frame = displayFrame(displayId)
  if (!frame) return null

  const bytes = frame.image.toJPEG(JPEG_QUALITY)
  encoded.set(displayId, bytes)
  return bytes
}
