import { desktopCapturer, screen } from 'electron'
import type { DisplayFrame } from '../capture'

const TIMEOUT_MS = 4000

/*
 * Electron rejects with this exact string when Chromium's own
 * CGRequestScreenCaptureAccess comes back false, which is the only signal that
 * a macOS refusal is what went wrong rather than anything else.
 */
const MAC_REFUSAL = 'Failed to get sources'

export class ScreenPermissionError extends Error {
  constructor() {
    super('Screen Recording access has not been granted')
    this.name = 'ScreenPermissionError'
  }
}

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
  ).catch((error: unknown) => {
    if (process.platform === 'darwin' && String(error).includes(MAC_REFUSAL)) {
      throw new ScreenPermissionError()
    }
    throw error
  })

  return displays
    .map((display, index) => {
      const matched =
        sources.find((source) => source.display_id === String(display.id)) ?? sources[index]
      /* The empty check is the only defence on macOS's older capture path,
         which answers a refused caller with the desktop picture instead of an
         error. A wallpaper frame is indistinguishable from a real one, but an
         empty one is not, and that is the case this catches. */
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
