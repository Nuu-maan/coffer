import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'press focus-halo relative inline-flex shrink-0 items-center justify-center gap-1.5',
    'rounded-md font-medium whitespace-nowrap outline-none select-none',
    'disabled:pointer-events-none disabled:opacity-40',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5"
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-control text-control-foreground shadow-control',
          'hover:bg-control-active active:bg-control-active'
        ],
        tint: 'bg-tint text-tint-foreground shadow-control hover:bg-tint-hover',
        primary: 'bg-tint text-tint-foreground shadow-control hover:bg-tint-hover',
        destructive: 'bg-destructive text-destructive-foreground shadow-control',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-control-active',
        outline: 'border border-border-strong bg-transparent text-foreground hover:bg-accent',
        ghost: 'text-muted-foreground hover:bg-accent hover:text-foreground',
        glass: 'material-thin material-edge vibrant text-foreground shadow-control',
        glassProminent: 'material material-edge vibrant text-foreground shadow-card',
        link: 'text-tint underline-offset-2 hover:underline'
      },
      size: {
        default: 'h-[26px] px-3 text-base has-[>svg]:px-2.5',
        xs: "h-[18px] gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3 has-[>svg]:px-1.5",
        sm: 'h-[22px] px-2.5 text-sm has-[>svg]:px-2',
        lg: 'h-8 px-4 text-md has-[>svg]:px-3.5',
        icon: 'size-[26px]',
        'icon-xs': "size-[18px] [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-[22px]',
        'icon-lg': 'size-8'
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
