import { useRef, useState } from 'react'
import {
  ArrowUp,
  Crop,
  ImagePlus,
  MousePointerSquareDashed,
  Plus,
  SectionPlus
} from '@/components/icons'
import { AnimatePresence, motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { coffer } from '@/lib/ipc'
import { toBytes } from '@/lib/images'
import { springSnap } from '@/lib/motion'

type Props = {
  onSubmit: (text: string) => void
  onNewSection: () => void
}

/* The field's resting height. The leading control is centred against it rather
   than bottom-aligned to it, so the two agree on a centreline while the field
   is one line tall and stay anchored at the foot once it is not. */
const FIELD = 28


export function Composer({ onSubmit, onNewSection }: Props): React.JSX.Element {
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

  /* The picker itself is hidden and clicked through the ref — a file dialog has
     no styling worth keeping, and the menu item is the affordance. */
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
     * Nothing behind it. The field used to sit on a translucent band spanning
     * the window, which was the third thing in a row to try to fence off the
     * bottom of the panel — first a hairline, then a strip, then a material
     * layer. All three drew a line across a window that is 380 pixels wide.
     *
     * The field is enough on its own. It is opaque, it is lifted, and the rows
     * passing under it are cut off by its edge rather than by a band around it
     * — which says "this floats over that" without spending a horizon on it.
     */
    <div className="relative z-20">
      <div className="px-3 pt-2 pb-3">
        {/* One field, one shape. It used to square off as the text wrapped —
            a capsule at one line, a box at two — which is a transition the
            cards under it do not make, and at the radius the window is drawn
            at now there is nothing left to square off from. */}
        <div
          data-focused={focused || undefined}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) areaRef.current?.focus()
          }}
          style={{ minHeight: FIELD }}
          className={cn(
            /* The composer *is* the card the text is about to become, so it is
               shaped like one: the cards' radius, the cards' fill. */
            'flex items-end gap-1.5 rounded-card px-px py-px',
            /* Filled, not outlined — the same card fill the stashes have. The
               border and the inset recess were the field saying twice over
               that it takes typing; the fill says it once and the focus halo
               says the rest. */
            /* Filled, and lifted. It used to borrow the band's separation and
               only needed a card's shadow; standing on the list on its own it
               has to cast the shadow itself. */
            'bg-card shadow-float',
            'transition-[box-shadow] duration-100',
            'data-[focused]:ring-[3px] data-[focused]:ring-ring/30'
          )}
        >
          {/*
            Everything that puts something in the panel, on the leading edge of
            the field it would otherwise be typed into.

            It spent a release in the title bar, on the theory that these are
            things you do to the panel rather than to the sentence being typed.
            True, and beside the point: they all end in a new card at the bottom
            of the list, which is what this end of the composer is for. The bar
            is thirty-eight pixels away from where the work happens.
          */}
          <div className="flex size-[26px] shrink-0 items-center justify-center self-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Add"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Plus />
                </Button>
              </DropdownMenuTrigger>

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

                <DropdownMenuSeparator />

                {/* The one thing here that does not make a card. It makes the
                    caption a card can be filed under, which until now could
                    only be brought into being by filing a card under a name
                    nobody had used yet — a section you could not make before
                    you had something to put in it. */}
                <DropdownMenuItem onSelect={onNewSection}>
                  <SectionPlus />
                  New section
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Textarea
            ref={areaRef}
            variant="bare"
            rows={1}
            value={text}
            /* A placeholder is not a label — it is gone the moment there is
               anything to read out. */
            aria-label="Add a stash"
            placeholder="Add a note or a prompt"
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
