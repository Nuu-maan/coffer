import { useCallback, useEffect, useState } from 'react'
import type { Item, Section, Snapshot } from '@shared/types/item'
import type { ReorderSectionInput } from '@shared/ipc/contract'
import { coffer } from '@/lib/ipc'

export type ItemsApi = {
  items: Item[]
  sections: Section[]
  addText: (text: string, tag?: string) => void
  addImage: (data: Uint8Array) => Promise<void>
  toggle: (id: string) => void
  update: (id: string, text: string) => void
  remove: (id: string) => void
  removeMany: (ids: string[]) => void
  restore: (ids: string[]) => void
  clearDone: () => void
  move: (id: string, beforeId: string | null, afterId: string | null) => void
  setTag: (id: string, tag: string) => void
  addSection: (name: string) => void
  renameSection: (from: string, to: string) => void
  removeSection: (name: string) => void
  moveSection: (input: ReorderSectionInput) => void
  moveSectionItems: (from: string, to: string) => void
  setSectionDone: (name: string, done: boolean) => void
}

export function useItems(): ItemsApi {
  /* One piece of state, because it arrives as one payload. Splitting it would
     let a render land between the two setters, with an item already filed under
     a caption that is not on screen yet. */
  const [snapshot, setSnapshot] = useState<Snapshot>({ items: [], sections: [] })

  useEffect(() => {
    void coffer.items.list().then(setSnapshot)
    return coffer.on.itemsChanged(setSnapshot)
  }, [])

  return {
    items: snapshot.items,
    sections: snapshot.sections,
    addText: useCallback(
      (text: string, tag?: string) =>
        void coffer.items.add({ text, ...(tag ? { tag } : {}) }).then(setSnapshot),
      []
    ),
    addImage: useCallback(async (data: Uint8Array) => {
      setSnapshot(await coffer.items.addImage({ data }))
    }, []),
    toggle: useCallback((id: string) => void coffer.items.toggle(id).then(setSnapshot), []),
    update: useCallback(
      (id: string, text: string) => void coffer.items.update(id, text).then(setSnapshot),
      []
    ),
    remove: useCallback((id: string) => void coffer.items.remove(id).then(setSnapshot), []),
    removeMany: useCallback((ids: string[]) => {
      void coffer.items.removeMany(ids).then(setSnapshot)
    }, []),
    restore: useCallback((ids: string[]) => {
      void coffer.items.restore(ids).then(setSnapshot)
    }, []),
    clearDone: useCallback(() => void coffer.items.clearDone().then(setSnapshot), []),
    move: useCallback(
      (id: string, beforeId: string | null, afterId: string | null) =>
        void coffer.items.reorder({ id, beforeId, afterId }).then(setSnapshot),
      []
    ),
    setTag: useCallback((id: string, tag: string) => {
      void coffer.items.setTag(id, tag).then(setSnapshot)
    }, []),
    addSection: useCallback((name: string) => {
      void coffer.sections.add(name).then(setSnapshot)
    }, []),
    renameSection: useCallback((from: string, to: string) => {
      void coffer.sections.rename(from, to).then(setSnapshot)
    }, []),
    removeSection: useCallback((name: string) => {
      void coffer.sections.remove(name).then(setSnapshot)
    }, []),
    moveSection: useCallback((input: ReorderSectionInput) => {
      void coffer.sections.reorder(input).then(setSnapshot)
    }, []),
    moveSectionItems: useCallback((from: string, to: string) => {
      void coffer.sections.moveItems(from, to).then(setSnapshot)
    }, []),
    setSectionDone: useCallback((name: string, done: boolean) => {
      void coffer.sections.setDone(name, done).then(setSnapshot)
    }, [])
  }
}
