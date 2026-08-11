import * as React from 'react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import { motion } from 'motion/react'

import { cn } from '@/lib/utils'
import { springSnap } from '@/lib/motion'

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
        'press-sm focus-halo peer relative size-[14px] shrink-0 rounded-[3.5px]',
        'border border-input-border bg-control shadow-control outline-none',
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
        <motion.svg viewBox="0 0 14 14" fill="none" className="size-[11px]" aria-hidden="true">
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
