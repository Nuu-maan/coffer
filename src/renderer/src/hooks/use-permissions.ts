import type { PermissionKind, Permissions } from '@shared/types/item'
import { coffer } from '@/lib/ipc'
import { remoteValue } from '@/lib/remote-value'

const state = remoteValue<Permissions>(
  () => coffer.permissions.status(),
  coffer.on.permissionsChanged
)

export function usePermissions(): Permissions | null {
  return state.use()
}

export async function requestPermission(kind: PermissionKind): Promise<Permissions> {
  const next = await coffer.permissions.request(kind)
  state.set(next)
  return next
}
