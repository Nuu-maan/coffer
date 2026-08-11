import * as React from 'react'
import { Switch as SwitchPrimitive } from 'radix-ui'
import { motion } from 'motion/react'

import { cn } from '@/lib/utils'

/**
 * The iOS switch: a thumb that is thrown across the track. The travel gets the
 * one spring with real overshoot in the settings panel, because a switch is the
 * most physical control there — it should feel like something you flicked.
 */
function Switch({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: 'sm' | 'default'
}): React.JSX.Element {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        'focus-halo peer group/switch relative inline-flex shrink-0 items-center rounded-full',
        'p-[2px] outline-none transition-colors duration-200 ease-[var(--ease-out-quart)]',
        'disabled:cursor-not-allowed disabled:opacity-40',
        'data-[size=default]:h-[26px] data-[size=default]:w-[44px]',
        'data-[size=sm]:h-[20px] data-[size=sm]:w-[34px]',
        'data-[state=unchecked]:bg-border-strong data-[state=checked]:bg-tint',
        'dark:data-[state=unchecked]:bg-input',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb asChild>
        <motion.span
          data-slot="switch-thumb"
          layout
          transition={{ type: 'spring', bounce: 0.22, duration: 0.32 }}
          className={cn(
            'pointer-events-none block rounded-full shadow-raised ring-0',
            'group-data-[size=default]/switch:size-[22px] group-data-[size=sm]/switch:size-4',
            'group-data-[state=unchecked]/switch:mr-auto group-data-[state=checked]/switch:ml-auto',
            // In a monochrome app the "on" track is ink, so the thumb has to be
            // the opposite of whatever the track just became — otherwise the
            // two are the same colour and the thumb disappears.
            'bg-white dark:group-data-[state=checked]/switch:bg-tint-foreground'
          )}
        />
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  )
}

export { Switch }
