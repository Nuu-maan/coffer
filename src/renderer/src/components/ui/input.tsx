import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/**
 * Shared with Textarea so a multi-line field is visually the same control as a
 * single-line one.
 */
const inputVariants = cva(
  [
    'flex w-full min-w-0 rounded-md text-base outline-none',
    'border border-input-border bg-input text-foreground',
    'placeholder:text-muted-foreground/70',
    'transition-[color,background-color,border-color,box-shadow] duration-100',
    'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30',
    'aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/25',
    'disabled:cursor-not-allowed disabled:opacity-40',
    'file:inline-flex file:border-0 file:bg-transparent file:text-sm file:font-medium'
  ],
  {
    variants: {
      size: {
        sm: 'px-2 py-[3px]',
        default: 'px-2.5 py-1.5'
      }
    },
    defaultVariants: {
      size: 'default'
    }
  }
)

function Input({
  className,
  type,
  size,
  ...props
}: Omit<React.ComponentProps<'input'>, 'size'> &
  VariantProps<typeof inputVariants>): React.JSX.Element {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputVariants({ size }), 'h-[26px]', className)}
      {...props}
    />
  )
}

export { Input, inputVariants }
