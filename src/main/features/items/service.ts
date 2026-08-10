import { nanoid } from 'nanoid'
import type { Item } from '@shared/types/item'
import type { AddItemInput, ReorderInput } from '@shared/ipc/contract'
import { getStore, mutate } from '@main/store/store'
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
      text,
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
  if (!trimmed) return removeItem(id)

  mutate((draft) => {
    const item = draft.items.find((candidate) => candidate.id === id)
    if (item) item.text = trimmed
  })
  return listItems()
}

export function removeItem(id: string): Item[] {
  mutate((draft) => {
    draft.items = draft.items.filter((item) => item.id !== id)
  })
  return listItems()
}

export function clearDone(): Item[] {
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
