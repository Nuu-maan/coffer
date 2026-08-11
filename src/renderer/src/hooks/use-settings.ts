import type { Settings } from '@shared/types/item'
import { coffer } from '@/lib/ipc'
import { remoteValue } from '@/lib/remote-value'

const settings = remoteValue<Settings>(() => coffer.settings.get(), coffer.on.settingsChanged)

export function useSettings(): Settings | null {
  return settings.use()
}

/*
 * Applied here first, then sent. A switch bound to a value that only arrives
 * back from the main process cannot move under the pointer — it holds its old
 * position for the round trip and then jumps, which is the bounce. The main
 * process broadcasts the same settings back when it has written them, so the
 * two agree a moment later either way.
 */
export function patchSettings(patch: Partial<Settings>): void {
  const current = settings.peek()
  if (current) settings.set({ ...current, ...patch })
  void coffer.settings.set(patch)
}
