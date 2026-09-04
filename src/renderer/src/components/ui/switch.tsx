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
          /*
           * The thumb takes its colour from the track it is sitting on, which
           * is the only way it survives both themes.
           *
           * It was always white. In light that is a white knob on the near-black
           * --tint and it reads at a glance; in dark --tint inverts to #ededed
           * and the same white knob went white-on-white — an On switch you had
           * to look twice at to find, next to an Off one you could see across
           * the room. --tint-foreground is the colour that is legible against
           * --tint by definition, and it is white in light mode, so light is
           * exactly as it was.
           *
           * Off is white in both, because there the track is a wash over the
           * card and white is what stands out on it.
           */
          className={cn(
            'pointer-events-none block rounded-full shadow-control ring-0',
            'transition-colors duration-150 ease-[var(--ease-out-quart)]',
            'group-data-[state=unchecked]/switch:bg-white',
            'group-data-[state=checked]/switch:bg-tint-foreground',
            'group-data-[size=default]/switch:size-[19px] group-data-[size=sm]/switch:size-[15px]',
            'group-data-[state=unchecked]/switch:mr-auto group-data-[state=checked]/switch:ml-auto'
          )}
        />
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  )
}

export { Switch }
