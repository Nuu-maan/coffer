import { nanoid } from 'nanoid'
import type { NativeImage } from 'electron'
import {
  normaliseTag,
  sameTag,
  type Item,
  type Section,
  type Snapshot,
  type Store
} from '@shared/types/item'
import type {
  AddImageInput,
  AddItemInput,
  ReorderInput,
  ReorderSectionInput
} from '@shared/ipc/contract'
import { getStore, mutate } from '@main/store/store'
import { deleteImage, saveImage } from '@main/features/images/store'
import { needsNormalisation, normalise, orderBetween, orderForAppend } from './ordering'

export function listItems(): Item[] {
  return [...getStore().items].sort((a, b) => a.order - b.order)
}

export function listSections(): Section[] {
  return [...getStore().sections].sort((a, b) => a.order - b.order)
}

/* Both halves together, because every caller needs both: a rename touches the
   items and the section list, and filing a stash under a name nobody has used
   yet creates a section as a side effect. Handing back one and leaving the
   renderer to ask for the other is how the two get to disagree. */
export function snapshot(): Snapshot {
  return { items: listItems(), sections: listSections() }
}

export function addItem(input: AddItemInput): Snapshot {
  const text = input.text.trim()
  if (!text) return snapshot()

  /* Filed on the way in rather than added and then moved. Two steps would put a
     card in the unfiled run for one frame and then jump it to its section,
     which is a flicker for anyone who typed it into that section on purpose. */
  const tag = normaliseTag(input.tag ?? '')

  mutate((draft) => {
    if (tag) ensureSection(draft, tag)
    draft.items.push({
      id: nanoid(12),
      kind: 'text',
      text,
      done: false,
      order: orderForAppend(draft.items.map((item) => item.order)),
      createdAt: Date.now(),
      ...(input.source ? { source: input.source } : {}),
      ...(tag ? { tag } : {})
    })
  })

  return snapshot()
}

export async function addImage(
  image: NativeImage,
  input: Omit<AddImageInput, 'data'> = {}
): Promise<Snapshot> {
  if (image.isEmpty()) return snapshot()

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

  return snapshot()
}

export function toggleItem(id: string): Snapshot {
  mutate((draft) => {
    const item = draft.items.find((candidate) => candidate.id === id)
    if (item) item.done = !item.done
  })
  return snapshot()
}

export function setItemDone(id: string, done: boolean): Snapshot {
  mutate((draft) => {
    const item = draft.items.find((candidate) => candidate.id === id)
    if (item) item.done = done
  })
  return snapshot()
}

export function updateItem(id: string, text: string): Snapshot {
  const trimmed = text.trim()
  const target = getStore().items.find((item) => item.id === id)
  if (!target) return snapshot()
  if (!trimmed && target.kind === 'text') return removeItem(id)

  mutate((draft) => {
    const item = draft.items.find((candidate) => candidate.id === id)
    if (!item) return
    if (item.kind === 'text') item.text = trimmed
    else item.caption = trimmed
  })
  return snapshot()
}

/*
 * Deleting is undoable, so it does not delete.
 *
 * A removed stash comes off the list and goes on a buffer, with its PNG left
 * where it is; the file is only unlinked once the stash has been pushed off the
 * end of that buffer by later deletions, at which point no offer of undo is
 * still standing. Backspace with five rows picked used to be five stashes and
 * five files gone with nothing between the keypress and the loss.
 *
 * In memory rather than in the store, and gone when the process is: an undo is
 * an offer made in one sitting, not a bin to be emptied later. What that leaves
 * behind is a PNG no item claims, which is exactly what pruneOrphans sweeps on
 * the next boot.
 */
const UNDO_DEPTH = 50
let undoBuffer: Item[] = []

/** How many stashes the last delete could put back. 0 when there is nothing. */
export function undoDepth(): number {
  return undoBuffer.length
}

export function removeItems(ids: readonly string[]): Snapshot {
  const wanted = new Set(ids)
  const removed = getStore().items.filter((item) => wanted.has(item.id))
  if (removed.length === 0) return snapshot()

  mutate((draft) => {
    draft.items = draft.items.filter((item) => !wanted.has(item.id))
  })

  undoBuffer = [...removed, ...undoBuffer]
  discardFiles(undoBuffer.splice(Math.max(UNDO_DEPTH, removed.length)))
  return snapshot()
}

export function removeItem(id: string): Snapshot {
  return removeItems([id])
}

/*
 * Puts specific stashes back, named rather than counted.
 *
 * Counted was wrong and quietly so: two deletes leave two undo offers standing,
 * and "put back the last one" answers the newer offer whichever one was
 * clicked. Delete A, delete B, undo A, and A stays gone while B comes back.
 * Naming them means an offer restores what it was offering, however many have
 * been made since.
 *
 * They keep the order they had, so a restored stash returns to the place it was
 * in rather than to the end of the list — and to its own section, since the tag
 * travelled with it.
 */
