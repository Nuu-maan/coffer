import * as React from 'react'
import { Separator as SeparatorPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  inset = false,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root> & {
  inset?: boolean
}): React.JSX.Element {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'shrink-0 bg-border',
        'data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full',
        'data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px',
        inset && 'data-[orientation=horizontal]:mx-3 data-[orientation=horizontal]:w-auto',
        className
      )}
      {...props}
    />
  )
}

export { Separator }
