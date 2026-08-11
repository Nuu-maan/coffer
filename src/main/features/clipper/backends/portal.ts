import { readFile, unlink } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'

const TIMEOUT_MS = 8000

type Bus = {
  name: string
  addMatch: (rule: string, callback: (error: unknown) => void) => void
  invoke: (message: Record<string, unknown>, callback: (error: unknown) => void) => void
  connection: { on: (event: string, listener: (message: DBusMessage) => void) => void }
  end?: () => void
}

type DBusMessage = {
  type?: number
  member?: string
  path?: string
  interface?: string
  body?: unknown[]
}

export async function screenshotViaPortal(interactive: boolean): Promise<Buffer> {
  const uri = await requestScreenshot(interactive)
  const path = fileURLToPath(uri)

  try {
    return await readFile(path)
  } finally {
    void unlink(path).catch(() => undefined)
  }
}

async function requestScreenshot(interactive: boolean): Promise<string> {
  const { sessionBus } = await loadDbus()
  const bus = sessionBus() as Bus

  try {
    const name = await uniqueName(bus)
    const token = `coffer_${randomBytes(6).toString('hex')}`
    const requestPath = `/org/freedesktop/portal/desktop/request/${name.replace(/^:/, '').replace(/\./g, '_')}/${token}`

    const response = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('portal timed out')), TIMEOUT_MS)

      bus.connection.on('message', (message) => {
        if (message.member !== 'Response' || message.path !== requestPath) return
        clearTimeout(timer)

        const code = Number(message.body?.[0] ?? 2)
        if (code !== 0) {
          reject(new Error(`portal returned ${code}`))
          return
        }

        const uri = findFileUri(message.body?.[1])
        if (uri) resolve(uri)
        else reject(new Error('portal returned no uri'))
      })

      bus.addMatch(
        `type='signal',interface='org.freedesktop.portal.Request',member='Response',path='${requestPath}'`,
        (error) => {
          if (error) {
            clearTimeout(timer)
            reject(error instanceof Error ? error : new Error(String(error)))
          }
        }
      )
    })

    await new Promise<void>((resolve, reject) => {
      bus.invoke(
        {
          destination: 'org.freedesktop.portal.Desktop',
          path: '/org/freedesktop/portal/desktop',
          interface: 'org.freedesktop.portal.Screenshot',
          member: 'Screenshot',
          signature: 'sa{sv}',
          body: [
            '',
            [
              ['handle_token', ['s', token]],
              ['interactive', ['b', interactive]],
              ['modal', ['b', false]]
            ]
          ]
        },
        (error) => (error ? reject(asError(error)) : resolve())
      )
    })

    return await response
  } finally {
    bus.end?.()
  }
}

function uniqueName(bus: Bus): Promise<string> {
  if (bus.name) return Promise.resolve(bus.name)

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('no bus name')), 2000)
    const poll = setInterval(() => {
      if (!bus.name) return
      clearInterval(poll)
      clearTimeout(timer)
      resolve(bus.name)
    }, 20)
  })
}

function findFileUri(value: unknown): string | null {
  if (typeof value === 'string') return value.startsWith('file://') ? value : null
  if (!Array.isArray(value)) return null

  for (const entry of value) {
    const found = findFileUri(entry)
    if (found) return found
  }
  return null
}

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value))
}

async function loadDbus(): Promise<{ sessionBus: () => unknown }> {
  const module = await import('@homebridge/dbus-native')
  const loaded = (module as { default?: unknown }).default ?? module
  return loaded as { sessionBus: () => unknown }
}
