import * as React from 'react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import { motion } from 'motion/react'

import { cn } from '@/lib/utils'
import { springSnap } from '@/lib/motion'

/*
 * `shape` because the two shapes mean different things and the app uses both.
 * A square box is a form control being ticked, which is what settings has. A
 * circle is an item in a list being marked off — the shape a reminders app
 * uses, and the one the stash list wants, where the control belongs to the
 * card rather than to a field.
 */
function Checkbox({
  className,
  checked,
  shape = 'square',
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> & {
  shape?: 'square' | 'circle'
}): React.JSX.Element {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      checked={checked}
      className={cn(
        'press focus-halo peer relative shrink-0',
        shape === 'circle' ? 'size-[17px] rounded-full' : 'size-[14px] rounded-[4px]',
        /* Border only. shadow-control puts a ring outside this border, which at
           14px is two edges inside three pixels. */
        'border border-input-border bg-control outline-none',
        'transition-colors duration-100',
        'hover:border-border-strong',
        'cursor-pointer disabled:cursor-not-allowed disabled:opacity-40',
        'data-[state=checked]:border-tint data-[state=checked]:bg-tint',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        forceMount
        className="grid size-full place-content-center text-tint-foreground"
      >
        <motion.svg
          viewBox="0 0 14 14"
          fill="none"
          className={shape === 'circle' ? 'size-[12px]' : 'size-[11px]'}
          aria-hidden="true"
        >
          <motion.path
            d="M3 7.2 5.9 10 11 4"
            stroke="currentColor"
            strokeWidth={2.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
            transition={checked ? springSnap : { duration: 0.08 }}
          />
        </motion.svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
