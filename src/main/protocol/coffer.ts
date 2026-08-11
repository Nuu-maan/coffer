import { pathToFileURL } from 'node:url'
import { net, protocol } from 'electron'
import { IMAGE_SCHEME } from '@shared/constants'
import { resolveImage } from '@main/features/images/store'
import { draftBytes, frameBytes } from '@main/features/clipper/frames'

export function registerCofferScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: IMAGE_SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: false }
    }
  ])
}

export function serveCofferScheme(): void {
  protocol.handle(IMAGE_SCHEME, (request) => {
    const url = new URL(request.url)

    if (url.hostname === 'frame') {
      const displayId = Number(url.pathname.replace(/^\//, ''))
      const bytes = Number.isFinite(displayId) ? frameBytes(displayId) : null
      if (!bytes) return new Response('not found', { status: 404 })

      return new Response(new Uint8Array(bytes), {
        headers: { 'content-type': 'image/jpeg', 'cache-control': 'no-store' }
      })
    }

    if (url.hostname === 'draft') {
      const bytes = draftBytes()
      if (!bytes) return new Response('not found', { status: 404 })

      return new Response(new Uint8Array(bytes), {
        headers: { 'content-type': 'image/png', 'cache-control': 'no-store' }
      })
    }

    if (url.hostname !== 'image') return new Response('not found', { status: 404 })

    const path = resolveImage(decodeURIComponent(url.pathname).replace(/^\//, ''))
    if (!path) return new Response('bad request', { status: 400 })

    return net.fetch(pathToFileURL(path).toString())
  })
}
