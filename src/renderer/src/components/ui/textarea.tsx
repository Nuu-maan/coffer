import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const textareaVariants = cva(
  [
    'field-sizing-content flex w-full text-base outline-none',
    'placeholder:text-muted-foreground/70',
    'disabled:cursor-not-allowed disabled:opacity-40',
    'transition-[background-color,box-shadow,border-color] duration-150'
  ],
  {
    variants: {
      variant: {
        default: [
          'min-h-16 rounded-xl border border-input bg-card px-3 py-2 shadow-card',
          'focus-visible:border-ring/50 focus-visible:ring-4 focus-visible:ring-ring/15',
          'aria-invalid:border-destructive aria-invalid:ring-destructive/20'
        ],
        // For text that should read as content, not as a field — inline editing
        // and the composer, where a box would be visual noise.
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
