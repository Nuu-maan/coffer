import type { Item, ItemSource, Settings } from '../types/item'

export type AddItemInput = {
  text: string
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
    toggle(id: string): Promise<Item[]>
    update(id: string, text: string): Promise<Item[]>
    remove(id: string): Promise<Item[]>
    reorder(input: ReorderInput): Promise<Item[]>
    clearDone(): Promise<Item[]>
  }
  clipboard: {
    read(): Promise<string>
    write(text: string): Promise<void>
  }
  stash: {
    selection(): Promise<void>
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
