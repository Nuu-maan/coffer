import * as React from 'react'
import { ScrollArea as ScrollAreaPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

function ScrollArea({
  className,
  children,
  onViewportScroll,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  /* Radix scrolls the viewport, not the root, so a caller that wants to know
     how far down the content is cannot listen on the element it was handed. */
  onViewportScroll?: React.UIEventHandler<HTMLDivElement>
}): React.JSX.Element {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      scrollHideDelay={600}
      className={cn('group/scroll relative', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        onScroll={onViewportScroll}
        /*
         * Radix wraps the children in a `display: table` box so that content
         * wider than the viewport can be scrolled to sideways. Nothing in this
         * app wants that: every panel in here is a column that should wrap or
         * scroll inside itself. A table shrink-wraps to its widest child, so
         * one unwrappable line — the config snippet on the Wayland shortcuts
         * panel — widened the box and took every card in the panel out past the
         * window edge with it.
         *
         * Forcing it back to a block makes the column the window's width and
         * leaves the overflow where it belongs: on the element that has it.
         * The bang is because the display is an inline style on Radix's own
         * element, which a class cannot otherwise reach.
         */
        className="size-full rounded-[inherit] outline-none [&>div]:!block"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>): React.JSX.Element {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        'z-20 flex touch-none p-0.5 opacity-0 transition-opacity duration-200 select-none',
        'data-[state=visible]:opacity-100 group-hover/scroll:opacity-100',
        orientation === 'vertical' && 'h-full w-[9px]',
        orientation === 'horizontal' && 'h-[9px] flex-col',
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-foreground/25 transition-colors hover:bg-foreground/40"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
