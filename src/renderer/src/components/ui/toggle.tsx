import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Toggle as TogglePrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

const toggleVariants = cva(
  [
    'press focus-halo inline-flex items-center justify-center gap-2 rounded-full',
    'text-sm font-medium whitespace-nowrap outline-none',
    'text-muted-foreground hover:text-foreground',
    'disabled:pointer-events-none disabled:opacity-40',
    'data-[state=on]:text-foreground',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
  ],
  {
    variants: {
      variant: {
        default: 'bg-transparent hover:bg-accent/60 data-[state=on]:bg-accent',
        outline: 'border border-border-strong bg-card shadow-card hover:bg-accent/60',
        // Sits inside a segmented track; the selected pill is drawn by the group.
        segment: 'bg-transparent'
      },
      size: {
        default: 'h-9 min-w-9 px-2.5',
        sm: 'h-8 min-w-8 px-2',
        lg: 'h-10 min-w-10 px-3'
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
