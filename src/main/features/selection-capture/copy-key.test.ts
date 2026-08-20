import { describe, expect, it, vi } from 'vitest'

vi.mock('uiohook-napi', () => ({
  UiohookKey: { C: 46, Ctrl: 29, Meta: 3675 },
  uIOhook: { keyTap: vi.fn() }
}))

const { classifyShellFailure, copyChord, shellCopy } = await import('./copy-key')

describe('copyChord', () => {
  it('taps Command on macOS', () => {
    expect(copyChord('darwin')).toEqual({ key: 46, modifiers: [3675] })
  })

  it.each(['win32', 'linux'] as const)('taps Control on %s', (platform) => {
    expect(copyChord(platform)).toEqual({ key: 46, modifiers: [29] })
  })
})

describe('shellCopy', () => {
  it('reaches for osascript on macOS, not powershell', () => {
    const [command, args] = shellCopy('darwin')
    expect(command).toBe('osascript')
    expect(args.join(' ')).toContain('keystroke "c" using command down')
  })

  it('reaches for xdotool on Linux', () => {
    expect(shellCopy('linux')[0]).toBe('xdotool')
  })

  it('reaches for powershell on Windows', () => {
    expect(shellCopy('win32')[0]).toBe('powershell.exe')
  })

  it('never hands one platform another platform tooling', () => {
    for (const platform of ['darwin', 'linux', 'win32'] as const) {
      const others = { darwin: 'osascript', linux: 'xdotool', win32: 'powershell.exe' }
      expect(shellCopy(platform)[0]).toBe(others[platform])
    }
  })
})

describe('classifyShellFailure', () => {
  it.each([
    ['execution error: Not authorized to send Apple events (-1743)', 'automation-denied'],
    ['osascript is not allowed to send keystrokes. (-25211)', 'accessibility-denied'],
    ['some other failure', 'unknown'],
    ['', 'unknown']
  ] as const)('reads %s as %s', (stderr, expected) => {
    expect(classifyShellFailure(stderr)).toBe(expected)
  })
})
