import { useEffect, useState } from 'react'
import type { PlatformInfo } from '@shared/types/item'
import { coffer } from '@/lib/ipc'

export function usePlatform(): PlatformInfo | null {
  const [info, setInfo] = useState<PlatformInfo | null>(null)

  useEffect(() => {
    void coffer.platform.info().then(setInfo)
  }, [])

  return info
}
