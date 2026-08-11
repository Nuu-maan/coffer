import * as React from 'react'
import { Slider as SliderPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>): React.JSX.Element {
  const values = React.useMemo(
    () => (Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max]),
    [value, defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        'group/slider relative flex w-full touch-none items-center select-none',
        'data-[disabled]:opacity-40',
        'data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44',
        'data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col',
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          'relative grow overflow-hidden rounded-full bg-border',
          'data-[orientation=horizontal]:h-1 data-[orientation=horizontal]:w-full',
          'data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1'
        )}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(
            'absolute bg-foreground',
            'data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full'
          )}
        />
      </SliderPrimitive.Track>

      {Array.from({ length: values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className={cn(
            'block size-[18px] shrink-0 rounded-full bg-white shadow-float outline-none',
            'ring-1 ring-black/[0.06] transition-transform duration-150 ease-[var(--ease-out-quart)]',
            // The thumb grows under the finger so it stays visible while dragging.
            'hover:scale-110 focus-visible:scale-110 active:scale-125',
            'disabled:pointer-events-none'
          )}
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
