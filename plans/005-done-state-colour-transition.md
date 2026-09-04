# 005 — Tick a stash and let its text catch up

- **Status**: DONE
- **Commit**: 47a8143
- **Severity**: LOW
- **Category**: Missed opportunities
- **Estimated scope**: 1 file, 1 line

## Problem

Ticking a stash is one state change rendered at two speeds. The checkbox draws
its tick over 220ms (`springSnap`, `src/renderer/src/components/ui/checkbox.tsx`)
while the row's label teleports — the colour drops to muted and the strike-through
appears on the same frame as the click, because the row transitions only
background and shadow:

```tsx
/* src/renderer/src/features/list/ItemRow.tsx:217 — current */
'transition-[background-color,box-shadow] duration-100',

/* src/renderer/src/features/list/ItemRow.tsx:370 — current */
item.done && 'text-muted-foreground line-through decoration-current'
```

The result is that the half of the change the eye is on (the text) is over
before the half it is not (the tick) has started.

## Target

Transition the label's colour so the two halves of the change read as one. The
strike-through itself cannot be transitioned in CSS and should not be faked —
only the colour changes over time.

```tsx
/* target — src/renderer/src/features/list/ItemRow.tsx, on the label div */
'text-left text-base break-words whitespace-pre-wrap [text-wrap:pretty]',
'transition-colors duration-150',
```

150ms: inside the "hover / colour change" budget, and short enough that it lands
while the tick is still being drawn rather than after it.

## Repo conventions to follow

The row names its transitioned properties explicitly
(`transition-[background-color,box-shadow] duration-100`) rather than using
`transition-all`. `transition-colors` is Tailwind's named-property shorthand for
colour properties only and is used this way elsewhere in the file
(`ItemRow.tsx:322`, `ItemRow.tsx:334`).

## Steps

1. In `src/renderer/src/features/list/ItemRow.tsx`, on the `div` holding
   `{label}` (the one whose `cn()` starts with `'text-left text-base ...'`), add
   `'transition-colors duration-150'` as a class.
2. Change nothing about the `line-through` or the `item.done` condition.

## Out of scope

The checkbox's own animation, the image tiles' `opacity-40` on done, and the
`transition-[background-color,box-shadow]` list on the row itself.

## Verification

- Tick a stash. The text should fade to grey while the tick is still drawing,
  rather than greying instantly.
- Untick it. The colour should come back over the same 150ms.
