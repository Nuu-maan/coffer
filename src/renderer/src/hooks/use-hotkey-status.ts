import type { HotkeyStatus } from '@shared/types/item'
import { coffer } from '@/lib/ipc'
import { remoteValue } from '@/lib/remote-value'

const status = remoteValue<HotkeyStatus>(() => coffer.hotkeys.status(), coffer.on.hotkeyStatus)

export function useHotkeyStatus(): HotkeyStatus | null {
  return status.use()
}
