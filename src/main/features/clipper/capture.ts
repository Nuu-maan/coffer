import { desktopCapturer, screen, type NativeImage, type Rectangle } from 'electron'

export type DisplayFrame = {
  displayId: number
  bounds: Rectangle
  image: NativeImage
}

export async function captureDisplays(): Promise<DisplayFrame[]> {
  const displays = screen.getAllDisplays()

  const thumbnailSize = displays.reduce(
    (largest, display) => ({
      width: Math.max(largest.width, Math.round(display.size.width * display.scaleFactor)),
      height: Math.max(largest.height, Math.round(display.size.height * display.scaleFactor))
    }),
    { width: 0, height: 0 }
  )

  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize })

  return displays
    .map((display, index) => {
      const matched =
        sources.find((source) => source.display_id === String(display.id)) ?? sources[index]
      if (!matched || matched.thumbnail.isEmpty()) return null

      return { displayId: display.id, bounds: display.bounds, image: matched.thumbnail }
    })
    .filter((frame): frame is DisplayFrame => frame !== null)
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
