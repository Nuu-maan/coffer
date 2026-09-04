# Animation plans

Produced by the `improve-animations` skill (Emil Kowalski's animation bar,
`~/.agents/skills/improve-animations`) against commit `47a8143`.

Recommended order — each is independent, so this is by leverage, not dependency:

| # | Plan | Severity | Category | Status |
| --- | --- | --- | --- | --- |
| 001 | [Close menus on ease-out, not ease-in](001-menu-close-ease-out.md) | HIGH | Easing & duration | DONE |
| 002 | [Bring the shared spring under the 300ms UI budget](002-spring-under-300ms.md) | HIGH | Easing & duration | DONE |
| 003 | [Reduced motion should gentle the menus, not delete them](003-reduced-motion-gentle-not-zero.md) | MEDIUM | Accessibility | DONE |
| 004 | [Retire the motion helpers nothing calls](004-retire-dead-motion-tokens.md) | MEDIUM | Cohesion & tokens | DONE |
| 005 | [Tick a stash and let its text catch up](005-done-state-colour-transition.md) | LOW | Missed opportunities | DONE |

## Audited and deliberately not planned

- **`materialize` uses `@keyframes` rather than transitions.** Keyframes restart
  from zero rather than retargeting, so opening and immediately closing a menu
  replays from the start. Radix's `Presence` unmounts on `animationend`; a CSS
  transition is not reliably detected in its place, so the element could unmount
  mid-fade. Constrained by the library, not by this codebase.
- **Motion's `x`/`y`/`scale` shorthand props.** Reported in the catalog as
  main-thread work. Not confirmable here: the panel is 360px wide with a handful
  of animated nodes, and no dropped frames were observed under a scripted drag.
  Not reported as a finding rather than guessed at.
- **Press feedback at `scale(0.96)` / 140ms.** Inside the 0.95–0.98 range the
  catalog allows, and documented in `global.css` as a deliberate choice.
- **Tooltip delay.** `skipDelayDuration={250}` on the provider already makes the
  second and subsequent tooltips instant, which is the prescribed behaviour.
