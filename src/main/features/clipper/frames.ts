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
    scaleFactor: display?.scaleFactor ?? size.width / frame.bounds.width
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
