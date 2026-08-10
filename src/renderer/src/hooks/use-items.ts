import { useCallback, useEffect, useState } from 'react'
import type { Item } from '@shared/types/item'
import { coffer } from '@/lib/ipc'

export function useItems(): {
  items: Item[]
  addText: (text: string) => void
  addImage: (data: Uint8Array) => Promise<void>
  toggle: (id: string) => void
  update: (id: string, text: string) => void
  remove: (id: string) => void
  clearDone: () => void
  move: (id: string, beforeId: string | null, afterId: string | null) => void
} {
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    void coffer.items.list().then(setItems)
    return coffer.on.itemsChanged(setItems)
  }, [])

  return {
    items,
    addText: useCallback((text: string) => void coffer.items.add({ text }).then(setItems), []),
    addImage: useCallback(async (data: Uint8Array) => {
      setItems(await coffer.items.addImage({ data }))
    }, []),
    toggle: useCallback((id: string) => void coffer.items.toggle(id).then(setItems), []),
    update: useCallback(
      (id: string, text: string) => void coffer.items.update(id, text).then(setItems),
      []
    ),
    remove: useCallback((id: string) => void coffer.items.remove(id).then(setItems), []),
    clearDone: useCallback(() => void coffer.items.clearDone().then(setItems), []),
    move: useCallback(
      (id: string, beforeId: string | null, afterId: string | null) =>
        void coffer.items.reorder({ id, beforeId, afterId }).then(setItems),
      []
    )
  }
}
