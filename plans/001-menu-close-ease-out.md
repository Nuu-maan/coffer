# 001 — Close menus on ease-out, not ease-in

- **Status**: DONE
- **Commit**: 47a8143
- **Severity**: HIGH
- **Category**: Easing & duration
- **Estimated scope**: 1 file, 2 lines

## Problem

Every dropdown, context menu and select in the app closes on a strong ease-in.
An ease-in starts slow, which delays the exact moment the user is watching — the
menu appears to hang for a beat after the click that dismissed it. These are the
most-triggered overlays in the product: the composer's + menu, the row context
menu, and every select in settings.

```css
/* src/renderer/src/styles/global.css:412-413 — current */
--ease-out-quart: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-quart: cubic-bezier(0.7, 0, 0.84, 0);

/* src/renderer/src/styles/global.css:586-588 — current */
&[data-state='closed'] {
  animation: materialize-out 100ms var(--ease-in-quart);
}
```

`--ease-in-quart` has exactly one consumer: this one rule.

## Target

Close on the same strong ease-out the open uses, and delete the now-unused token.

```css
/* target — src/renderer/src/styles/global.css */
&[data-state='closed'] {
  animation: materialize-out 100ms var(--ease-out-quart);
}
```

Delete the `--ease-in-quart` declaration entirely once the rule above no longer
references it. Do not change the 100ms duration — a close shorter than its open
(140ms) is correct and is not part of this plan.

## Repo conventions to follow

Easing curves are CSS custom properties declared together in the `@theme inline`
block of `src/renderer/src/styles/global.css` and referenced as
`var(--ease-out-quart)`. Never inline a raw `cubic-bezier()` at a call site.

## Steps

1. In `src/renderer/src/styles/global.css`, in the `@utility materialize` block,
   change the `data-state='closed'` animation's easing from
   `var(--ease-in-quart)` to `var(--ease-out-quart)`.
2. Confirm with `grep -rn "ease-in-quart" src/` that no consumers remain.
3. Delete the `--ease-in-quart: cubic-bezier(0.7, 0, 0.84, 0);` declaration.

## Out of scope

Durations, the `materialize-in` keyframe, the scale values in either keyframe,
and the choice of CSS keyframes over transitions (see plan 006 notes).

## Verification

- `grep -rn "ease-in-quart" src/` returns nothing.
- Open the composer's + menu and dismiss it with Escape. The menu should begin
  shrinking on the first frame after the key, not after a perceptible hold.
- Feel-check in DevTools at 10% speed: the close should leave fast and decelerate
  into nothing, mirroring the open.
