import * as React from 'react'
import { type VariantProps } from 'class-variance-authority'
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui'
import { LayoutGroup, motion } from 'motion/react'

import { cn } from '@/lib/utils'
import { toggleVariants } from '@/components/ui/toggle'
import { springSnap } from '@/lib/motion'

type Context = VariantProps<typeof toggleVariants> & {
  value?: string
  groupId: string
}

const ToggleGroupContext = React.createContext<Context>({
  size: 'default',
  variant: 'default',
  groupId: 'toggle-group'
})

function ToggleGroup({
  className,
  variant = 'segment',
  size,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
  VariantProps<typeof toggleVariants>): React.JSX.Element {
  const groupId = React.useId()
  const selected = props.type === 'single' ? props.value : undefined

  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      className={cn(
        'group/toggle-group relative flex w-fit items-center rounded-full',
        /* A plain well, matching TabsList. */
        variant === 'segment' && 'gap-0 bg-well p-[2px]',
        variant === 'outline' && 'gap-1',
        variant === 'default' && 'gap-1',
        className
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size, value: selected, groupId }}>
        <LayoutGroup id={groupId}>{children}</LayoutGroup>
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  )
}

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  value,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> &
  VariantProps<typeof toggleVariants>): React.JSX.Element {
  const context = React.useContext(ToggleGroupContext)
  const resolvedVariant = context.variant || variant
  const active = context.value !== undefined && context.value === value

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={resolvedVariant}
      data-size={context.size || size}
      value={value}
      className={cn(
        toggleVariants({ variant: resolvedVariant, size: context.size || size }),
        'relative w-auto min-w-0 shrink-0 focus:z-10 focus-visible:z-10',
        resolvedVariant === 'segment' && 'px-2.5',
        className
      )}
      {...props}
    >
      {active && resolvedVariant === 'segment' && (
        <motion.span
          layoutId="segment-indicator"
          transition={springSnap}
          className="absolute inset-0 rounded-full bg-control shadow-control"
        />
      )}
      <span className="relative z-10 flex items-center gap-1.5">{children}</span>
    </ToggleGroupPrimitive.Item>
  )
}

export { ToggleGroup, ToggleGroupItem }
