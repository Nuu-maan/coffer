export type ItemSource = {
  app: string
  title: string
}

type ItemBase = {
  id: string
  done: boolean
  order: number
  createdAt: number
  source?: ItemSource
}

export type TextItem = ItemBase & {
  kind: 'text'
  text: string
}

export type ImageItem = ItemBase & {
  kind: 'image'
  file: string
  width: number
  height: number
  bytes: number
  caption: string
}

export type Item = TextItem | ImageItem

export function isTextItem(item: Item): item is TextItem {
  return item.kind === 'text'
}

export function isImageItem(item: Item): item is ImageItem {
  return item.kind === 'image'
}

export function itemLabel(item: Item): string {
  return item.kind === 'text' ? item.text : item.caption
}

export type HotkeyMode = 'double-shift' | 'accelerator'

export type SessionKind = 'windows' | 'x11' | 'wayland' | 'unknown'

export type PlatformInfo = {
  platform: string
  session: SessionKind
  supportsDoubleShift: boolean
  supportsLoginItem: boolean
  supportsSourceCapture: boolean
}

export type ThemeChoice = 'system' | 'light' | 'dark'

export type Settings = {
  hotkeyMode: HotkeyMode
  accelerator: string
  clipperAccelerator: string
  doubleTapWindowMs: number
  launchOnLogin: boolean
  alwaysOnTop: boolean
  theme: ThemeChoice
}

export type ClipDraft = {
  dataUrl: string
  width: number
  height: number
  source?: ItemSource
}

export type Store = {
  version: 2
  items: Item[]
  settings: Settings
}

export const DEFAULT_SETTINGS: Settings = {
  hotkeyMode: 'double-shift',
  accelerator: 'Control+Alt+Space',
  clipperAccelerator: 'Control+Shift+Space',
  doubleTapWindowMs: 350,
  launchOnLogin: true,
  alwaysOnTop: false,
  theme: 'system'
}

export const EMPTY_STORE: Store = {
  version: 2,
  items: [],
  settings: DEFAULT_SETTINGS
}
