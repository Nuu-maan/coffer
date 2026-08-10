import type { CofferApi } from '@shared/ipc/contract'

declare global {
  interface Window {
    coffer: CofferApi
  }
}

export {}
