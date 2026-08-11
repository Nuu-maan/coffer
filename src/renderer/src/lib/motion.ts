import type { Transition } from 'motion/react'

export const spring: Transition = { type: 'spring', bounce: 0, duration: 0.34 }

export const springSnap: Transition = { type: 'spring', bounce: 0, duration: 0.22 }

export const springSheet: Transition = { type: 'spring', bounce: 0.12, duration: 0.3 }

export const springMomentum: Transition = { type: 'spring', bounce: 0.18, duration: 0.36 }

export const ease: Transition = { duration: 0.16, ease: [0.16, 1, 0.3, 1] }

export const STAGGER = 0.012

export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate)
}

export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot))
}

export class VelocityTracker {
  private samples: Array<{ value: number; time: number }> = []

  add(value: number): void {
    const time = performance.now()
    this.samples.push({ value, time })
    while (this.samples.length > 2 && time - this.samples[0]!.time > 100) {
      this.samples.shift()
    }
  }

  get velocity(): number {
    const first = this.samples[0]
    const last = this.samples[this.samples.length - 1]
    if (!first || !last) return 0
    const elapsed = last.time - first.time
    if (elapsed <= 0) return 0
    return ((last.value - first.value) / elapsed) * 1000
  }

  reset(): void {
    this.samples = []
  }
}
