import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app, type NativeImage } from 'electron'

const FILE_PATTERN = /^[A-Za-z0-9_-]+\.png$/

export type StoredImage = {
  file: string
  width: number
  height: number
  bytes: number
}

export function imagesDir(): string {
  return join(app.getPath('userData'), 'images')
}

export function resolveImage(file: string): string | null {
  if (!FILE_PATTERN.test(file)) return null
  return join(imagesDir(), file)
}

export async function saveImage(id: string, image: NativeImage): Promise<StoredImage> {
  const buffer = image.toPNG()
  const size = image.getSize()
  const file = `${id}.png`

  await mkdir(imagesDir(), { recursive: true })
  await writeFile(join(imagesDir(), file), buffer)

  return { file, width: size.width, height: size.height, bytes: buffer.byteLength }
}

export async function deleteImage(file: string): Promise<void> {
  const path = resolveImage(file)
  if (!path) return
  try {
    await unlink(path)
  } catch {
    return
  }
}
