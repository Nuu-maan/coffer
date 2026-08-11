import * as React from 'react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import { AnimatePresence, motion } from 'motion/react'

import { cn } from '@/lib/utils'
import { springSnap } from '@/lib/motion'

/**
 * The rounded-square checkbox from the references. Checking is a commit, so it
 * gets the one bit of overshoot in the component set: the fill springs up from
 * the centre and the tick draws itself on top.
 */
function Checkbox({
  className,
  checked,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>): React.JSX.Element {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      checked={checked}
      className={cn(
        'press-sm focus-halo peer relative size-[18px] shrink-0 overflow-hidden rounded-[6px]',
        'border border-border-strong bg-card outline-none',
        'hover:border-muted-foreground/60',
        'disabled:cursor-not-allowed disabled:opacity-40',
        'data-[state=checked]:border-primary',
        className
      )}
      {...props}
    >
      <AnimatePresence initial={false}>
        {checked && (
          <motion.span
            key="fill"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.3, duration: 0.34 }}
            className="absolute inset-0 rounded-[5px] bg-primary"
          />
        )}
      </AnimatePresence>

      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        forceMount
        className="relative grid size-full place-content-center text-primary-foreground"
      >
        <motion.svg
          viewBox="0 0 14 14"
          fill="none"
          className="size-[13px]"
          initial={false}
          aria-hidden="true"
        >
          <motion.path
            d="M3 7.2 5.9 10 11 4"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
            transition={checked ? { ...springSnap, delay: 0.04 } : { duration: 0.1 }}
          />
        </motion.svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
