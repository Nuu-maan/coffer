import { readFile, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'
import { emptyStore, type Settings, type Store } from '@shared/types/item'
import { STORE_FILE } from '@shared/constants'
import { atomicWriteJson } from './atomic-write'
import { migrate } from './migrations'

const SAVE_DEBOUNCE_MS = 250

let state: Store = emptyStore(process.platform)
let saveTimer: NodeJS.Timeout | null = null
let pendingSave: Promise<void> = Promise.resolve()

function storePath(): string {
  return join(app.getPath('userData'), STORE_FILE)
}

/* Whether the store in memory is the truth or a fallback. A missing file is a
   fresh install; a present but unreadable one still holds the user's items, so
   nothing may be reclaimed — or written over it — on the strength of a list we
   failed to read. */
let intact = true
let writable = true

export function storeIntact(): boolean {
  return intact
}

export async function loadStore(): Promise<Store> {
  let parsed: unknown
  try {
    parsed = JSON.parse(await readFile(storePath(), 'utf8'))
  } catch (error) {
    state = emptyStore(process.platform)
    intact = (error as NodeJS.ErrnoException).code === 'ENOENT'
    if (!intact) await setAside(error)
    return state
  }

  state = migrate(parsed)
  const rawItems = (parsed as { items?: unknown }).items
  intact = !Array.isArray(rawItems) || rawItems.length === state.items.length
  return state
}

async function setAside(error: unknown): Promise<void> {
  const backup = `${storePath()}.unreadable-${Date.now()}`
  try {
    await rename(storePath(), backup)
    console.error(`[store] could not read the store; the file is kept at ${backup}`, error)
  } catch {
    writable = false
    console.error('[store] could not read or move the store; nothing will be saved this session', error)
  }
}

export function getStore(): Store {
  return state
}

export function mutate(updater: (draft: Store) => void): Store {
  const draft = structuredClone(state)
  updater(draft)
  state = draft
  scheduleSave()
  return state
}

export function setSettings(patch: Partial<Settings>): Settings {
  return mutate((draft) => {
    draft.settings = { ...draft.settings, ...patch }
  }).settings
}

function save(): Promise<void> {
  if (!writable) return Promise.resolve()
  pendingSave = pendingSave
    .catch(() => undefined)
    .then(() => atomicWriteJson(storePath(), state))
  return pendingSave
}

function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    save().catch((error) => console.error('[store] save failed', error))
  }, SAVE_DEBOUNCE_MS)
}

export async function flushStore(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
    await save()
    return
  }
  await pendingSave
}
