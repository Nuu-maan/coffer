import { nanoid } from 'nanoid'
import type { NativeImage } from 'electron'
import type { Item } from '@shared/types/item'
import type { AddImageInput, AddItemInput, ReorderInput } from '@shared/ipc/contract'
import { getStore, mutate } from '@main/store/store'
import { deleteImage, saveImage } from '@main/features/images/store'
import { needsNormalisation, normalise, orderBetween, orderForAppend } from './ordering'

export function listItems(): Item[] {
  return [...getStore().items].sort((a, b) => a.order - b.order)
}

export function addItem(input: AddItemInput): Item[] {
  const text = input.text.trim()
  if (!text) return listItems()

  mutate((draft) => {
    draft.items.push({
      id: nanoid(12),
      kind: 'text',
      text,
      done: false,
      order: orderForAppend(draft.items.map((item) => item.order)),
      createdAt: Date.now(),
      ...(input.source ? { source: input.source } : {})
    })
  })

  return listItems()
}

export async function addImage(
  image: NativeImage,
  input: Omit<AddImageInput, 'data'> = {}
): Promise<Item[]> {
  if (image.isEmpty()) return listItems()

  const id = nanoid(12)
  const stored = await saveImage(id, image)

  mutate((draft) => {
    draft.items.push({
      id,
      kind: 'image',
      ...stored,
      caption: input.caption?.trim() ?? '',
      done: false,
      order: orderForAppend(draft.items.map((item) => item.order)),
      createdAt: Date.now(),
      ...(input.source ? { source: input.source } : {})
    })
  })

  return listItems()
}

export function toggleItem(id: string): Item[] {
  mutate((draft) => {
    const item = draft.items.find((candidate) => candidate.id === id)
    if (item) item.done = !item.done
  })
  return listItems()
}

export function updateItem(id: string, text: string): Item[] {
  const trimmed = text.trim()
  const target = getStore().items.find((item) => item.id === id)
  if (!target) return listItems()
  if (!trimmed && target.kind === 'text') return removeItem(id)

  mutate((draft) => {
    const item = draft.items.find((candidate) => candidate.id === id)
    if (!item) return
    if (item.kind === 'text') item.text = trimmed
    else item.caption = trimmed
  })
  return listItems()
}

export function removeItem(id: string): Item[] {
  discardFiles(getStore().items.filter((item) => item.id === id))

  mutate((draft) => {
    draft.items = draft.items.filter((item) => item.id !== id)
  })
  return listItems()
}

export function clearDone(): Item[] {
  discardFiles(getStore().items.filter((item) => item.done))

  mutate((draft) => {
    draft.items = draft.items.filter((item) => !item.done)
  })
  return listItems()
}

export function reorderItem({ id, beforeId, afterId }: ReorderInput): Item[] {
  mutate((draft) => {
    const target = draft.items.find((item) => item.id === id)
    if (!target) return

    const before = beforeId ? (draft.items.find((i) => i.id === beforeId)?.order ?? null) : null
    const after = afterId ? (draft.items.find((i) => i.id === afterId)?.order ?? null) : null

    target.order = orderBetween(before, after)

    if (needsNormalisation(before, after)) {
      draft.items = normalise(draft.items)
    }
  })

  return listItems()
}

function discardFiles(items: Item[]): void {
  for (const item of items) {
    if (item.kind === 'image') void deleteImage(item.file)
  }
}
