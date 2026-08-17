import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises'
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

/*
 * A PNG is written before the item that points at it is saved, so a crash in
 * between leaves a file nothing refers to. Nothing ever went looking for those
 * again, which made the folder a one-way ratchet. Only names this module could
 * have written are considered, and only the ones no item claims.
 */
export async function pruneOrphans(keep: ReadonlySet<string>): Promise<number> {
  let files: string[]
  try {
    files = await readdir(imagesDir())
  } catch {
    return 0
  }

  const orphans = files.filter((file) => FILE_PATTERN.test(file) && !keep.has(file))
  await Promise.all(orphans.map((file) => deleteImage(file)))
  return orphans.length
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
