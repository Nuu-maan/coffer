export const APP_NAME = 'Coffer'
export const APP_ID = 'com.coffer.app'
export const STORE_FILE = 'store.json'
export const IMAGE_SCHEME = 'coffer'

export function imageUrl(file: string): string {
  return `${IMAGE_SCHEME}://image/${encodeURIComponent(file)}`
}

export const MAIN_WIDTH = 460
export const MAIN_HEIGHT = 620
