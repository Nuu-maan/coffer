import type { NativeImage, Rectangle } from 'electron'
import { isWayland } from '@main/platform/session'
import { captureWithChromium } from './backends/chromium'
import { captureLinux } from './backends/linux'

export type DisplayFrame = {
  displayId: number
  bounds: Rectangle
  image: NativeImage
}

export async function captureDisplays(): Promise<DisplayFrame[]> {
  if (!isWayland()) return captureWithChromium()

  const frames = await captureLinux()
  if (frames.length > 0) return frames

  return captureWithChromium()
}

export function cropFrame(frame: DisplayFrame, region: Rectangle): NativeImage | null {
  const size = frame.image.getSize()
  const scale = size.width / frame.bounds.width

  const rect = {
    x: Math.max(0, Math.round(region.x * scale)),
    y: Math.max(0, Math.round(region.y * scale)),
    width: Math.round(region.width * scale),
    height: Math.round(region.height * scale)
  }

  rect.width = Math.min(rect.width, size.width - rect.x)
  rect.height = Math.min(rect.height, size.height - rect.y)

  if (rect.width < 4 || rect.height < 4) return null

  const cropped = frame.image.crop(rect)
  return cropped.isEmpty() ? null : cropped
}
