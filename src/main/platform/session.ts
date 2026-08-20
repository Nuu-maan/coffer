import type { PlatformInfo, SessionKind } from '@shared/types/item'
import { executablePath } from './desktop-entry'
import { hasAccessibility } from './permissions'

let cached: SessionKind | null = null

export function sessionKind(): SessionKind {
  if (cached) return cached
  cached = detect()
  return cached
}

function detect(): SessionKind {
  if (process.platform === 'win32') return 'windows'
  if (process.platform === 'darwin') return 'macos'
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

export function isMac(): boolean {
  return process.platform === 'darwin'
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
    desktop: (process.env['XDG_CURRENT_DESKTOP'] ?? '').toLowerCase(),
    executable: executablePath(),
    /* Named sessions only. An unknown session is one where reading the keyboard
       has already been ruled out, and macOS additionally has to be trusted for
       Accessibility before a hook can see a single key. Asking here rather than
       in detect() is deliberate: detect() is memoised for the life of the
       process and the grant is not ours to cache. */
    supportsDoubleShift:
      session === 'windows' || session === 'x11' || (session === 'macos' && hasAccessibility()),
    // Chromium registers accelerators through X11, Win32 or Carbon. On Wayland
    // the call reports success and then never fires, so the portal is the only
    // option.
    supportsAccelerators: session !== 'wayland',
    supportsLoginItem: true,
    supportsSourceCapture: session === 'windows' || session === 'x11' || session === 'macos'
  }
}
