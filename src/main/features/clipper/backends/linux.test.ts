import { describe, expect, it } from 'vitest'
import { connectorName } from './linux'

describe('connectorName', () => {
  it('takes the connector out of a Wayland label', () => {
    expect(connectorName('Lenovo Group Limited R27qe Gen2 UTP083DG (HDMI-A-1)')).toBe('HDMI-A-1')
  })

  it('leaves an X11 label, which is already the connector, alone', () => {
    expect(connectorName('DP-2')).toBe('DP-2')
  })

  it('reads the last bracketed run, not a bracket in the model name', () => {
    expect(connectorName('Dell (UltraSharp) U2723QE (DP-3)')).toBe('DP-3')
  })

  it('keeps a label whose brackets are not at the end', () => {
    expect(connectorName('Acme (Pro) Display')).toBe('Acme (Pro) Display')
  })

  it('survives an empty label', () => {
    expect(connectorName('')).toBe('')
  })
})
