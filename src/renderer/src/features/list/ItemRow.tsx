import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Tag, X } from '@/components/icons'
import { AnimatePresence, Reorder, motion, useDragControls } from 'motion/react'
import { sameTag, type Item } from '@shared/types/item'
import { imageUrl } from '@shared/constants'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { usePlatform } from '@/hooks/use-platform'
import { STAGGER, spring, springSnap } from '@/lib/motion'

const LONG_TEXT = 320

/* How far the pointer has to travel before a press on a card becomes a carry.
   The whole card is the handle now, so the two have to be told apart by hand:
   under this it is a click — a copy, a tick, a delete — and over it the row
   comes up off the list. Four pixels is below what a hand holding still
   produces and well under what anyone reaching for another row does. */
const DRAG_SLOP = 4

export type SelectModifiers = { shift: boolean; toggle: boolean }

type Props = {
  item: Item
  index: number
  /** Every section there is, offered before the user names a new one. */
  tags: string[]
  selected: boolean
  /** How many rows the menu's actions would act on, this row included. */
  selectionSize: number
  /** How many rows are ticked — what Copy as list would take, if any are. */
  tickedCount: number
  /** Which mark is showing on this row, and on which picture. */
  copied: { what: 'image' | 'text'; index: number } | null
  onSelect: (modifiers: SelectModifiers) => void
  onContextMenu: () => void
  onCopy: (what: 'image' | 'text', index?: number) => void
  onCopySelection: (asList: boolean) => void
  onToggle: () => void
  onRemove: () => void
  onUpdate: (text: string) => void
  /** '' unfiles it. */
  onSetTag: (tag: string) => void
  /* Where the pointer is, while this row is being carried. The list uses it to
     work out which section the row is over — a Reorder.Group only ever reorders
     within itself, so crossing a caption has to be noticed out here. */
  onDragMove: (point: { x: number; y: number }) => void
  onDragEnd: () => void
}

