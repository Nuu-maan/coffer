import type { PlatformInfo, SessionKind } from '@shared/types/item'

let cached: SessionKind | null = null

export function sessionKind(): SessionKind {
  if (cached) return cached
  cached = detect()
  return cached
}

function detect(): SessionKind {
  if (process.platform === 'win32') return 'windows'
  if (process.platform !== 'linux') return 'unknown'

  const declared = (process.env['XDG_SESSION_TYPE'] ?? '').toLowerCase()
  if (declared === 'wayland') return 'wayland'
  if (declared === 'x11') return 'x11'

  if (process.env['WAYLAND_DISPLAY']) return 'wayland'
  if (process.env['DISPLAY']) return 'x11'

  return 'unknown'
}

export function isLinux(): boolean {
  return process.platform === 'linux'
}

export function isWayland(): boolean {
  return sessionKind() === 'wayland'
}

export function isX11(): boolean {
  return sessionKind() === 'x11'
}

export function platformInfo(): PlatformInfo {
  const session = sessionKind()

  return {
    platform: process.platform,
    session,
    supportsDoubleShift: session !== 'wayland' && session !== 'unknown',
    supportsLoginItem: true,
    supportsSourceCapture: session === 'windows' || session === 'x11'
  }
}
