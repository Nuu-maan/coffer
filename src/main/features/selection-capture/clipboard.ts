import { clipboard, nativeImage, type NativeImage } from 'electron'
import type { Capture } from './types'

export type ClipboardType = 'clipboard' | 'selection'

export function readClipboard(type: ClipboardType): Capture {
  const image = safeReadImage(type)
  if (image && !image.isEmpty()) return { ok: true, kind: 'image', image }

  const text = safeReadText(type).trim()
  if (text) return { ok: true, kind: 'text', text }

  return { ok: false, reason: 'empty' }
}

export function safeReadText(type: ClipboardType): string {
  try {
    return clipboard.readText(type)
  } catch {
    return ''
  }
}

export function safeReadImage(type: ClipboardType): NativeImage | null {
  try {
    return clipboard.readImage(type)
  } catch {
    return null
  }
}

export type Snapshot = {
  text: string
  image: NativeImage | null
}

export function snapshotClipboard(): Snapshot {
  const image = safeReadImage('clipboard')
  return {
    text: safeReadText('clipboard'),
    image: image && !image.isEmpty() ? image : null
  }
}

export function restoreClipboard(snapshot: Snapshot): void {
  try {
    if (snapshot.image) clipboard.writeImage(snapshot.image)
    else if (snapshot.text) clipboard.writeText(snapshot.text)
    else clipboard.clear()
  } catch {
    return
  }
}

export function writeImageFromBuffer(buffer: Buffer): void {
  clipboard.writeImage(nativeImage.createFromBuffer(buffer))
}
