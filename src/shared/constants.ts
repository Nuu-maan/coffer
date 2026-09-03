export const APP_NAME = 'Coffer'
export const APP_ID = 'com.coffer.app'
export const STORE_FILE = 'store.json'
export const IMAGE_SCHEME = 'coffer'

export function imageUrl(file: string): string {
  return `${IMAGE_SCHEME}://image/${encodeURIComponent(file)}`
}

export function frameUrl(displayId: number, token: number): string {
  return `${IMAGE_SCHEME}://frame/${displayId}?v=${token}`
}

export function draftUrl(token: number): string {
  return `${IMAGE_SCHEME}://draft/current?v=${token}`
}

/*
 * How many pictures one stash can hold.
 *
 * Four, because four is what fits across a card at this window width and still
 * reads as a picture rather than as a swatch — and because a stash is one
 * thought. A run of screenshots long enough to need scrolling inside a row is
 * not one thought, it is a folder, and this panel is not one.
 */
export const MAX_IMAGES = 4

/** The window's own title bar. macOS is told this so it can centre the traffic lights in it. */
export const HEADER_HEIGHT = 44

/*
 * A panel, not a document window. It sits over whatever you were doing, so the
 * less of that it covers the better; at this size a row still fits an image
 * thumbnail with its caption beside the timestamp, and the desktop keeps the
 * rest of the screen. The window is resizable from here — these are only where
 * it opens, and nothing persists a size over them.
 */
export const MAIN_WIDTH = 360
export const MAIN_HEIGHT = 510