export function restoreItems(ids: readonly string[]): Snapshot {
  const wanted = new Set(ids)
  const back = undoBuffer.filter((item) => wanted.has(item.id))
  if (back.length === 0) return snapshot()

  undoBuffer = undoBuffer.filter((item) => !wanted.has(item.id))

  mutate((draft) => {
    /* Belt and braces: an id already on the list must not be doubled. */
    const present = new Set(draft.items.map((item) => item.id))
    const returning = back.filter((item) => !present.has(item.id))
    draft.items.push(...returning)
    for (const item of returning) if (item.tag) ensureSection(draft, item.tag)
  })
  return snapshot()
}

/*
 * Filing an item, and unfiling it: `tag` is dropped rather than set to '' so
 * that "has no tag" is one state in the store rather than two.
 *
 * Filing under a name no section has yet creates the section, at the end. That
 * is the path the row's own "New section…" takes, and it is the reason a
 * section can still come into being without anyone visiting the + menu.
 */
export function setTag(id: string, raw: string): Snapshot {
  const tag = normaliseTag(raw)

  mutate((draft) => {
    const item = draft.items.find((candidate) => candidate.id === id)
    if (!item) return
    if (tag) {
      item.tag = tag
      ensureSection(draft, tag)
    } else {
      delete item.tag
    }
  })
  return snapshot()
}

/** Every item in `from`, filed under `to` in one go. '' unfiles them all. */
export function moveSectionItems(from: string, to: string): Snapshot {
  const tag = normaliseTag(to)

  mutate((draft) => {
    if (tag) ensureSection(draft, tag)
    for (const item of draft.items) {
      if (!sameTag(item.tag, from)) continue
      if (tag) item.tag = tag
      else delete item.tag
    }
  })
  return snapshot()
}

/** Ticks — or unticks — a whole section at once, rather than a row at a time. */
export function setSectionDone(name: string, done: boolean): Snapshot {
  mutate((draft) => {
    for (const item of draft.items) {
      if (sameTag(item.tag, name)) item.done = done
    }
  })
  return snapshot()
}

/*
 * A section made before there is anything to put in it, which is what the +
 * menu's "New section" does. Named the same as an existing one, it is that
 * one — sections are matched case-insensitively, and two captions spelled the
 * same is not a state worth being able to reach.
 */
export function addSection(raw: string): Snapshot {
  const name = normaliseTag(raw)
  if (!name) return snapshot()

  mutate((draft) => ensureSection(draft, name))
  return snapshot()
}

/*
 * Renaming, which is a rewrite of the section and of every item pointing at it.
 * Renaming to nothing deletes the section and unfiles its items, which is the
 * only way a section is removed.
 *
 * Matched case-insensitively but written back exactly as given, so correcting
 * "research" to "Research" is a rename rather than a no-op. Renaming onto a
 * name already in use merges the two: one caption, both sets of items, and the
 * position of the one being renamed into.
 */
export function renameTag(from: string, to: string): Snapshot {
  const next = normaliseTag(to)

  mutate((draft) => {
    for (const item of draft.items) {
      if (!sameTag(item.tag, from)) continue
      if (next) item.tag = next
      else delete item.tag
    }

    const target = draft.sections.find((section) => sameTag(section.name, from))
    if (!target) {
      if (next) ensureSection(draft, next)
      return
    }

    if (!next) {
      draft.sections = draft.sections.filter((section) => section !== target)
      return
    }

    const merging = draft.sections.find(
      (section) => section !== target && sameTag(section.name, next)
    )
    if (merging) {
      draft.sections = draft.sections.filter((section) => section !== target)
      merging.name = next
    } else {
      target.name = next
    }
  })
  return snapshot()
}

export function removeSection(name: string): Snapshot {
  return renameTag(name, '')
}

/*
 * Dragging a caption past another one. Only the section list is renumbered —
 * the items keep the order they were in, because their order says where they
 * sit inside their own section and nothing about where the section sits.
 */
export function reorderSection({ name, beforeName, afterName }: ReorderSectionInput): Snapshot {
  mutate((draft) => {
    const target = draft.sections.find((section) => sameTag(section.name, name))
    if (!target) return

    const orderOf = (other: string | null): number | null => {
      if (!other) return null
      return draft.sections.find((section) => sameTag(section.name, other))?.order ?? null
    }

    const before = orderOf(beforeName)
    const after = orderOf(afterName)
    target.order = orderBetween(before, after)

    if (needsNormalisation(before, after)) draft.sections = normalise(draft.sections)
  })

  return snapshot()
}

/** Through the same buffer, because clearing the done items is a delete. */
export function clearDone(): Snapshot {
  return removeItems(getStore().items.filter((item) => item.done).map((item) => item.id))
}

export function reorderItem({ id, beforeId, afterId }: ReorderInput): Snapshot {
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

  return snapshot()
}

/** Idempotent, and the only place a section is born. */
function ensureSection(draft: Store, name: string): void {
  if (draft.sections.some((section) => sameTag(section.name, name))) return
  draft.sections.push({
    name,
    order: orderForAppend(draft.sections.map((section) => section.order))
  })
}

function discardFiles(items: Item[]): void {
  for (const item of items) {
    if (item.kind === 'image') void deleteImage(item.file)
  }
}
