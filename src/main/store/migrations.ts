import {
  defaultSettings,
  emptyStore,
  normaliseTag,
  type Item,
  type Section,
  type StashedImage,
  type Store
} from '@shared/types/item'

const ORDER_STEP = 1000

export function migrate(raw: unknown): Store {
  if (!isRecord(raw)) return emptyStore(process.platform)

  const items = Array.isArray(raw.items)
    ? raw.items.map(toItem).filter((item): item is Item => item !== null)
    : []
  const settings = isRecord(raw.settings) ? raw.settings : {}
  delete settings['windowRadius']

  return {
    version: 3,
    items,
    sections: toSections(raw.sections, items),
    settings: { ...defaultSettings(process.platform), ...settings }
  }
}

/*
 * v2 → v3. A section had no record of its own there: it existed for as long as
 * an item carried its name, and it sat wherever its first member did. Both of
 * those are recovered by walking the items in order — every tag encountered
 * becomes a section, in the order it was first seen, which is exactly where the
 * caption used to be drawn.
 *
 * Read the same way on every load rather than only when the version differs, so
 * a tag written by a build that did not know about the section list — or one
 * left behind by a store that was edited by hand — is adopted rather than
 * losing its caption.
 */
function toSections(raw: unknown, items: Item[]): Section[] {
  const found: Section[] = []
  const seen = new Set<string>()

  function claim(name: string | undefined, order: number | undefined): void {
    const clean = name === undefined ? undefined : normaliseTag(name)
    if (!clean) return
    const key = clean.toLocaleLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    found.push({ name: clean, order: typeof order === 'number' ? order : Number.NaN })
  }

  if (Array.isArray(raw)) {
    for (const value of raw) {
      if (!isRecord(value) || typeof value.name !== 'string') continue
      claim(value.name, typeof value.order === 'number' ? value.order : undefined)
    }
  }

  for (const item of [...items].sort((a, b) => a.order - b.order)) claim(item.tag, undefined)

  /* Sorted on what was stored, then renumbered — a section adopted from an item
     has no order of its own, and NaN sorts last, which is where a section
     nobody has placed yet belongs. */
  return found
    .sort((a, b) => (Number.isNaN(a.order) ? 1 : Number.isNaN(b.order) ? -1 : a.order - b.order))
    .map((section, index) => ({ name: section.name, order: (index + 1) * ORDER_STEP }))
}

function toItem(value: unknown): Item | null {
  if (!isRecord(value)) return null
  if (
    typeof value.id !== 'string' ||
    typeof value.done !== 'boolean' ||
    typeof value.order !== 'number' ||
    typeof value.createdAt !== 'number'
  ) {
    return null
  }

  const base = {
    id: value.id,
    done: value.done,
    order: value.order,
    createdAt: value.createdAt,
    ...(isSource(value.source) ? { source: value.source } : {}),
    /* Optional and additive, so a store written by an older build needs no
       version bump — an item without a tag simply has none. */
    ...(typeof value.tag === 'string' && value.tag.trim() ? { tag: value.tag.trim() } : {})
  }

  if (value.kind === 'image') {
    const images = toImages(value)
    /* No pictures is not a picture stash. The row would draw as a caption with
       a hole where the image goes, which is worse than the row not being there
       — and the only way to reach it is a store that has been damaged. */
    if (images.length === 0) return null
    return {
      ...base,
      kind: 'image',
      images,
      caption: typeof value.caption === 'string' ? value.caption : ''
    }
  }

  if (typeof value.text !== 'string') return null
  return { ...base, kind: 'text', text: value.text }
}

/*
 * Both shapes, read the same way on every load.
 *
 * An image stash used to be one picture, with `file`, `width`, `height` and
 * `bytes` on the item itself; it is now an `images` array. A store written by
 * a build from before that carries the old shape, so the old shape is read as
 * an array of one — which is what it always was.
 *
 * No version bump for it, for the reason the tag needed none: this reads
 * whatever is there rather than what the version claims is there, and a version
 * that has to be right is one more thing that can be wrong.
 */
function toImages(value: Record<string, unknown>): StashedImage[] {
  if (Array.isArray(value.images)) {
    return value.images.map(toImage).filter((image): image is StashedImage => image !== null)
  }
  const only = toImage(value)
  return only ? [only] : []
}

function toImage(value: unknown): StashedImage | null {
  if (!isRecord(value)) return null
  if (typeof value.file !== 'string' || !value.file) return null
  return {
    file: value.file,
    width: typeof value.width === 'number' ? value.width : 0,
    height: typeof value.height === 'number' ? value.height : 0,
    bytes: typeof value.bytes === 'number' ? value.bytes : 0
  }
}

function isSource(value: unknown): value is { app: string; title: string } {
  return isRecord(value) && typeof value.app === 'string' && typeof value.title === 'string'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
