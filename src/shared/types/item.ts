export type ItemSource = {
  app: string
  title: string
}

export type Item = {
  id: string
  text: string
  done: boolean
  order: number
  createdAt: number
  source?: ItemSource
}

export type HotkeyMode = 'double-shift' | 'accelerator'

export type Settings = {
  hotkeyMode: HotkeyMode
  accelerator: string
  doubleTapWindowMs: number
  launchOnLogin: boolean
  theme: 'system' | 'light' | 'dark'
}

export type Store = {
  version: 1
  items: Item[]
  settings: Settings
}

export const DEFAULT_SETTINGS: Settings = {
  hotkeyMode: 'double-shift',
  accelerator: 'Control+Shift+Space',
  doubleTapWindowMs: 350,
  launchOnLogin: true,
  theme: 'system'
}

export const EMPTY_STORE: Store = {
  version: 1,
  items: [],
  settings: DEFAULT_SETTINGS
}
