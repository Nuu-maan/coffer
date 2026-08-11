import type { Transition } from 'motion/react'

/**
 * Springs, not durations.
 *
 * Apple describes a spring with two numbers instead of the physics triplet:
 * damping ratio (how much it overshoots) and response (how quickly it reaches
 * the target). Motion's `bounce` + `duration` maps onto those directly —
 * damping 1.0 is bounce 0, damping ~0.8 is bounce ~0.2.
 *
 * The rule for picking one: overshoot is only earned when the gesture itself
 * carried momentum. A menu that just appeared should not bounce; a row you
 * flicked should.
 */

/** Critically damped. The default for anything that simply changes state. */
export const spring: Transition = { type: 'spring', bounce: 0, duration: 0.4 }

/** Same feel, quicker — small elements, hover-scale, chips. */
export const springSnap: Transition = { type: 'spring', bounce: 0, duration: 0.28 }

/** Sheets and drawers: a little overshoot because they are thrown open. */
export const springSheet: Transition = { type: 'spring', bounce: 0.2, duration: 0.32 }

/** After a flick or a drag release, where the finger handed over velocity. */
export const springMomentum: Transition = { type: 'spring', bounce: 0.22, duration: 0.4 }

/** Non-spatial changes (opacity, colour) where a spring would be pointless. */
export const ease: Transition = { duration: 0.2, ease: [0.16, 1, 0.3, 1] }

/** Rows enter one after another rather than all at once. */
export const STAGGER = 0.024

/**
 * Apple's momentum projection, from the Designing Fluid Interfaces sample.
 * Given a release velocity, where would this come to rest? Snap to the target
 * nearest *that* point, not nearest the release point — this is what makes a
 * flick feel like it throws something.
 *
 * Note this is the exponential-decay form, not the v²/2a from physics class.
 */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate)
}

/**
 * Progressive resistance past a boundary. A hard stop reads as frozen; this
 * reads as "responsive, but there is nothing more here".
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot))
}

/** Tracks recent pointer samples so a gesture can hand off its real velocity. */
export class VelocityTracker {
  private samples: Array<{ value: number; time: number }> = []

  add(value: number): void {
    const time = performance.now()
    this.samples.push({ value, time })
    // Anything older than ~100ms is history, not velocity.
    while (this.samples.length > 2 && time - this.samples[0]!.time > 100) {
      this.samples.shift()
    }
  }

  /** Pixels per second, signed. */
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
