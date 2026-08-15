import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Tabs as TabsPrimitive } from 'radix-ui'
import { LayoutGroup, motion } from 'motion/react'

import { cn } from '@/lib/utils'
import { springSnap } from '@/lib/motion'

const TabsContext = React.createContext<{ value?: string; id: string }>({ id: 'tabs' })

function Tabs({
  className,
  orientation = 'horizontal',
  value,
  defaultValue,
  onValueChange,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>): React.JSX.Element {
  const id = React.useId()
  const [internal, setInternal] = React.useState(defaultValue)
  const current = value ?? internal

  return (
    <TabsContext.Provider value={{ value: current, id }}>
      <TabsPrimitive.Root
        data-slot="tabs"
        data-orientation={orientation}
        orientation={orientation}
        value={value}
        defaultValue={defaultValue}
        onValueChange={(next) => {
          setInternal(next)
          onValueChange?.(next)
        }}
        className={cn('group/tabs flex gap-2 data-[orientation=horizontal]:flex-col', className)}
        {...props}
      />
    </TabsContext.Provider>
  )
}

const tabsListVariants = cva(
  [
    /* A capsule track holding capsule segments: a 2px inset off a capsule is
       still a capsule, so the indicator and its well stay concentric. */
    'group/tabs-list relative inline-flex w-fit items-center justify-center rounded-full p-[2px]',
    'text-muted-foreground',
    'group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col'
  ],
  {
    variants: {
      variant: {
        default: 'bg-well shadow-[inset_0_0_0_0.5px_var(--border)]',
        glass: 'material-thin material-edge',
        line: 'gap-1 rounded-none bg-transparent p-0'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

function TabsList({
  className,
  variant = 'default',
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>): React.JSX.Element {
  const { id } = React.useContext(TabsContext)

  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      <LayoutGroup id={id}>{children}</LayoutGroup>
    </TabsPrimitive.List>
  )
}

function TabsTrigger({
  className,
  children,
  value,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>): React.JSX.Element {
  const context = React.useContext(TabsContext)
  const active = context.value === value

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      value={value}
      className={cn(
        'focus-halo relative inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5',
        'rounded-full px-3 py-0.5 text-sm font-medium whitespace-nowrap',
        'text-muted-foreground transition-colors duration-100 outline-none',
        'hover:text-foreground data-[state=active]:text-foreground',
        'disabled:pointer-events-none disabled:opacity-40',
        'group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        className
      )}
      {...props}
    >
      {active && (
        <motion.span
          layoutId="tab-indicator"
          transition={springSnap}
          className={cn(
            'absolute inset-0 -z-0 rounded-full',
            'group-data-[variant=default]/tabs-list:bg-control group-data-[variant=default]/tabs-list:shadow-control',
            'group-data-[variant=glass]/tabs-list:bg-control group-data-[variant=glass]/tabs-list:shadow-control',
            'group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:bg-transparent',
            'group-data-[variant=line]/tabs-list:border-b-2 group-data-[variant=line]/tabs-list:border-tint'
          )}
        />
      )}
      <span className="relative z-10 flex items-center gap-1.5">{children}</span>
    </TabsPrimitive.Trigger>
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>): React.JSX.Element {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
