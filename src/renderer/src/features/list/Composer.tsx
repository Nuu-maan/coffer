import { useRef, useState } from 'react'
import {
  ArrowUp,
  Crop,
  ImagePlus,
  MousePointerSquareDashed,
  Plus,
  SectionPlus,
  X
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
import { coffer } from '@/lib/ipc'
import { MAX_IMAGES } from '@shared/constants'
import type { StagedImage } from '@/hooks/use-staged-images'
import { ease, springSnap } from '@/lib/motion'

type Props = {
  /** The typed line. With images waiting it is their caption. */
  onSubmit: (text: string) => void
  onNewSection: () => void
  /** Pictures waiting to go in, newest last. Empty is the ordinary case. */
  staged: StagedImage[]
  onRemoveStaged: (id: string) => void
  onAttach: (files: File[]) => Promise<void>
}

/* The field's resting height, and the height of the boxes the two round
   controls sit in. They are centred against it rather than bottom-aligned to
   it, so all three agree on a centreline while the field is one line tall and
   stay anchored at the foot once it is not. */
const FIELD = 30

export function Composer({
  onSubmit,
  onNewSection,
  staged,
  onRemoveStaged,
  onAttach
}: Props): React.JSX.Element {
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  /* Pictures alone are a stash. The caption is the optional half here, which is
     the other way round from a text stash and is why this is not just a length
     check on the field. */
  const canSubmit = text.trim().length > 0 || staged.length > 0

  function submit(): void {
    if (!canSubmit) return
    onSubmit(text.trim())
    setText('')
  }

  /* The picker itself is hidden and clicked through the ref — a file dialog has
     no styling worth keeping, and the menu item is the affordance. What comes
     back goes to the tray, the same as a paste or a drop: three ways in, one
     place they wait. */
  async function pickImages(files: FileList | null): Promise<void> {
    await onAttach(Array.from(files ?? []))
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
          className={cn(
            /* The composer *is* the card the text is about to become, so it is
               shaped like one: the cards' radius, the cards' fill. */
            'flex flex-col rounded-card p-[3px]',
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
            What is about to be stashed, above the line it will be captioned by.

            Above rather than beside: a strip of thumbnails in the same row as
            the field would take the width the caption is being typed into, and
            at four pictures there would be nothing left of it. Stacked, the
            composer grows by the height of one row of tiles and the field keeps
            every pixel it had.

            The tray is only here while there is something in it, so the resting
            composer is exactly the one line it has always been.
          */}
          <AnimatePresence initial={false}>
            {staged.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={ease}
                className="overflow-hidden"
              >
                {/* pt-2.5 rather than pt-1.5: the remove badges hang a corner
                    out past their tiles, and at the old inset the leftmost one
                    was sitting in the composer's own corner curve — a row of
                    discs crowding the top edge of the card they are inside. */}
                <div className="flex items-center gap-2 px-1.5 pt-2.5 pb-2">
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <AnimatePresence initial={false} mode="popLayout">
                      {staged.map((image) => (
                        <motion.div
                          key={image.id}
                          layout
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.7 }}
                          transition={springSnap}
                          /* The same square, sharing the width, that the stashed
                             row draws: at six the tray was a huddle of tiles in
                             the left third with the count marooned across an
                             empty half. They spread instead, and shrink as the
                             next one arrives — capped at 44px so one picture
                             does not stretch across the whole composer. */
                          className="relative aspect-square min-w-0 flex-1 basis-0 max-w-11"
                        >
                          <img
                            src={image.url}
                            alt=""
                            draggable={false}
                            /* The same square, cropped the same way, as the tile
                               the stash will draw once it exists — so what is
                               in the tray is a preview and not an approximation
                               of one. */
                            className="size-full rounded-inner bg-well object-cover object-center shadow-[inset_0_0_0_0.5px_var(--border)]"
                          />

                          {/*
                            Half off the corner, which is the one place on a
                            44px tile that is not covering the picture.

                            A HUD, like the copy mark on a stashed tile, rather
                            than the tint: --tint is the colour of the send
                            button and of a ticked box, which is to say the
                            colour of the thing you came here to do. Three white
                            discs shouting off the corners of three thumbnails
                            made "get rid of this" the loudest offer on the
                            panel.
                          */}
                          <button
                            type="button"
                            onClick={() => onRemoveStaged(image.id)}
                            aria-label="Remove this image"
                            className={cn(
                              'focus-halo absolute -top-1 -right-1 flex size-[15px] items-center justify-center',
                              'material-hud vibrant rounded-full shadow-hud outline-none',
                              'opacity-80 transition-opacity hover:opacity-100'
                            )}
                          >
                            <X className="size-2" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Only once the cap is in sight — past half of it. At two of
                      six it is a limit nobody has met yet, and saying it is the
                      panel talking about itself. */}
                  {staged.length * 2 > MAX_IMAGES && (
                    <span className="ml-auto shrink-0 text-2xs text-muted-foreground tabular-nums">
                      {staged.length} of {MAX_IMAGES}
                    </span>
                  )}
                </div>

                {/* A rule between the pictures and the line that captions them,
                    inset the way the settings rows are — the two are parts of
                    one stash, not two controls stacked up. */}
                <span aria-hidden className="mx-1.5 block h-px bg-separator" />
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ minHeight: FIELD }} className="flex items-end gap-1.5">
            {/*
              Everything that puts something in the panel, on the leading edge of
              the field it would otherwise be typed into.

              It spent a release in the title bar, on the theory that these are
              things you do to the panel rather than to the sentence being typed.
              True, and beside the point: they all end in a new card at the bottom
              of the list, which is what this end of the composer is for. The bar
              is thirty-eight pixels away from where the work happens.
            */}
            {/* FIELD tall rather than button-tall, so the glyph sits on the
                field's own centreline while the field is one line — a 26px box
                bottom-aligned to a 30px row put the + two pixels under the text
                it stands beside. Once the field grows the box stays at the foot
                and the + rides down with it. */}
            <div
              style={{ height: FIELD }}
              className="flex w-[26px] shrink-0 items-center justify-center self-end"
            >
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
                  {/* Greyed once the tray is full rather than silently taking
                      nothing — the dialog opening and the picture not arriving
                      is the worst of the three ways to say no. */}
                  <DropdownMenuItem
                    disabled={staged.length >= MAX_IMAGES}
                    onSelect={() => fileRef.current?.click()}
                  >
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
            <div
              style={{ height: FIELD }}
              className="flex w-[26px] shrink-0 items-center justify-center self-end"
            >
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
