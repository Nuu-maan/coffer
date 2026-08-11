import * as React from 'react'
import { Label as LabelPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>): React.JSX.Element {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'flex items-center gap-2 text-base leading-none font-normal select-none',
        'group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-40',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-40',
        className
      )}
      {...props}
    />
  )
}

export { Label }
