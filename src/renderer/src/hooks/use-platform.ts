import type { PlatformInfo } from '@shared/types/item'
import { coffer } from '@/lib/ipc'
import { remoteValue } from '@/lib/remote-value'

/* Fixed for the life of the process, so it is fetched once and kept. */
const platform = remoteValue<PlatformInfo>(() => coffer.platform.info())

export function usePlatform(): PlatformInfo | null {
  return platform.use()
}
