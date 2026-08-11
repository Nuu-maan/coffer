import { useEffect, useState } from 'react'
import type { HotkeyStatus } from '@shared/types/item'
import { coffer } from '@/lib/ipc'

export function useHotkeyStatus(): HotkeyStatus | null {
  const [status, setStatus] = useState<HotkeyStatus | null>(null)

  useEffect(() => {
    void coffer.hotkeys.status().then(setStatus)
    return coffer.on.hotkeyStatus(setStatus)
  }, [])

  return status
}
