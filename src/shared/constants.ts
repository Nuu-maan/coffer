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

/** The window's own title bar. macOS is told this so it can centre the traffic lights in it. */
export const HEADER_HEIGHT = 44

export const MAIN_WIDTH = 460
export const MAIN_HEIGHT = 620
