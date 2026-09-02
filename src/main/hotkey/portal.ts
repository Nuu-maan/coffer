import { randomBytes } from 'node:crypto'
import { APP_ID } from '@shared/constants'
import type { PortalShortcut } from '@shared/types/item'
import {
  addMatch,
  asError,
  call,
  dictValue,
  senderToken,
  sessionBus,
  unwrap,
  uniqueName,
  type Bus,
  type DBusMessage
} from '@main/platform/dbus'

const PORTAL = 'org.freedesktop.portal.Desktop'
const PORTAL_PATH = '/org/freedesktop/portal/desktop'
const SHORTCUTS = 'org.freedesktop.portal.GlobalShortcuts'
const REGISTRY = 'org.freedesktop.host.portal.Registry'
const REQUEST_TIMEOUT_MS = 10_000

export type PortalRequest = {
  id: string
  description: string
  /** A hint only. Compositors like Hyprland ignore it and let the user bind. */
  preferredTrigger?: string
  onActivated: () => void
}

export type PortalHandle = {
  close(): Promise<void>
  shortcuts(): PortalShortcut[]
}

/**
 * Binds global shortcuts through org.freedesktop.portal.GlobalShortcuts, which
 * is the only way to get a system-wide hotkey in a Wayland session. Chromium's
 * own `globalShortcut` silently registers nothing there.
 *
 * The bound shortcuts are named `<app-id>:<id>` to the compositor, and the user
 * still has to attach keys to them: portals hand out the *name*, the compositor
 * owns the *binding*.
 */
export async function bindPortalShortcuts(requests: PortalRequest[]): Promise<PortalHandle> {
  const bus = await sessionBus()
  let closed = false
  let bound: PortalShortcut[] = []

  function shutdown(): void {
    if (closed) return
    closed = true
    bus.end?.()
  }

  try {
    const sender = senderToken(await uniqueName(bus))

    await addMatch(bus, `type='signal',interface='org.freedesktop.portal.Request'`)
    await addMatch(bus, `type='signal',interface='${SHORTCUTS}'`)

    // Declares which application this connection is, so the portal can apply
    // and remember permissions for it. Without this the portal refuses the
    // session outright with "An app id is required".
    await call(bus, {
      destination: PORTAL,
      path: PORTAL_PATH,
      interface: REGISTRY,
      member: 'Register',
      signature: 'sa{sv}',
      body: [APP_ID, []]
    })

    const sessionToken = token('session')
    const sessionHandle = `${PORTAL_PATH}/session/${sender}/${sessionToken}`

    await request(bus, sender, (handleToken) => ({
      destination: PORTAL,
      path: PORTAL_PATH,
      interface: SHORTCUTS,
      member: 'CreateSession',
      signature: 'a{sv}',
      body: [
        [
          ['handle_token', ['s', handleToken]],
          ['session_handle_token', ['s', sessionToken]]
        ]
      ]
    }))

    const results = await request(bus, sender, (handleToken) => ({
      destination: PORTAL,
      path: PORTAL_PATH,
      interface: SHORTCUTS,
      member: 'BindShortcuts',
      signature: 'oa(sa{sv})sa{sv}',
      body: [
        sessionHandle,
        requests.map((entry) => [
          entry.id,
          [
            ['description', ['s', entry.description]],
            ...(entry.preferredTrigger
              ? [['preferred_trigger', ['s', entry.preferredTrigger]]]
              : [])
          ]
        ]),
        '',
        [['handle_token', ['s', handleToken]]]
      ]
    }))

    bound = readShortcuts(dictValue(results, 'shortcuts'))

    bus.connection.on('message', (message: DBusMessage) => {
      if (message.interface !== SHORTCUTS || message.member !== 'Activated') return

      const body = unwrap(message.body) as unknown[]
      if (body?.[0] !== sessionHandle) return

      const match = requests.find((entry) => entry.id === body[1])
      match?.onActivated()
    })

    bus.connection.on('message', (message: DBusMessage) => {
      if (message.interface !== SHORTCUTS || message.member !== 'ShortcutsChanged') return

      const body = unwrap(message.body) as unknown[]
      if (body?.[0] !== sessionHandle) return

      bound = readShortcuts(body[1])
    })

    return {
      async close() {
        await call(bus, {
          destination: PORTAL,
          path: sessionHandle,
          interface: 'org.freedesktop.portal.Session',
          member: 'Close'
        }).catch(() => undefined)
        shutdown()
      },
      shortcuts: () => bound
    }
  } catch (error) {
    shutdown()
    throw asError(error)
  }
}

/**
 * Portal methods return immediately with a Request object path and deliver the
 * real answer later on a Response signal. The response is matched by predicting
 * that path from our own handle token.
 */
function request(
  bus: Bus,
  sender: string,
  build: (handleToken: string) => Parameters<typeof call>[1]
): Promise<unknown> {
  const handleToken = token('req')
  const requestPath = `${PORTAL_PATH}/request/${sender}/${handleToken}`

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error(`the desktop portal did not answer ${requestPath}`))
    }, REQUEST_TIMEOUT_MS)

    const listener = (message: DBusMessage): void => {
      if (message.member !== 'Response' || message.path !== requestPath) return
      cleanup()

      const body = unwrap(message.body) as unknown[]
      const code = Number(body?.[0] ?? 2)

      if (code === 1) reject(new Error('the request was cancelled'))
      else if (code !== 0) reject(new Error(`the desktop portal refused the request (${code})`))
      else resolve(body[1])
    }

    function cleanup(): void {
      clearTimeout(timer)
      bus.connection.removeListener('message', listener)
    }

    bus.connection.on('message', listener)

    call(bus, build(handleToken)).catch((error) => {
      cleanup()
      reject(asError(error))
    })
  })
}

function readShortcuts(value: unknown): PortalShortcut[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((entry) => {
    if (!Array.isArray(entry) || typeof entry[0] !== 'string') return []

    const description = dictValue(entry[1], 'description')
    const trigger = dictValue(entry[1], 'trigger_description')

    return [
      {
        id: `${APP_ID}:${entry[0]}`,
        description: typeof description === 'string' ? description : '',
        trigger: typeof trigger === 'string' ? trigger : ''
      }
    ]
  })
}

function token(prefix: string): string {
  return `coffer_${prefix}_${randomBytes(6).toString('hex')}`
}
