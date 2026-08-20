import { defaultSettings, emptyStore, type Item, type Store } from '@shared/types/item'

export function migrate(raw: unknown): Store {
  if (!isRecord(raw)) return emptyStore(process.platform)

  const items = Array.isArray(raw.items)
    ? raw.items.map(toItem).filter((item): item is Item => item !== null)
    : []
  const settings = isRecord(raw.settings) ? raw.settings : {}

  return {
    version: 2,
    items,
    settings: { ...defaultSettings(process.platform), ...settings }
  }
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
    ...(isSource(value.source) ? { source: value.source } : {})
  }

  if (value.kind === 'image') {
    if (typeof value.file !== 'string' || !value.file) return null
    return {
      ...base,
      kind: 'image',
      file: value.file,
      width: typeof value.width === 'number' ? value.width : 0,
      height: typeof value.height === 'number' ? value.height : 0,
      bytes: typeof value.bytes === 'number' ? value.bytes : 0,
      caption: typeof value.caption === 'string' ? value.caption : ''
    }
  }

  if (typeof value.text !== 'string') return null
  return { ...base, kind: 'text', text: value.text }
}

function isSource(value: unknown): value is { app: string; title: string } {
  return isRecord(value) && typeof value.app === 'string' && typeof value.title === 'string'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
