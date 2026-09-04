# 002 — Bring the shared spring under the 300ms UI budget

- **Status**: DONE
- **Commit**: 47a8143
- **Severity**: HIGH
- **Category**: Easing & duration
- **Estimated scope**: 1 file, 1 line

## Problem

UI animation stays under 300ms. The app's primary spring is 340ms:

```ts
/* src/renderer/src/lib/motion.ts:3 — current */
export const spring: Transition = { type: 'spring', bounce: 0, duration: 0.34 }
```

It has 13 call sites and, critically, it is the transition on `ItemRow`'s
`layout` animation — the curve on every row displaced by a drag, which is the
app's most-used gesture. 340ms of settle on a row that has already arrived reads
as the list catching up with the pointer rather than moving with it.

## Target

```ts
/* target — src/renderer/src/lib/motion.ts:3 */
export const spring: Transition = { type: 'spring', bounce: 0, duration: 0.28 }
```

280ms. `bounce: 0` is unchanged — this is a crisp utility panel, not a playful
app, and visible bounce is reserved for drag-to-dismiss, which this app has none
of. Do not touch `springSnap` (0.22), which is already inside budget.

## Repo conventions to follow

All shared transitions live in `src/renderer/src/lib/motion.ts` as named exports
and are spread or passed whole (`transition={spring}`,
`transition={{ ...spring, delay }}`). Do not inline a spring config at a call
site; change the token.

## Steps

1. In `src/renderer/src/lib/motion.ts`, change `spring`'s `duration` from `0.34`
   to `0.28`.
2. Change nothing else. All 13 call sites pick it up.

## Out of scope

`springSnap`, `springSheet`, `ease`, `pageSlide`, and the `bounce` value.

## Verification

- `npm run typecheck` passes.
- Drag a card past two others and release. The rows closing the gap should be at
  rest before the pointer has travelled much further.
- Feel-check at 10% speed: the settle should read as one movement, not a slow
  drift into place.
