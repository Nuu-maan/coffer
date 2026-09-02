import type { PlatformInfo } from '@shared/types/item'
import { coffer } from '@/lib/ipc'
import { remoteValue } from '@/lib/remote-value'

const platform = remoteValue<PlatformInfo>(
  () => coffer.platform.info(),
  (listener) => coffer.on.permissionsChanged(() => void coffer.platform.info().then(listener))
)

export function usePlatform(): PlatformInfo | null {
  return platform.use()
}
