import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const textareaVariants = cva(
  [
    'field-sizing-content flex w-full text-base outline-none',
    'placeholder:text-muted-foreground/70',
    'disabled:cursor-not-allowed disabled:opacity-40',
    'transition-[background-color,box-shadow,border-color] duration-100'
  ],
  {
    variants: {
      variant: {
        default: [
          'min-h-14 rounded-md border border-input-border bg-input px-2.5 py-1.5',
          'shadow-[inset_0_1px_1px_rgb(0_0_0/0.04)]',
          'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30',
          'aria-invalid:border-destructive aria-invalid:ring-destructive/25'
        ],
        bare: 'min-h-0 resize-none bg-transparent p-0'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

function Textarea({
  className,
  variant,
  ...props
}: React.ComponentProps<'textarea'> & VariantProps<typeof textareaVariants>): React.JSX.Element {
  return (
    <textarea
      data-slot="textarea"
      className={cn(textareaVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Textarea, textareaVariants }
