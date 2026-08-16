import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Toggle as TogglePrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

const toggleVariants = cva(
  [
    'press focus-halo inline-flex items-center justify-center gap-1.5 rounded-full',
    'text-sm font-medium whitespace-nowrap outline-none',
    'text-muted-foreground hover:text-foreground',
    'disabled:pointer-events-none disabled:opacity-40',
    'data-[state=on]:text-foreground',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5"
  ],
  {
    variants: {
      variant: {
        default: 'bg-transparent hover:bg-accent data-[state=on]:bg-accent',
        outline: 'border border-border-strong bg-control shadow-control hover:bg-control-active',
        segment: 'bg-transparent'
      },
      size: {
        default: 'h-[26px] min-w-[26px] px-2',
        sm: 'h-[22px] min-w-[22px] px-1.5',
        lg: 'h-8 min-w-8 px-2.5'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>): React.JSX.Element {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
