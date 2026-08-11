/**
 * A very small wrapper over dbus-native so the portal clients can await calls
 * and read variant payloads without repeating the same plumbing.
 */

export type DBusMessage = {
  type?: number
  member?: string
  path?: string
  interface?: string
  body?: unknown[]
}

export type DBusCall = {
  destination: string
  path: string
  interface: string
  member: string
  signature?: string
  body?: unknown[]
}

export type Bus = {
  name: string
  addMatch: (rule: string, callback: (error: unknown) => void) => void
  invoke: (message: DBusCall, callback: (error: unknown, ...result: unknown[]) => void) => void
  connection: {
    on: (event: string, listener: (message: DBusMessage) => void) => void
    removeListener: (event: string, listener: (message: DBusMessage) => void) => void
  }
  end?: () => void
}

export async function sessionBus(): Promise<Bus> {
  const module = await import('@homebridge/dbus-native')
  const loaded = (module as { default?: unknown }).default ?? module
  return (loaded as { sessionBus: () => Bus }).sessionBus()
}

/** The bus name arrives asynchronously; portal object paths are derived from it. */
export function uniqueName(bus: Bus, timeoutMs = 2000): Promise<string> {
  if (bus.name) return Promise.resolve(bus.name)

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      clearInterval(poll)
      reject(new Error('d-bus did not hand out a unique name'))
    }, timeoutMs)

    const poll = setInterval(() => {
      if (!bus.name) return
      clearInterval(poll)
      clearTimeout(timer)
      resolve(bus.name)
    }, 20)
  })
}

/** `:1.368` is `1_368` in the portal's request and session object paths. */
export function senderToken(name: string): string {
  return name.replace(/^:/, '').replace(/\./g, '_')
}

export function call(bus: Bus, message: DBusCall): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    bus.invoke(message, (error, ...result) =>
      error ? reject(asError(error)) : resolve(result)
    )
  })
}

export function addMatch(bus: Bus, rule: string): Promise<void> {
  return new Promise((resolve, reject) => {
    bus.addMatch(rule, (error) => (error ? reject(asError(error)) : resolve()))
  })
}

/**
 * dbus-native returns variants as `[signatureTree, [value]]`. Callers only ever
 * want the value, so unwrap those pairs wherever they appear.
 */
export function unwrap(value: unknown): unknown {
  if (!Array.isArray(value)) return value

  if (value.length === 2 && isSignatureTree(value[0]) && Array.isArray(value[1])) {
    const inner = value[1]
    return unwrap(inner.length === 1 ? inner[0] : inner)
  }

  return value.map(unwrap)
}

/** Reads an `a{sv}` payload that has already been through `unwrap`. */
export function dictValue(dict: unknown, key: string): unknown {
  if (!Array.isArray(dict)) return undefined

  for (const entry of dict) {
    if (Array.isArray(entry) && entry[0] === key) return entry[1]
  }
  return undefined
}

function isSignatureTree(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    typeof value[0] === 'object' &&
    value[0] !== null &&
    'type' in (value[0] as object)
  )
}

export function asError(value: unknown): Error {
  if (value instanceof Error) return value

  if (value && typeof value === 'object' && 'message' in value) {
    const { message, name } = value as { message?: unknown; name?: unknown }
    const error = new Error(String(message ?? value))
    if (typeof name === 'string') error.name = name
    return error
  }

  return new Error(String(value))
}
