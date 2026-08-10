import type { ClipDraft, Item, ItemSource, PlatformInfo, Settings } from '../types/item'

export type OverlayFrame = {
  dataUrl: string
  width: number
  height: number
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

export type Unsubscribe = () => void

export interface CofferApi {
  items: {
    list(): Promise<Item[]>
    add(input: AddItemInput): Promise<Item[]>
    addImage(input: AddImageInput): Promise<Item[]>
    toggle(id: string): Promise<Item[]>
    update(id: string, text: string): Promise<Item[]>
    remove(id: string): Promise<Item[]>
    reorder(input: ReorderInput): Promise<Item[]>
    clearDone(): Promise<Item[]>
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
    frame(): Promise<OverlayFrame | null>
    draft(): Promise<ClipDraft | null>
    region(region: ClipRegion): void
    cancel(): void
    commit(caption: string): Promise<void>
  }
  platform: {
    info(): Promise<PlatformInfo>
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
    itemsChanged(callback: (items: Item[]) => void): Unsubscribe
    settingsChanged(callback: (settings: Settings) => void): Unsubscribe
  }
}
