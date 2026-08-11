import * as React from 'react'
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { Select as SelectPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

function Select(props: React.ComponentProps<typeof SelectPrimitive.Root>): React.JSX.Element {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectGroup(
  props: React.ComponentProps<typeof SelectPrimitive.Group>
): React.JSX.Element {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

function SelectValue(
  props: React.ComponentProps<typeof SelectPrimitive.Value>
): React.JSX.Element {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
  className,
  size = 'default',
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: 'sm' | 'default'
}): React.JSX.Element {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        'press focus-halo group flex w-fit items-center justify-between gap-2 rounded-full',
        'border border-border-strong bg-card px-3.5 text-base whitespace-nowrap shadow-card outline-none',
        'hover:bg-accent/60',
        'disabled:cursor-not-allowed disabled:opacity-40',
        'data-[placeholder]:text-muted-foreground',
        'data-[size=default]:h-9 data-[size=sm]:h-8',
        'aria-invalid:border-destructive',
        '*:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        {/* The chevron turns over as the menu opens, so the control shows its
            own state rather than relying on the menu being visible. */}
        <ChevronDownIcon className="text-muted-foreground transition-transform duration-200 ease-[var(--ease-out-quart)] group-data-[state=open]:rotate-180" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  position = 'popper',
  align = 'center',
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>): React.JSX.Element {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          'materialize material-thick material-edge relative z-50 min-w-[8rem] overflow-hidden rounded-xl p-1',
          'max-h-(--radix-select-content-available-height)',
          'origin-(--radix-select-content-transform-origin) text-popover-foreground shadow-overlay',
          className
        )}
        position={position}
        align={align}
        sideOffset={sideOffset}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            'p-0.5',
            position === 'popper' && 'w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1'
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>): React.JSX.Element {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn(
        'px-2 py-1.5 text-xs font-medium tracking-[0.06em] text-muted-foreground uppercase',
        className
      )}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>): React.JSX.Element {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        'relative flex w-full cursor-default items-center gap-2 rounded-lg py-1.5 pr-8 pl-2.5',
        'text-base outline-hidden select-none',
        'transition-colors duration-100',
        'focus:bg-accent focus:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span
        data-slot="select-item-indicator"
        className="absolute right-2.5 flex size-3.5 items-center justify-center text-tint"
      >
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-3.5" strokeWidth={2.5} />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>): React.JSX.Element {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn('pointer-events-none -mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>): React.JSX.Element {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        'flex cursor-default items-center justify-center py-1 text-muted-foreground',
        className
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>): React.JSX.Element {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        'flex cursor-default items-center justify-center py-1 text-muted-foreground',
        className
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue
}
