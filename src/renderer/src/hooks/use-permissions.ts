import type { PermissionKind, Permissions } from '@shared/types/item'
import { coffer } from '@/lib/ipc'
import { remoteValue } from '@/lib/remote-value'

const state = remoteValue<Permissions>(() => coffer.permissions.status())

export function usePermissions(): Permissions | null {
  return state.use()
}

/* Publishes the answer the request came back with, so the row updates without
   waiting for anything to broadcast. It is usually the same answer as before:
   macOS caches both reads for the life of the process, so a fresh grant does
   not show up until Coffer restarts — which is what needsRestart is for. */
export async function requestPermission(kind: PermissionKind): Promise<Permissions> {
  const next = await coffer.permissions.request(kind)
  state.set(next)
  return next
}
