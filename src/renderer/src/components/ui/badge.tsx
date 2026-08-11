import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  [
    'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden',
    'rounded-full border border-transparent px-2 whitespace-nowrap',
    'transition-[color,box-shadow,background-color] duration-100',
    '[&>svg]:pointer-events-none [&>svg]:size-3'
  ],
  {
    variants: {
      variant: {
        default: 'bg-tint text-tint-foreground font-medium',
        secondary: 'bg-secondary text-secondary-foreground font-medium',
        tint: 'bg-tint-soft text-tint font-medium',
        destructive: 'bg-destructive text-destructive-foreground font-medium',
        outline: 'border-border-strong text-muted-foreground font-medium',
        dashed: 'border-dashed border-border-strong text-muted-foreground',
        glass: 'material-thin material-edge vibrant text-foreground',
        hud: 'material-hud vibrant',
        ghost: 'text-muted-foreground'
      },
      size: {
        default: 'h-[17px] text-xs',
        sm: 'h-[15px] px-1.5 text-2xs',
        lg: 'h-[21px] px-2.5 text-sm'
      },
      numeric: {
        true: 'tabular-nums',
        false: ''
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      numeric: false
    }
  }
)

function Badge({
  className,
  variant = 'default',
  size = 'default',
  numeric = false,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }): React.JSX.Element {
  const Comp = asChild ? Slot.Root : 'span'

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant, size, numeric }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
