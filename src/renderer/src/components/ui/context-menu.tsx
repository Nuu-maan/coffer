import * as React from 'react'
import { ContextMenu as ContextMenuPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

/* The same surface and item as the dropdown menu: a menu is a menu wherever it
   was opened from, and two that differ by a few pixels read as a mistake. */
const surface =
  'materialize material-thick material-edge z-50 min-w-[10rem] overflow-hidden rounded-2xl p-1.5 text-popover-foreground shadow-overlay'

const item = [
  'relative flex cursor-pointer items-center gap-2 rounded-[14px] px-2.5 py-[5px]',
  'text-base outline-hidden select-none transition-colors duration-100',
  'focus:bg-accent-strong focus:text-foreground',
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  "[&_svg:not([class*='text-'])]:text-muted-foreground"
].join(' ')

function ContextMenu(
  props: React.ComponentProps<typeof ContextMenuPrimitive.Root>
): React.JSX.Element {
  return <ContextMenuPrimitive.Root data-slot="context-menu" {...props} />
}

function ContextMenuTrigger(
  props: React.ComponentProps<typeof ContextMenuPrimitive.Trigger>
): React.JSX.Element {
  return <ContextMenuPrimitive.Trigger data-slot="context-menu-trigger" {...props} />
}

function ContextMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Content>): React.JSX.Element {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        data-slot="context-menu-content"
        className={cn(
          surface,
          'max-h-(--radix-context-menu-content-available-height) overflow-y-auto',
          'origin-(--radix-context-menu-content-transform-origin)',
          className
        )}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  )
}

function ContextMenuItem({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Item> & {
  variant?: 'default' | 'destructive'
}): React.JSX.Element {
  return (
    <ContextMenuPrimitive.Item
      data-slot="context-menu-item"
      data-variant={variant}
      className={cn(
        item,
        'data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10',
        'data-[variant=destructive]:*:[svg]:text-destructive!',
        className
      )}
      {...props}
    />
  )
}

function ContextMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Separator>): React.JSX.Element {
  return (
    <ContextMenuPrimitive.Separator
      data-slot="context-menu-separator"
      className={cn('mx-1 my-1.5 h-px bg-border', className)}
      {...props}
    />
  )
}

function ContextMenuShortcut({
  className,
  ...props
}: React.ComponentProps<'span'>): React.JSX.Element {
  return (
    <span
      data-slot="context-menu-shortcut"
      className={cn('ml-auto pl-6 text-xs text-muted-foreground', className)}
      {...props}
    />
  )
}

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut
}
