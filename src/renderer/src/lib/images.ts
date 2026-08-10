const MAX_BYTES = 12 * 1024 * 1024

export function imageFilesFrom(transfer: DataTransfer | null): File[] {
  if (!transfer) return []

  const fromItems = Array.from(transfer.items)
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null)

  if (fromItems.length > 0) return fromItems

  return Array.from(transfer.files).filter((file) => file.type.startsWith('image/'))
}

export function hasImage(transfer: DataTransfer | null): boolean {
  if (!transfer) return false
  return Array.from(transfer.items).some(
    (item) => item.kind === 'file' && item.type.startsWith('image/')
  )
}

export async function toBytes(file: File): Promise<Uint8Array | null> {
  if (file.size > MAX_BYTES) return null
  return new Uint8Array(await file.arrayBuffer())
}
