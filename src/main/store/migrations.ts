import { DEFAULT_SETTINGS, EMPTY_STORE, type Item, type Store } from '@shared/types/item'

export function migrate(raw: unknown): Store {
  if (!isRecord(raw)) return { ...EMPTY_STORE, items: [] }

  const items = Array.isArray(raw.items) ? raw.items.filter(isItem) : []
  const settings = isRecord(raw.settings) ? raw.settings : {}

  return {
    version: 1,
    items,
    settings: { ...DEFAULT_SETTINGS, ...settings }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isItem(value: unknown): value is Item {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.text === 'string' &&
    typeof value.done === 'boolean' &&
    typeof value.order === 'number' &&
    typeof value.createdAt === 'number'
  )
}
