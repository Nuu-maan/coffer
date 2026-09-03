# 003 — Reduced motion should gentle the menus, not delete them

- **Status**: DONE
- **Commit**: 47a8143
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 1 file, ~12 lines

## Problem

Reduced motion means fewer and gentler animations, not none: keep the
transitions that aid comprehension, remove the position and scale changes. The
current block crushes every CSS animation to 1ms, which does not gentle the
menus — it deletes them, so a dropdown teleports in with no fade to say it
arrived.

```css
/* src/renderer/src/styles/global.css:700-708 — current */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 100ms !important;
  }
}
```

The motion library is already handled separately and correctly by
`<MotionConfig reducedMotion="user">` in `src/renderer/src/App.tsx:83` and
`src/renderer/src/features/clipper/ClipForm.tsx:41`, which drops transforms and
keeps opacity. This block should do the same thing for the CSS half of the app
rather than contradicting it.

## Target

Keep the opacity, drop the scale. Redefine the `materialize` keyframes under the
media query instead of flattening their duration.

```css
/* target — src/renderer/src/styles/global.css */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-iteration-count: 1 !important;
    transition-duration: 100ms !important;
  }

  /* The fade survives — it is what says the menu arrived. The scale does not:
     a surface growing out of its trigger is exactly the movement the
     preference asks to be spared. */
  @keyframes materialize-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes materialize-out {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }
}
```

Note the removal of `animation-duration: 1ms !important` — with the keyframes
redefined to opacity only, the 140ms/100ms timings are the gentle version and
should be kept.

## Repo conventions to follow

`global.css` uses Tailwind v4 `@utility` and `@keyframes` at the top level; the
existing `prefers-reduced-motion` block sits near the end of the file, after the
`@layer base` block. Keep the new rules inside the existing media query rather
than adding a second one.

## Steps

1. In `src/renderer/src/styles/global.css`, remove the
   `animation-duration: 1ms !important;` declaration from the
   `prefers-reduced-motion` block.
2. Inside the same media query, after the `*` rule, add the two redefined
   `@keyframes` blocks exactly as written above.

## Out of scope

`MotionConfig reducedMotion="user"`, the `press` utility's transform (a press is
feedback, not travel, and is out of scope here), and the `transition-duration`
override.

## Verification

- In DevTools, Rendering → Emulate `prefers-reduced-motion: reduce`.
- Open the composer's + menu: it should fade in over ~140ms with no scale.
- Turn the emulation off: the scale should return.
