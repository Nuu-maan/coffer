import type {
  ClipDraft,
  HotkeyStatus,
  ItemSource,
  PermissionKind,
  Permissions,
  PlatformInfo,
  Settings,
  Snapshot
} from '../types/item'

export type OverlayFrame = {
  url: string
  width: number
  height: number
  scaleFactor: number
}

export type ClipRegion = {
  x: number
  y: number
  width: number
  height: number
}

export type AddItemInput = {
  text: string
  source?: ItemSource
  /** Files it as it is created, and makes the section if it does not exist. */
  tag?: string
}

export type AddImageInput = {
  data: Uint8Array
  caption?: string
  source?: ItemSource
}

export type ReorderInput = {
  id: string
  beforeId: string | null
  afterId: string | null
}

/* The same shape a row's reorder takes, addressed by name — a section has no id
   because its name is its identity. */
export type ReorderSectionInput = {
  name: string
  beforeName: string | null
  afterName: string | null
}

export type Unsubscribe = () => void

export interface CofferApi {
  items: {
    list(): Promise<Snapshot>
    add(input: AddItemInput): Promise<Snapshot>
    addImage(input: AddImageInput): Promise<Snapshot>
    toggle(id: string): Promise<Snapshot>
    update(id: string, text: string): Promise<Snapshot>
    remove(id: string): Promise<Snapshot>
    removeMany(ids: string[]): Promise<Snapshot>
    /** Puts named deleted stashes back. Held in memory, so the offer does not
        survive a restart. */
    restore(ids: string[]): Promise<Snapshot>
    reorder(input: ReorderInput): Promise<Snapshot>
    clearDone(): Promise<Snapshot>
    /** '' unfiles the item. Filing under an unknown name creates that section. */
    setTag(id: string, tag: string): Promise<Snapshot>
  }
  sections: {
    /** Creates an empty section. Naming an existing one is a no-op. */
    add(name: string): Promise<Snapshot>
    /** '' unfiles every item under `from` and deletes the section. */
    rename(from: string, to: string): Promise<Snapshot>
    remove(name: string): Promise<Snapshot>
    reorder(input: ReorderSectionInput): Promise<Snapshot>
    /** Every item under `from`, filed under `to` at once. '' unfiles them. */
    moveItems(from: string, to: string): Promise<Snapshot>
    /** Ticks or unticks the whole section. */
    setDone(name: string, done: boolean): Promise<Snapshot>
  }
  clipboard: {
    read(): Promise<string>
    write(text: string): Promise<void>
    writeImage(file: string, text?: string): Promise<boolean>
  }
  stash: {
    selection(): Promise<void>
  }
  clipper: {
    start(): Promise<void>
    draft(): Promise<ClipDraft | null>
    mounted(): void
    painted(): void
    region(region: ClipRegion): void
    cancel(): void
    commit(caption: string): Promise<void>
  }
  platform: {
    info(): Promise<PlatformInfo>
  }
  permissions: {
    status(): Promise<Permissions>
    /* Raises the system's own prompt where there is one, then opens the
       Privacy pane if the answer is still no. */
    request(kind: PermissionKind): Promise<Permissions>
  }
  hotkeys: {
    status(): Promise<HotkeyStatus>
  }
  settings: {
    get(): Promise<Settings>
    set(patch: Partial<Settings>): Promise<Settings>
  }
  window: {
    openMain(): void
    minimize(): void
    hideMain(): void
  }
  on: {
    clipperFrame(callback: (frame: OverlayFrame) => void): Unsubscribe
    itemsChanged(callback: (snapshot: Snapshot) => void): Unsubscribe
    settingsChanged(callback: (settings: Settings) => void): Unsubscribe
    hotkeyStatus(callback: (status: HotkeyStatus) => void): Unsubscribe
    permissionsChanged(callback: (permissions: Permissions) => void): Unsubscribe
    showSettings(callback: () => void): Unsubscribe
  }
}
