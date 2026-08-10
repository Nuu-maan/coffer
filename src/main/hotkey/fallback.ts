import { globalShortcut } from 'electron'

export type FallbackHandle = {
  stop(): void
}

export function startAcceleratorHotkey(
  accelerator: string,
  onTrigger: () => void
): FallbackHandle | null {
  const registered = globalShortcut.register(accelerator, onTrigger)
  if (!registered) return null

  return {
    stop() {
      globalShortcut.unregister(accelerator)
    }
  }
}
