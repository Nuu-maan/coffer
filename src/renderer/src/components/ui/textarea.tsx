import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { inputVariants } from './input'

const textareaVariants = cva('', {
  variants: {
    variant: {
      /* Same field as Input, so a caption box and a text box match. */
      default: cn(inputVariants(), 'resize-none'),
      /* No chrome at all: for editing text in place, inside a row. */
      bare: [
        'field-sizing-content flex w-full resize-none bg-transparent p-0 text-base outline-none',
        'placeholder:text-muted-foreground',
        'disabled:cursor-not-allowed disabled:opacity-40'
      ]
    }
  },
  defaultVariants: {
    variant: 'default'
  }
})

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
