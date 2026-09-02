import { readFile } from 'node:fs/promises'
import { clipboard, nativeImage } from 'electron'
import { isTextItem } from '@shared/types/item'
import { getStore } from '@main/store/store'
import { resolveImage } from '@main/features/images/store'

export async function writeImageToClipboard(file: string, caption?: string): Promise<boolean> {
  const path = resolveImage(file)
  if (!path) return false
  try {
    const image = nativeImage.createFromBuffer(await readFile(path))
    const text = caption?.trim()
    if (text) clipboard.write({ image, text })
    else clipboard.writeImage(image)
    return true
  } catch {
    return false
  }
}

export async function copyItem(id: string): Promise<boolean> {
  const item = getStore().items.find((candidate) => candidate.id === id)
  if (!item) return false
  if (isTextItem(item)) {
    clipboard.writeText(item.text)
    return true
  }
  return writeImageToClipboard(item.file, item.caption)
}
