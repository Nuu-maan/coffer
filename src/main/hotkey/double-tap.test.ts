import { describe, expect, it } from 'vitest'
import { createDoubleTapDetector, type KeyEvent } from './double-tap'

const shiftDown = (time: number): KeyEvent => ({ type: 'down', isShift: true, time })
const shiftUp = (time: number): KeyEvent => ({ type: 'up', isShift: true, time })
const otherDown = (time: number): KeyEvent => ({ type: 'down', isShift: false, time })

function feed(detector: ReturnType<typeof createDoubleTapDetector>, events: KeyEvent[]): number {
  return events.filter((event) => detector.handle(event)).length
}

describe('double tap detector', () => {
  it('fires on two quick shift taps', () => {
    const d = createDoubleTapDetector()
    expect(feed(d, [shiftDown(0), shiftUp(50), shiftDown(150), shiftUp(200)])).toBe(1)
  })

  it('ignores taps spaced beyond the window', () => {
    const d = createDoubleTapDetector({ windowMs: 350 })
    expect(feed(d, [shiftDown(0), shiftUp(50), shiftDown(600), shiftUp(650)])).toBe(0)
  })

  it('ignores a held shift used for capitalisation', () => {
    const d = createDoubleTapDetector({ maxHoldMs: 500 })
    expect(feed(d, [shiftDown(0), shiftUp(900), shiftDown(1000), shiftUp(1050)])).toBe(0)
  })

  it('resets when another key is pressed between taps', () => {
    const d = createDoubleTapDetector()
    expect(
      feed(d, [shiftDown(0), shiftUp(40), otherDown(80), shiftDown(120), shiftUp(160)])
    ).toBe(0)
  })

  it('does not double fire on a triple tap', () => {
    const d = createDoubleTapDetector({ cooldownMs: 400 })
    expect(
      feed(d, [
        shiftDown(0),
        shiftUp(40),
        shiftDown(80),
        shiftUp(120),
        shiftDown(160),
        shiftUp(200)
      ])
    ).toBe(1)
  })

  it('fires again after the cooldown elapses', () => {
    const d = createDoubleTapDetector({ cooldownMs: 400 })
    const first = feed(d, [shiftDown(0), shiftUp(40), shiftDown(80), shiftUp(120)])
    const second = feed(d, [shiftDown(1000), shiftUp(1040), shiftDown(1080), shiftUp(1120)])
    expect(first + second).toBe(2)
  })
})
