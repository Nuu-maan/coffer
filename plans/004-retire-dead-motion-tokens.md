# 004 — Retire the motion helpers nothing calls

- **Status**: DONE
- **Commit**: 47a8143
- **Severity**: MEDIUM
- **Category**: Cohesion & tokens
- **Estimated scope**: 2 files, ~35 lines deleted

## Problem

`src/renderer/src/lib/motion.ts` exports five things with zero call sites
anywhere in `src/`. A motion vocabulary is only useful if every word in it is
load-bearing; four unused springs and physics helpers sitting beside the three
real ones is how a fifth near-identical curve gets added by someone reading the
file and assuming the set is in use.

Verified zero consumers outside their own declaration:

- `springMomentum` (`{ type: 'spring', bounce: 0.18, duration: 0.36 }`)
- `project(velocity, decelerationRate)`
- `rubberband(overshoot, dimension, constant)`
- `class VelocityTracker`
- `--ease-standard: cubic-bezier(0.32, 0.72, 0, 1);`
  (`src/renderer/src/styles/global.css:414`)

`springMomentum` is additionally out of policy: `bounce: 0.18` in an app whose
every other spring is `bounce: 0`.

## Target

All five deleted. `motion.ts` keeps exactly what is used: `spring`,
`springSnap`, `springSheet`, `ease`, `PAGE_SLIDE`, `PAGE_BLUR`, `pageSlide`,
`STAGGER`.

## Repo conventions to follow

`motion.ts` is a flat module of named exports with a prose comment above any
value whose number is not self-evident. Keep the surviving comments intact.

## Steps

1. Confirm each is unused:
   `grep -rn "springMomentum\|project(\|rubberband\|VelocityTracker" src/`
   should return only `src/renderer/src/lib/motion.ts`.
2. Delete `springMomentum`, `project`, `rubberband` and `VelocityTracker`, along
   with their comments, from `src/renderer/src/lib/motion.ts`.
3. Confirm `grep -rn "ease-standard" src/` returns only the declaration, then
   delete `--ease-standard` from `src/renderer/src/styles/global.css`.

## Out of scope

`springSheet` (2 call sites — keep it). Renaming or renumbering anything that
survives.

## Verification

- `npm run typecheck` passes.
- `npx vitest run` passes.
- `npx electron-vite build` succeeds.
