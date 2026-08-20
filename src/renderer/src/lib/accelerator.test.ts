import { describe, expect, it } from 'vitest'
import { format, isReservedByMacOS, parts } from './accelerator'

describe('parts', () => {
  it('prints Mac glyphs on a Mac', () => {
    expect(parts('Control+Command+S', true)).toEqual(['⌃', '⌘', 'S'])
    expect(parts('Control+Shift+Space', true)).toEqual(['⌃', '⇧', 'Space'])
  })

  it('treats Super, Cmd and Command as the same key', () => {
    for (const name of ['Super', 'Cmd', 'Command', 'Meta']) {
      expect(parts(`${name}+S`, true)[0]).toBe('⌘')
    }
  })

  it('names keys that exist on the keyboard everywhere else', () => {
    expect(parts('Control+Alt+Space', false)).toEqual(['Ctrl', 'Alt', 'Space'])
    expect(parts('Command+S', false)).toEqual(['Super', 'S'])
  })

  it('joins without separators on a Mac, and with them elsewhere', () => {
    expect(format('Control+Command+S', true)).toBe('⌃⌘S')
    expect(format('Control+Shift+Space', false)).toBe('Ctrl+Shift+Space')
  })
})

describe('isReservedByMacOS', () => {
  it.each([
    'Control+Space',
    'Control+Alt+Space',
    'Control+Command+Space',
    'Command+Space',
    'Command+Shift+4',
    'Control+Up'
  ])('turns down %s', (accelerator) => {
    expect(isReservedByMacOS(accelerator)).toBe(true)
  })

  it('ignores the order the modifiers were pressed in', () => {
    expect(isReservedByMacOS('Alt+Control+Space')).toBe(true)
    expect(isReservedByMacOS('Command+Control+Space')).toBe(true)
  })

  it('treats Super as Command, since Electron does', () => {
    expect(isReservedByMacOS('Super+Space')).toBe(true)
    expect(isReservedByMacOS('Control+Super+Space')).toBe(true)
  })

  it('allows the defaults Coffer ships on macOS', () => {
    expect(isReservedByMacOS('Control+Command+S')).toBe(false)
    expect(isReservedByMacOS('Control+Command+R')).toBe(false)
  })
})
