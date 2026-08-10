import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'
import { EMPTY_STORE, type Settings, type Store } from '@shared/types/item'
import { STORE_FILE } from '@shared/constants'
import { atomicWriteJson } from './atomic-write'
import { migrate } from './migrations'

const SAVE_DEBOUNCE_MS = 250

let state: Store = structuredClone(EMPTY_STORE)
let saveTimer: NodeJS.Timeout | null = null
let pendingSave: Promise<void> = Promise.resolve()

function storePath(): string {
  return join(app.getPath('userData'), STORE_FILE)
}

export async function loadStore(): Promise<Store> {
  try {
    const raw = await readFile(storePath(), 'utf8')
    state = migrate(JSON.parse(raw))
  } catch {
    state = structuredClone(EMPTY_STORE)
  }
  return state
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

function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    pendingSave = atomicWriteJson(storePath(), state).catch((error) => {
      console.error('[store] save failed', error)
    })
  }, SAVE_DEBOUNCE_MS)
}

export async function flushStore(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
    pendingSave = atomicWriteJson(storePath(), state)
  }
  await pendingSave
}
