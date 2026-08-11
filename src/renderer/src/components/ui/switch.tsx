import * as React from 'react'
import { Switch as SwitchPrimitive } from 'radix-ui'
import { motion } from 'motion/react'

import { cn } from '@/lib/utils'

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
        'focus-halo peer group/switch relative inline-flex shrink-0 cursor-pointer items-center rounded-full',
        'p-[1.5px] outline-none transition-colors duration-150 ease-[var(--ease-out-quart)]',
        'disabled:cursor-not-allowed disabled:opacity-40',
        'data-[size=default]:h-[22px] data-[size=default]:w-[38px]',
        'data-[size=sm]:h-[18px] data-[size=sm]:w-[30px]',
        'data-[state=unchecked]:bg-border-strong data-[state=checked]:bg-tint',
        'shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.06)]',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb asChild>
        <motion.span
          data-slot="switch-thumb"
          layout
          transition={{ type: 'spring', bounce: 0.15, duration: 0.24 }}
          className={cn(
            'pointer-events-none block rounded-full bg-white shadow-control ring-0',
            'group-data-[size=default]/switch:size-[19px] group-data-[size=sm]/switch:size-[15px]',
            'group-data-[state=unchecked]/switch:mr-auto group-data-[state=checked]/switch:ml-auto'
          )}
        />
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  )
}

export { Switch }
