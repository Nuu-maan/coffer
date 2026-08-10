import { pathToFileURL } from 'node:url'
import { net, protocol } from 'electron'
import { IMAGE_SCHEME } from '@shared/constants'
import { resolveImage } from '@main/features/images/store'

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
    if (url.hostname !== 'image') return new Response('not found', { status: 404 })

    const path = resolveImage(decodeURIComponent(url.pathname).replace(/^\//, ''))
    if (!path) return new Response('bad request', { status: 400 })

    return net.fetch(pathToFileURL(path).toString())
  })
}
