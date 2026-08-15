import { useRef, useState } from 'react'
import { ArrowUp, Crop, ImagePlus, MousePointerSquareDashed, Plus } from '@/components/icons'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { coffer } from '@/lib/ipc'
import { cn } from '@/lib/utils'
import { toBytes } from '@/lib/images'
import { springSnap } from '@/lib/motion'

type Props = {
  onSubmit: (text: string) => void
}

/* The field's resting height. The leading control is centred against it rather
   than bottom-aligned to it, so the two agree on a centreline while the field
   is one line tall and stay anchored at the foot once it is not. */
const FIELD = 28

/* The rows' radius rather than half the field's height. The composer is the row
   the text is about to become, and a capsule under a column of rounded cards
   read as a different kind of object. */
const RADIUS = 20

export function Composer({ onSubmit }: Props): React.JSX.Element {
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const canSubmit = text.trim().length > 0

  function submit(): void {
    const trimmed = text.trim()
    if (!trimmed) return
    onSubmit(trimmed)
    setText('')
  }

  async function pickImages(files: FileList | null): Promise<void> {
    for (const file of Array.from(files ?? [])) {
      const bytes = await toBytes(file)
      if (!bytes) {
        toast.error(`${file.name} is too large to stash`)
        continue
      }
      await coffer.items.addImage({ data: bytes })
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    /*
     * A layer over the list rather than a strip cut out of it. The hairline it
     * used to sit behind fenced the bottom of a small window into bands • a
     * translucent layer with the rows passing under it says the same thing
     * (this is chrome, that is content) without spending an edge on it.
     */
    <div className="material relative z-20">
      <div className="p-1.5">
        {/* One field, shaped like one: a capsule at rest, growing into a rounded
            box as the text wraps. The recess is what says it takes typing —
            on a dark ground a flat panel says nothing. */}
        <div
          data-focused={focused || undefined}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) areaRef.current?.focus()
          }}
          style={{ minHeight: FIELD, borderRadius: RADIUS }}
          className={cn(
            'flex items-end gap-1.5 px-px py-px',
            'border border-input-border bg-input shadow-[inset_0_1px_2px_var(--well)]',
            'transition-[border-color,box-shadow] duration-100',
            'data-[focused]:border-ring data-[focused]:ring-[3px] data-[focused]:ring-ring/30'
          )}
        >
          {/*
            Inside the field, on the row's own leading edge: what you type
            lines up with where it lands, and the one control that adds to the
            panel sits where a row's checkbox does rather than off to the side
            of the field it belongs to.
          */}
          <div className="flex size-[26px] shrink-0 items-center justify-center self-end">
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="hit-36" aria-label="Add">
                      <Plus />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Add to the panel</TooltipContent>
              </Tooltip>

              <DropdownMenuContent align="start" side="top" className="w-48">
                <DropdownMenuItem onSelect={() => void coffer.stash.selection()}>
                  <MousePointerSquareDashed />
                  Grab selection
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void coffer.clipper.start()}>
                  <Crop />
                  Clip a region
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => fileRef.current?.click()}>
                  <ImagePlus />
                  Add an image…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Textarea
            ref={areaRef}
            variant="bare"
            rows={1}
            value={text}
            placeholder="Type a stash…"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                submit()
              }
            }}
            /* Grown by field-sizing rather than by measuring: measuring after a
               submit reads the height of text React has not cleared yet, which
               is what left the box stuck open at its full height. */
            className="max-h-28 flex-1 self-center py-[4px] leading-snug"
          />

          {/* The slot is held open whether or not the button is in it, so the
              field does not lose 26px of width — and rewrap the line being
              typed — on the first character. */}
          <div className="flex size-[26px] shrink-0 items-center justify-center self-end">
            <AnimatePresence initial={false}>
              {canSubmit && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={springSnap}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="tint"
                        size="icon-sm"
                        aria-label="Add stash"
                        onClick={submit}
                      >
                        <ArrowUp />
                      </Button>
                    </TooltipTrigger>
                    {/* The one place the keys are worth saying. They had a
                        whole bar to themselves, which is a lot of the window
                        to spend on a hint you read once. */}
                    <TooltipContent>Return to stash · Shift-Return for a new line</TooltipContent>
                  </Tooltip>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => void pickImages(event.target.files)}
      />
    </div>
  )
}