export function ItemRow({
  item,
  index,
  tags,
  selected,
  selectionSize,
  tickedCount,
  copied,
  onSelect,
  onContextMenu,
  onCopy,
  onCopySelection,
  onToggle,
  onRemove,
  onUpdate,
  onSetTag,
  onDragMove,
  onDragEnd
}: Props): React.JSX.Element {
  const label = item.kind === 'text' ? item.text : item.caption
  const [editing, setEditing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [overText, setOverText] = useState(false)
  /* The index the pointer is over, or null. A boolean would light the mark on
     every picture in the row at once. */
  const [overImage, setOverImage] = useState<number | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState(label)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  /* Set when the editor is being opened from the menu rather than by a
     double-click, because only that path has a menu to close behind it. */
  const editRequested = useRef(false)
  const controls = useDragControls()
  /* Where a press landed, until it has either travelled far enough to be a drag
     or ended as a click. Null whenever there is no press worth watching. */
  const pressed = useRef<{ x: number; y: number } | null>(null)
  /* Whether the press that is ending actually carried the card somewhere. */
  const carried = useRef(false)

  /* macOS is the only place ⌘ and ⌫ mean anything. Everywhere else the menu has
     to say the keys that are actually on the keyboard. */
  const mac = usePlatform()?.platform === 'darwin'
  const keys = mac
    ? { copy: '⌘C', copyList: '⇧⌘C', remove: '⌫', move: '⌥↑↓' }
    : { copy: 'Ctrl C', copyList: 'Ctrl Shift C', remove: 'Del', move: 'Alt ↑↓' }

  const images = item.kind === 'image' ? item.images : []
  /* Which picture is wearing the tick, and whether the caption line is. Read
     out here so the two places that ask are asking the same question. */
  const markedImage = copied?.what === 'image' ? copied.index : null
  const markedText = copied?.what === 'text'
  const canCopyText = !editing && label.trim().length > 0
  const copyTextLabel = item.kind === 'image' ? 'Copy caption' : 'Copy text'
  const long = !editing && (label.length > LONG_TEXT || label.split('\n').length > 6)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  useEffect(() => {
    setDraft(label)
    setExpanded(false)
  }, [label])

  function commit(): void {
    setEditing(false)
    if (draft.trim() !== label) onUpdate(draft)
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild onContextMenu={onContextMenu}>
      <Reorder.Item
        value={item}
        dragListener={false}
        dragControls={controls}
        /*
         * The card is its own handle.
         *
         * It used to have a grip in the left margin, which cost every row 22px
         * of a 360px window to say a thing the row could say by being picked
         * up. Worse, it was the only way to move one: the affordance appeared
         * on hover, in the one place the eye is not looking, and a list whose
         * rows cannot be dragged by their middles is a list most people never
         * discover they can reorder at all.
         *
         * dragListener stays off and the drag is still started by hand, because
         * handing motion the whole card would make every click a two-pixel drag
         * and every copy a near miss. The press is watched instead, and only
         * promoted to a carry once it has travelled — see DRAG_SLOP.
         */
        onPointerDown={(event) => {
          /* Not the secondary button (that is the context menu), and not while
             the editor is open — a textarea is for selecting text in, and a
             row that walks off when you sweep across a word is unusable. */
          if (event.button !== 0 || editing) return
          if ((event.target as HTMLElement).closest('input, textarea, [contenteditable]')) return
          pressed.current = { x: event.clientX, y: event.clientY }
          carried.current = false
        }}
        onPointerMove={(event) => {
          const from = pressed.current
          if (!from) return
          if (Math.hypot(event.clientX - from.x, event.clientY - from.y) < DRAG_SLOP) return
          /* Cleared first: motion takes pointer capture from here and the moves
             keep arriving, and starting a drag that is already running throws. */
          pressed.current = null
          controls.start(event)
        }}
        onPointerUp={() => {
          pressed.current = null
        }}
        onPointerCancel={() => {
          pressed.current = null
        }}
        /*
         * A card that has been carried must not also be copied.
         *
         * The browser still delivers a click when a press ends over the same
         * element it began on, and the whole card is a copy target — so every
         * drag that landed near where it started put the row on the clipboard
         * as well as moving it. The click is swallowed in the capture phase,
         * before the text and the picture tiles ever see it.
         */
        onClickCapture={(event) => {
          if (!carried.current) return
          carried.current = false
          event.stopPropagation()
          event.preventDefault()
        }}
        onDragStart={() => {
          carried.current = true
          setDragging(true)
        }}
        onDrag={(_event, info) => onDragMove(info.point)}
        onDragEnd={() => {
          setDragging(false)
          onDragEnd()
        }}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        /* Exit faster than enter, and without the travel: on the way in the
           row is announcing itself, on the way out it is getting out of the
           way of the rows closing the gap behind it. */
        exit={{ opacity: 0, transition: { duration: 0.12 } }}
        transition={{
          ...spring,
          /*
           * The stagger is the entrance's and nothing else's.
           *
           * It used to sit on the component's transition — which is also its
           * *layout* transition — so every reorder handed each displaced row a
           * delay of up to 120ms, read from an index that had changed in the
           * same render. Drag a card past three others and the three closing
           * the gap behind it each set off at a different moment, none of them
           * the moment the card actually passed. That is the blink: not a
           * flicker, but rows arriving late and out of step.
           *
           * A drag is a high-frequency interaction, and nothing in one is
           * staggered. Layout gets the plain spring, undelayed, so every row
           * displaced by the same movement moves as one.
           */
          delay: Math.min(index * STAGGER, 0.12),
          layout: spring
        }}
        layout="position"
        data-slot="item-row"
        data-item-id={item.id}
        data-selected={selected || undefined}
        onMouseDown={(event) =>
          /* Ctrl-click is how macOS opens a context menu, and this row is a
             context menu trigger — so accepting it as the multi-select modifier
             there would add to the selection the menu is about to act on. ⌘ is
             the modifier on a Mac anyway. */
          onSelect({ shift: event.shiftKey, toggle: mac ? event.metaKey : event.ctrlKey })
        }
        style={{ position: 'relative' }}
        className={cn(
          'group list-none rounded-card bg-card',
          'transition-[background-color,box-shadow] duration-100',
          /* A row lights under the pointer, the way a row in a list does
             everywhere else. It is the only thing on the card saying it is one
             thing rather than a paragraph with a circle beside it. */
          !selected && !dragging && 'hover:bg-card-hover',
          !dragging && !selected && 'shadow-card',
          /* Selection fills rather than rings: several picked at once read as
             one run the way a file list's do, and a neutral fill leaves the
             text the contrast it had. */
          selected && 'bg-selected shadow-card',
          /* Lifted for the duration of a drag, above everything it is being
             carried over. No grab cursor at rest: the card's first offer is
             still the click that copies it, and a hand hovering every row says
             "drag me" over the top of that. */
          dragging && 'z-20 cursor-grabbing shadow-float'
        )}
      >
        <div className="flex items-stretch gap-2 px-2.5 py-2">
          <Checkbox
            shape="circle"
            checked={item.done}
            onCheckedChange={onToggle}
            aria-label={item.done ? 'Mark as not done' : 'Mark as done'}
            className="hit-36 mt-[1px] shrink-0 self-start"
          />

          {/*
            Not a button. It behaves like one for the pointer, but it is a whole
            card's worth of content with its own buttons inside it, and
            role="button" on a container that can never take focus announces a
            control to a screen reader that no screen-reader user can reach. The
            keyboard already copies with ⌘C and the context menu already offers
            it by name; both are real paths, and neither needs this to claim to
            be a control.
          */}
          <div
            onClick={() => {
              if (canCopyText) onCopy('text')
            }}
            onDoubleClick={() => setEditing(true)}
            onMouseEnter={() => setOverText(true)}
            onMouseLeave={() => setOverText(false)}
            className="-my-1.5 flex min-w-0 flex-1 flex-col justify-center gap-1 py-1.5"
          >
            {images.length > 0 && (
              /*
                 * One row of squares, however many there are, sized to share the
                 * width rather than to a fixed thumbnail.
                 *
                 * Every square is the same square: a list where each picture took
                 * its own shape made the left margin ragged and every row a
                 * different height, so the eye had to re-find the caption on each
                 * card. flex-1 with a cap is what lets four fit across a 360px
                 * window and still leaves one picture the size it was — a lone
                 * screenshot does not grow to fill the card just because it is
                 * alone.
                 */
              <div className="flex w-full items-start gap-1.5">
                {images.map((image, index) => (
                  /* A plain button. It was a motion.button for the tap scale
                     alone, and with that gone it was standing up a visual
                     element per tile — six of them on a full row — to animate
                     nothing. */
                  <button
                    key={image.file}
                    onClick={(event) => {
                      event.stopPropagation()
                      onCopy('image', index)
                    }}
                    onDoubleClick={(event) => {
                      event.stopPropagation()
                      setEditing(true)
                    }}
                    onMouseEnter={() => setOverImage(index)}
                    onMouseLeave={() =>
                      setOverImage((current) => (current === index ? null : current))
                    }
                    aria-label={
                      images.length > 1
                        ? `Copy image ${index + 1} of ${images.length}`
                        : 'Copy image'
                    }
                    /*
                     * No scale on the press, which is the one thing a picture
                     * cannot take.
                     *
                     * Scaling a tile hands the whole layer to the compositor to
                     * rasterise once and resample — and a screenshot of code is
                     * the worst case for that: every hairline of text and the
                     * 0.5px inset ring around the tile get filtered through a
                     * 2% downscale and come back as mush. The press was
                     * destroying the very pixels it was meant to confirm you
                     * had copied.
                     *
                     * A brightness dip says the same thing and touches no
                     * geometry, so nothing is resampled and the picture stays
                     * exactly as sharp as it was. The tick that follows is the
                     * confirmation proper; this is only the acknowledgement
                     * that the click landed.
                     */
                    className={cn(
                      /* Square, but only up to a point. A lone picture took the
                         full 112px the width allows and, being square, 112px of
                         height with it — a block taller than the caption and the
                         timestamp put together, for what is usually a wide
                         screenshot cropped down to its middle. The cap makes one
                         picture a plate rather than a slab, and leaves a row of
                         several alone: at four across a tile is 39px wide and
                         nowhere near it. */
                      'focus-halo relative aspect-square min-w-0 flex-1 basis-0 max-w-28 max-h-20',
                      'overflow-hidden rounded-inner outline-none',
                      'bg-well shadow-[inset_0_0_0_0.5px_var(--border)]',
                      'active:[&_img]:brightness-[0.86]'
                    )}
                  >
                    <img
                      src={imageUrl(image.file)}
                      alt={label || `Stashed image ${index + 1}`}
                      draggable={false}
                      /* Fills the square and is cropped to it, so a tall
                         screenshot and a wide one both read as the same tile.
                         Centre-weighted because that is where the subject of a
                         screenshot or a photo usually sits. */
                      className={cn(
                        /* Both properties named. The dip has to be quick — it is
                           the press — and the done fade is happy at the same
                           timing, so one transition covers the pair. */
                        'size-full object-cover object-center transition-[opacity,filter] duration-100',
                        item.done && 'opacity-40'
                      )}
                    />

                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <CopyMark
                        shown={overImage === index || markedImage === index}
                        done={markedImage === index}
                      />
                    </span>
                  </button>
                ))}
              </div>
            )}

            {editing ? (
              <Textarea
                ref={inputRef}
                variant="bare"
                rows={1}
                value={draft}
                placeholder={item.kind === 'image' ? 'Add a caption…' : ''}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commit}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    commit()
                  }
                  if (event.key === 'Escape') {
                    setDraft(label)
                    setEditing(false)
                  }
                }}
                className="text-base"
              />
            ) : (
              (item.kind === 'text' || label) && (
                <div className="flex flex-col items-start gap-0.5">
                  <div
                    className={cn(
                      'text-left text-base break-words whitespace-pre-wrap [text-wrap:pretty]',
                      /* Ticking a stash is one change rendered at two speeds:
                         the box draws its tick over 220ms while the label used
                         to grey out on the frame of the click. The half the eye
                         is on was over before the half it is not had started. */
                      'transition-colors duration-150',
                      long && !expanded && 'line-clamp-6',
                      /* Struck through in its own colour. It was drawn in
                         --border, which is a hairline value — right for an edge
                         between two surfaces and far too faint for a mark that
                         has to be read as a mark. At this size the rule has to
                         be as visible as the text it crosses out, or the row
                         just looks greyed. */
                      item.done && 'text-muted-foreground line-through decoration-current'
                    )}
                  >
                    {label}
                  </div>

                  {long && (
                    <button
                      onClick={(event) => {
                        event.stopPropagation()
                        setExpanded((current) => !current)
                      }}
                      onDoubleClick={(event) => event.stopPropagation()}
                      className="focus-halo rounded-[6px] px-0.5 text-xs font-medium text-tint outline-none transition-colors hover:text-tint-hover"
                    >
                      {expanded ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
              )
            )}

            {item.kind === 'image' && !label && !editing && (
              /* At the size the caption will be, not a size of its own. It was
                 text-xs standing in for a text-base line, so clicking it swapped
                 a 15px box for a 19px one and the card grew four pixels under
                 the pointer — twice, since committing the caption grew it again.
                 A placeholder that is not the shape of what replaces it makes
                 every edit start with a jump. */
              <button
                onClick={() => setEditing(true)}
                className="focus-halo self-start rounded-[6px] px-0.5 text-base text-muted-foreground outline-none transition-colors hover:text-foreground"
              >
                Add a caption
              </button>
            )}

            <div
              className="relative flex items-center gap-1.5 text-2xs text-muted-foreground tabular-nums"
            >
              <time dateTime={new Date(item.createdAt).toISOString()}>{time(item.createdAt)}</time>
              {item.source?.app && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{item.source.app}</span>
                </>
              )}

              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center">
                <CopyPill
                  shown={(overText && overImage === null && canCopyText) || markedText}
                  done={markedText}
                  idle={copyTextLabel}
                  confirmed={item.kind === 'image' ? 'Caption copied' : 'Text copied'}
                />
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onRemove}
            aria-label="Delete"
            className={cn(
              /* Top-aligned, on the same line as the tick box across the card,
                 rather than floating at the middle of a row whose height is
                 whatever its pictures and its caption came to. Centred, it
                 landed beside the timestamp on a tall row and beside the text
                 on a short one — a control that moves between rows is one the
                 pointer has to go looking for each time. */
              'hit-36 mt-[1px] self-start opacity-0 transition-opacity duration-100',
              'group-hover:opacity-100 focus-visible:opacity-100'
            )}
          >
            <X />
          </Button>
        </div>
      </Reorder.Item>
      </ContextMenuTrigger>

      {/*
        Named for what it will act on. With three rows picked, "Copy" copying
        one of them is the kind of surprise a list should never spring, so the
        count goes in the label.
      */}
      <ContextMenuContent
        /*
         * A closing menu hands focus back to whatever opened it. For Edit that
         * is fatal rather than merely wrong: the textarea mounts, takes focus,
         * loses it to the row a tick later, and its own onBlur commits and
         * closes the editor. The row flickered and nothing changed, which read
         * as Edit doing nothing at all.
         *
         * So when Edit is what closed the menu, the handback is called off and
         * the textarea keeps what it was given — a frame later, because the
         * menu closes and the field mounts in the same commit.
         */
        onCloseAutoFocus={(event) => {
          if (!editRequested.current) return
          editRequested.current = false
          event.preventDefault()
          requestAnimationFrame(() => inputRef.current?.focus())
        }}
      >
        <ContextMenuItem onSelect={() => onCopySelection(false)}>
          {selectionSize > 1 ? `Copy ${selectionSize} stashes` : copyTextLabel}
          <ContextMenuShortcut>{keys.copy}</ContextMenuShortcut>
        </ContextMenuItem>

        {/* Named for what it will actually take. This one does not act on the
            highlighted rows but on the ticked ones, and a menu item that
            silently acts on a different set than the one lit up in front of you
            is the sort of thing that gets reported as not working at all. With
            nothing ticked it falls back to the highlight and the label says
            nothing, because then there is nothing surprising to say. */}
        <ContextMenuItem onSelect={() => onCopySelection(true)}>
          {tickedCount > 0 ? `Copy ${tickedCount} done as a list` : 'Copy as list'}
          <ContextMenuShortcut>{keys.copyList}</ContextMenuShortcut>
        </ContextMenuItem>

        {images.length > 0 && (
          /* The first, because a menu opened on the row is not pointing at any
             one picture. Picking a particular one is a click on it. */
          <ContextMenuItem onSelect={() => onCopy('image', 0)}>
            {images.length > 1 ? 'Copy first image' : 'Copy image'}
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        <ContextMenuItem onSelect={onToggle}>
          {item.done ? 'Mark as not done' : 'Mark as done'}
          <ContextMenuShortcut>Space</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuItem disabled={!long} onSelect={() => setExpanded((open) => !open)}>
          {expanded ? 'Collapse' : 'Expand'}
        </ContextMenuItem>

        {/* Not an item that does anything — a line saying the keys exist.
            Dragging the card is the obvious way to move a row and it is also
            the only one anybody finds; the chord that does it without a pointer
            had nowhere to be read. */}
        <ContextMenuItem disabled>
          Move up or down
          <ContextMenuShortcut>{keys.move}</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/*
          Filing, flat rather than in a submenu. There is rarely more than a
          handful of sections, and a submenu costs a hover-and-wait for
          something that is one click here.
        */}
        {tags
          .filter((tag) => !sameTag(tag, item.tag))
          .map((tag) => (
            <ContextMenuItem key={tag} onSelect={() => onSetTag(tag)}>
              <Tag />
              {tag}
            </ContextMenuItem>
          ))}

        {item.tag && (
          <ContextMenuItem onSelect={() => onSetTag('')}>Remove from {item.tag}</ContextMenuItem>
        )}

        <ContextMenuItem
          disabled={selectionSize > 1}
          onSelect={() => {
            editRequested.current = true
            setEditing(true)
          }}
        >
          Edit
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem variant="destructive" onSelect={onRemove}>
          Delete
          <ContextMenuShortcut>{keys.remove}</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

/*
 * What the metadata line says when the pointer is over copyable text, and what
 * it says once it has been copied.
 *
 * A control rather than a HUD: it sits on the card, and a dark blurred chip
 * there was a hole punched in the row — it read as a tooltip that had got stuck
 * rather than as part of the card. The card's own raised fill, a hairline, and
 * the glyph that says what the click will do.
 *
 * The glyph is the reason it can be small. "Copy text" spelled out was carrying
 * the whole message on its own and needed the width to do it; a copy mark plus
 * the word reads at a glance and takes less room doing it.
 */
function CopyPill({
  shown,
  done,
  idle,
  confirmed
}: {
  shown: boolean
  done: boolean
  idle: string
  confirmed: string
}): React.JSX.Element {
  return (
    <AnimatePresence>
      {shown && (
        <motion.span
          /* Arrives from the trailing edge, which is where it lives and the
             direction the eye is already travelling. */
          initial={{ opacity: 0, x: 4 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 4 }}
          transition={springSnap}
          className={cn(
            'flex items-center gap-1 rounded-full whitespace-nowrap',
            'border border-border bg-elevated px-1.5 py-[1px]',
            'text-2xs font-medium text-foreground shadow-control'
          )}
        >
          {done ? <Check className="size-2.5" /> : <Copy className="size-2.5" />}
          {done ? confirmed : idle}
        </motion.span>
      )}
    </AnimatePresence>
  )
}

/*
 * The same offer over a picture, with the words taken out.
 *
 * "Copy image" and then "Image copied" was a sentence laid across the middle of
 * the artwork — on a 57px tile with four of them in a row it did not fit, and
 * on a lone one it was still reading out what the copy mark had already said.
 * The glyph is the whole message: a copy mark while the pointer is on it, a
 * tick once it has been taken. The button underneath carries the words, where
 * they belong and where a screen reader will actually find them.
 *
 * A HUD, unlike the inline pill: this floats on artwork the app knows nothing
 * about, so it has to bring its own ground.
 */
function CopyMark({ shown, done }: { shown: boolean; done: boolean }): React.JSX.Element {
  return (
    <AnimatePresence>
      {shown && (
        <motion.span
          aria-hidden="true"
          /* No edge to arrive from, so it scales up in place. */
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={springSnap}
          className={cn(
            'material-hud vibrant relative flex size-6 items-center justify-center',
            'rounded-full shadow-hud'
          )}
        >
          {/*
            Keyed, so the swap is a change of glyph the eye can follow rather
            than a silent substitution inside a chip that never moved.

            Both glyphs are in the disc at once, stacked, so the two cross —
            mode="wait" ran the outgoing one to nothing before the incoming one
            started, which is two animations where the eye reads one. Scale,
            opacity and blur together rather than scale alone: the blur is what
            stops a cross-fade looking like two glyphs overlapping.
          */}
          <AnimatePresence initial={false}>
            <motion.span
              key={done ? 'done' : 'idle'}
              initial={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
              transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {done ? <Check className="size-3" /> : <Copy className="size-3" />}
            </motion.span>
          </AnimatePresence>
        </motion.span>
      )}
    </AnimatePresence>
  )
}

function time(value: number): string {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit'
  })
}
