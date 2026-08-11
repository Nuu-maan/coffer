import { desktopCapturer, screen } from 'electron'
import type { DisplayFrame } from '../capture'

const TIMEOUT_MS = 4000

export async function captureWithChromium(): Promise<DisplayFrame[]> {
  const displays = screen.getAllDisplays()

  const thumbnailSize = displays.reduce(
    (largest, display) => ({
      width: Math.max(largest.width, Math.round(display.size.width * display.scaleFactor)),
      height: Math.max(largest.height, Math.round(display.size.height * display.scaleFactor))
    }),
    { width: 0, height: 0 }
  )

  const sources = await withTimeout(
    desktopCapturer.getSources({ types: ['screen'], thumbnailSize, fetchWindowIcons: false })
  )

  return displays
    .map((display, index) => {
      const matched =
        sources.find((source) => source.display_id === String(display.id)) ?? sources[index]
      if (!matched || matched.thumbnail.isEmpty()) return null

      return { displayId: display.id, bounds: display.bounds, image: matched.thumbnail }
    })
    .filter((frame): frame is DisplayFrame => frame !== null)
}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) =>
      setTimeout(() => reject(new Error('desktopCapturer timed out')), TIMEOUT_MS)
    )
  ])
}
