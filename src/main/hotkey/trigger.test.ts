import { describe, expect, it } from 'vitest'
import { toPortalTrigger } from './trigger'

describe('toPortalTrigger', () => {
  it('maps the default accelerators', () => {
    expect(toPortalTrigger('Control+Alt+Space')).toBe('CTRL+ALT+space')
    expect(toPortalTrigger('Control+Shift+Space')).toBe('CTRL+SHIFT+space')
  })

  it('lowercases letters and digits', () => {
    expect(toPortalTrigger('Control+K')).toBe('CTRL+k')
    expect(toPortalTrigger('Alt+3')).toBe('ALT+3')
  })

  it('keeps function keys uppercase', () => {
    expect(toPortalTrigger('F12')).toBe('F12')
    expect(toPortalTrigger('Shift+F5')).toBe('SHIFT+F5')
  })

  it('uses keysym names for punctuation and navigation', () => {
    expect(toPortalTrigger('Control+.')).toBe('CTRL+period')
    expect(toPortalTrigger('Alt+Up')).toBe('ALT+Up')
    expect(toPortalTrigger('Control+PageDown')).toBe('CTRL+Next')
  })

  it('folds the platform-agnostic and Super spellings onto one modifier each', () => {
    expect(toPortalTrigger('CommandOrControl+S')).toBe('CTRL+s')
    expect(toPortalTrigger('Super+Space')).toBe('LOGO+space')
    expect(toPortalTrigger('Control+Ctrl+A')).toBe('CTRL+a')
  })

  it('returns nothing when there is no key to bind', () => {
    expect(toPortalTrigger('')).toBeUndefined()
    expect(toPortalTrigger('Control+Shift')).toBeUndefined()
    expect(toPortalTrigger('Control+VolumeUp')).toBeUndefined()
  })
})
