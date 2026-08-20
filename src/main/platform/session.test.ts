import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const isTrustedAccessibilityClient = vi.fn(() => false)

vi.mock('electron', () => ({
  shell: { openExternal: vi.fn() },
  systemPreferences: {
    isTrustedAccessibilityClient,
    getMediaAccessStatus: vi.fn(() => 'denied')
  },
  app: { getPath: () => '/nowhere/Coffer' }
}))

const REAL_PLATFORM = process.platform

function setPlatform(value: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', { value, configurable: true })
}

/* sessionKind() memoises into a module-level binding, so every case has to
   start from a fresh module graph or it inherits the previous answer. */
async function load(
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv = {}
): Promise<typeof import('./session')> {
  setPlatform(platform)
  for (const [key, value] of Object.entries(env)) process.env[key] = value
  vi.resetModules()
  return import('./session')
}

describe('platform detection', () => {
  beforeEach(() => {
    isTrustedAccessibilityClient.mockReturnValue(false)
    delete process.env['XDG_SESSION_TYPE']
    delete process.env['WAYLAND_DISPLAY']
    delete process.env['DISPLAY']
    delete process.env['XDG_CURRENT_DESKTOP']
  })

  afterEach(() => {
    setPlatform(REAL_PLATFORM)
    vi.resetModules()
  })

  it('names macOS as its own session rather than an unknown one', async () => {
    const { sessionKind, isMac } = await load('darwin')
    expect(sessionKind()).toBe('macos')
    expect(isMac()).toBe(true)
  })

  it.each([
    ['win32', 'windows'],
    ['darwin', 'macos']
  ] as const)('detects %s as %s', async (platform, expected) => {
    const { sessionKind } = await load(platform)
    expect(sessionKind()).toBe(expected)
  })

  it.each([
    [{ XDG_SESSION_TYPE: 'wayland' }, 'wayland'],
    [{ XDG_SESSION_TYPE: 'x11' }, 'x11'],
    [{ WAYLAND_DISPLAY: 'wayland-0' }, 'wayland'],
    [{ DISPLAY: ':0' }, 'x11'],
    [{}, 'unknown']
  ] as const)('still reads the Linux session from %o', async (env, expected) => {
    const { sessionKind } = await load('linux', env)
    expect(sessionKind()).toBe(expected)
  })
})

describe('macOS capabilities', () => {
  beforeEach(() => isTrustedAccessibilityClient.mockReturnValue(false))
  afterEach(() => {
    setPlatform(REAL_PLATFORM)
    vi.resetModules()
  })

  it('offers accelerators and source capture on macOS', async () => {
    const { platformInfo } = await load('darwin')
    const info = platformInfo()

    expect(info.platform).toBe('darwin')
    expect(info.session).toBe('macos')
    expect(info.supportsAccelerators).toBe(true)
    expect(info.supportsSourceCapture).toBe(true)
  })

  it('withholds double-tap Shift until Accessibility is granted', async () => {
    const { platformInfo } = await load('darwin')
    expect(platformInfo().supportsDoubleShift).toBe(false)

    isTrustedAccessibilityClient.mockReturnValue(true)
    expect(platformInfo().supportsDoubleShift).toBe(true)
  })

  it('never asks for Accessibility off macOS', async () => {
    const { platformInfo } = await load('win32')
    isTrustedAccessibilityClient.mockClear()

    expect(platformInfo().supportsDoubleShift).toBe(true)
    expect(isTrustedAccessibilityClient).not.toHaveBeenCalled()
  })
})
