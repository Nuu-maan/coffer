import { describe, expect, it } from 'vitest'

/* The regexes each backend parses its tool's output with, exercised against
   real output shapes. The shelling out itself needs the platform; this does
   not, and it is where the mistakes actually live. */
const MAC_NAME = /"LSDisplayName"\s*=\s*"([^"]*)"/
const X11_CLASS = /"([^"]*)"\s*$/

describe('lsappinfo output', () => {
  it('reads the frontmost application name', () => {
    expect('"LSDisplayName"="Safari"'.match(MAC_NAME)?.[1]).toBe('Safari')
  })

  it('copes with spacing and surrounding noise', () => {
    const out = 'ASN:0x0-0x4a04a: "LSDisplayName" = "Visual Studio Code"\n  other=1\n'
    expect(out.match(MAC_NAME)?.[1]).toBe('Visual Studio Code')
  })

  it('finds nothing when nothing is frontmost', () => {
    expect(''.match(MAC_NAME)?.[1]).toBeUndefined()
  })
})

describe('xprop WM_CLASS output', () => {
  it('takes the class, not the instance', () => {
    expect('WM_CLASS(STRING) = "code", "Code"'.match(X11_CLASS)?.[1]).toBe('Code')
  })
})
