import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'press focus-halo relative inline-flex shrink-0 items-center justify-center gap-1.5',
    'rounded-full font-medium whitespace-nowrap outline-none select-none',
    'disabled:pointer-events-none disabled:opacity-40',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
  ],
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-card hover:bg-primary/90',
        tint: 'bg-tint text-tint-foreground shadow-card hover:brightness-110',
        destructive: 'bg-destructive text-destructive-foreground shadow-card hover:brightness-110',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-accent',
        outline:
          'border border-border-strong bg-card text-foreground shadow-card hover:bg-accent/60',
        ghost: 'text-muted-foreground hover:bg-accent hover:text-foreground',
        // Glass. Sits on top of content and lets it show through — reserve it
        // for controls that float over the list rather than sit in a panel.
        glass: 'material-thin material-edge vibrant text-foreground shadow-card hover:brightness-[1.06]',
        glassProminent:
          'material material-edge vibrant text-foreground shadow-raised hover:brightness-[1.06]',
        link: 'text-tint underline-offset-4 hover:underline'
      },
      size: {
        default: "h-9 px-4 text-base has-[>svg]:px-3.5",
        xs: "h-6 gap-1 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3 has-[>svg]:px-2",
        sm: 'h-8 px-3.5 text-sm has-[>svg]:px-3',
        lg: 'h-11 px-6 text-md has-[>svg]:px-5',
        icon: 'size-9',
        'icon-xs': "size-6 [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8',
        'icon-lg': 'size-11'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }): React.JSX.Element {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
