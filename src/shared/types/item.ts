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
  /*
   * The section this stash is filed under: the section's own name, matched
   * case-insensitively. A name rather than an id because the name is what the
   * user typed and what they see — an id would buy a free rename and cost a
   * store nobody could read.
   *
   * Absent, rather than '', on an item the user has not filed. Absent is also
   * what an item gets when its section is deleted; sections and items are kept
   * in step by [[Store]]'s own writers rather than by either side alone.
   */
  tag?: string
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

/** What a tag is stored as: trimmed, collapsed, and never ''. */
export function normaliseTag(raw: string): string | undefined {
  const tag = raw.trim().replace(/\s+/g, ' ')
  return tag.length > 0 ? tag : undefined
}

/* Case-insensitively, so "Research" and "research" are one section rather than
   two that look identical in a list of captions. */
export function sameTag(a: string | undefined, b: string | undefined): boolean {
  return (a ?? '').toLocaleLowerCase() === (b ?? '').toLocaleLowerCase()
}

/*
 * A section, stored in its own right rather than derived from the items in it.
 *
 * It used to be derived: the sections were `new Set(items.map(i => i.tag))` and
 * a section sat wherever its first member did. That is the smaller model and it
 * held for as long as a section was only ever a side effect of filing a stash.
 * It cannot express the two things asked of a section now — an empty one, made
 * before there is anything to put in it, and an order of its own, so a section
 * can be dragged past another without its items having to be renumbered to say
 * so.
 *
 * The name is still the identity an item's `tag` points at, matched
 * case-insensitively. Renaming rewrites both sides in one go.
 */
export type Section = {
  name: string
  order: number
}

/** What every mutation hands back: the list, and the sections it is cut into. */
export type Snapshot = {
  items: Item[]
  sections: Section[]
}

export type HotkeyMode = 'double-shift' | 'accelerator'

export type SessionKind = 'windows' | 'macos' | 'x11' | 'wayland' | 'unknown'

export type PlatformInfo = {
  platform: string
  session: SessionKind
  /** XDG_CURRENT_DESKTOP, lowercased. '' anywhere it is not reported. */
  desktop: string
  /** How to invoke Coffer again, for users who bind a command instead. */
  executable: string
  supportsDoubleShift: boolean
  supportsAccelerators: boolean
  supportsLoginItem: boolean
  supportsSourceCapture: boolean
}

/** A shortcut the desktop portal has accepted, as the compositor names it. */
export type PortalShortcut = {
  id: string
  description: string
  /** What the shortcut is bound to, or '' when the user has not bound it yet. */
  trigger: string
}

export type HotkeyStatus = {
  mode: 'double-shift' | 'accelerator' | 'portal' | 'none'
  /** Set when the accelerator could not be claimed, or the portal turned us down. */
  error: string | null
  portalShortcuts: PortalShortcut[]
}

/** What macOS has been asked for, and what it said. Everywhere else: granted. */
export type PermissionKind = 'accessibility' | 'screen'

export type ScreenAccess = 'granted' | 'denied' | 'restricted' | 'not-determined' | 'unknown'

export type Permissions = {
  /** False only on macOS, and only until the user grants it. */
  accessibility: boolean
  screen: ScreenAccess
  needsRestart: boolean
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
  url: string
  width: number
  height: number
  source?: ItemSource
}

export type Store = {
  version: 3
  items: Item[]
  sections: Section[]
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

/*
 * Electron's Control is the Control key itself, not ⌘, so the defaults above
 * reach macOS as ^⌥Space and ^⇧Space — and ^Space and ^⌥Space are how macOS
 * switches input source out of the box, enabled on a clean install. Registering
 * over them fails silently, which reads as the feature being broken.
 *
 * Control+Command is the one prefix macOS leaves almost entirely alone; it
 * reserves ^⌘Space for the Character Viewer, ^⌘F for full screen, ^⌘Q for the
 * lock screen and ^⌘D for looking a word up, and none of those are these.
 */
const MAC_SETTINGS: Partial<Settings> = {
  accelerator: 'Control+Command+S',
  clipperAccelerator: 'Control+Command+R'
}

/* Takes the platform rather than reading it, so this module stays loadable in
   the renderer, where there is no process to ask. */
export function defaultSettings(platform: string): Settings {
  return platform === 'darwin' ? { ...DEFAULT_SETTINGS, ...MAC_SETTINGS } : DEFAULT_SETTINGS
}

export function emptyStore(platform: string): Store {
  return { version: 3, items: [], sections: [], settings: defaultSettings(platform) }
}
