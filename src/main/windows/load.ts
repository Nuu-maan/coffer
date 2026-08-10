import { join } from 'node:path'
import type { BrowserWindow } from 'electron'
import { is } from '@electron-toolkit/utils'

export function preloadPath(): string {
  return join(__dirname, '../preload/index.mjs')
}

export function loadPage(window: BrowserWindow, page: string): void {
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/${page}`)
    return
  }
  void window.loadFile(join(__dirname, `../renderer/${page}`))
}
