import { useEffect, useRef, useState } from 'react'
import { Check, Copy, GripVertical, Tag, X } from '@/components/icons'
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

export type SelectModifiers = { shift: boolean; toggle: boolean }

type Props = {
  item: Item
  index: number
  /** Every section there is, offered before the user names a new one. */
  tags: string[]
  selected: boolean
  /** How many rows the menu's actions would act on, this row included. */
  selectionSize: number
  copied: 'image' | 'text' | null
  onSelect: (modifiers: SelectModifiers) => void
  onContextMenu: () => void
  onCopy: (what: 'image' | 'text') => void
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
  const [overImage, setOverImage] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState(label)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  /* Set when the editor is being opened from the menu rather than by a
     double-click, because only that path has a menu to close behind it. */
  const editRequested = useRef(false)
  const controls = useDragControls()

  /* macOS is the only place ⌘ and ⌫ mean anything. Everywhere else the menu has
     to say the keys that are actually on the keyboard. */
  const mac = usePlatform()?.platform === 'darwin'
  const keys = mac
    ? { copy: '⌘C', copyList: '⇧⌘C', remove: '⌫', move: '⌥↑↓' }
    : { copy: 'Ctrl C', copyList: 'Ctrl Shift C', remove: 'Del', move: 'Alt ↑↓' }

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
        onDragStart={() => setDragging(true)}
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
        transition={{ ...spring, delay: Math.min(index * STAGGER, 0.12) }}
        layout="position"
        data-slot="item-row"
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
             carried over. */
          dragging && 'z-20 shadow-float'
        )}
      >
        <div className="flex items-stretch gap-2 px-2.5 py-2">
          <button
            aria-label="Reorder"
            onPointerDown={(event) => {
              event.preventDefault()
              controls.start(event)
            }}
            className={cn(
              'focus-halo hit-36 mt-[2px] shrink-0 cursor-grab touch-none self-start',
              'rounded-full opacity-0 outline-none',
              'text-current/40 transition-opacity duration-100 active:cursor-grabbing',
              'group-hover:opacity-100 focus-visible:opacity-100'
            )}
          >
            <GripVertical className="size-3.5" />
          </button>

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
            {item.kind === 'image' && (
              <motion.button
                onClick={(event) => {
                  event.stopPropagation()
                  onCopy('image')
                }}
                onDoubleClick={(event) => {
                  event.stopPropagation()
                  setEditing(true)
                }}
                onMouseEnter={() => setOverImage(true)}
                onMouseLeave={() => setOverImage(false)}
                aria-label="Copy image"
                whileTap={{ scale: 0.99 }}
                transition={springSnap}
                /*
                 * Sized to the picture and anchored to the leading edge, rather
                 * than stretched across the card with the picture parked in the
                 * middle of it.
                 *
                 * It used to be w-full with object-contain, which is a
                 * letterbox: the frame took the card's width whatever the
                 * picture's shape was, and the difference came back as two grey
                 * bars. A portrait screenshot spent more of the card on bars
                 * than on itself. w-fit lets the frame end where the image does,
                 * and self-start puts that end on the left with the text under
                 * it — a card reads down one margin or it reads as two columns.
                 */
                className={cn(
                  'focus-halo relative w-fit self-start overflow-hidden rounded-inner outline-none',
                  'bg-well shadow-[inset_0_0_0_0.5px_var(--border)]'
                )}
              >
                <img
                  src={imageUrl(item.file)}
                  alt={item.caption || 'Stashed image'}
                  draggable={false}
                  /* Capped on both axes so neither a tall screenshot nor a wide
                     one can push the card out of shape, and constrained by
                     nothing else — the intrinsic size inside those caps is what
                     the frame takes. */
                  className={cn(
                    'max-h-40 max-w-full object-contain transition-opacity duration-150',
                    item.done && 'opacity-40'
                  )}
                />

                <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <CopyPill
                    tone="hud"
                    shown={overImage || copied === 'image'}
                    done={copied === 'image'}
                    idle="Copy image"
                    confirmed="Image copied"
                  />
                </span>
              </motion.button>
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
                      className="focus-halo rounded-[4px] px-0.5 text-xs font-medium text-tint outline-none transition-colors hover:text-tint-hover"
                    >
                      {expanded ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
              )
            )}

            {item.kind === 'image' && !label && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="focus-halo self-start rounded-[4px] px-0.5 text-xs text-muted-foreground outline-none transition-colors hover:text-foreground"
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
                  shown={(overText && !overImage && canCopyText) || copied === 'text'}
                  done={copied === 'text'}
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
              'hit-36 self-center opacity-0 transition-opacity duration-100',
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

        {/* Not gated on having picked more than one. A single stash copied as a
            list is one bullet, which is a perfectly ordinary thing to want and
            was greyed out for no reason anybody could see from here. */}
        <ContextMenuItem onSelect={() => onCopySelection(true)}>
          Copy as list
          <ContextMenuShortcut>{keys.copyList}</ContextMenuShortcut>
        </ContextMenuItem>

        {item.kind === 'image' && (
          <ContextMenuItem onSelect={() => onCopy('image')}>Copy image</ContextMenuItem>
        )}

        <ContextMenuSeparator />

        <ContextMenuItem onSelect={onToggle}>
          {item.done ? 'Mark as not done' : 'Mark as done'}
          <ContextMenuShortcut>Space</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuItem disabled={!long} onSelect={() => setExpanded((open) => !open)}>
          {expanded ? 'Collapse' : 'Expand'}
        </ContextMenuItem>

        {/* Not an item that does anything — a line saying the keys exist. The
            grip is the obvious way to move a row and it is also the only one
            anybody finds; the chord that does it without a pointer had nowhere
            to be read. */}
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
 * What the card says when the pointer is over something copyable, and what it
 * says once it has been copied.
 *
 * Two tones, because it appears in two places that have nothing in common. Over
 * an image it is floating on artwork it knows nothing about, so it is a HUD:
 * dark, blurred, bringing its own ground. In the metadata line it is sitting on
 * a card, and a dark HUD chip there was a hole punched in the row — it read as
 * a tooltip that had got stuck rather than as part of the card. Inline it is a
 * control instead: the card's own raised fill, a hairline, and the glyph that
 * says what the click will do.
 *
 * The glyph is the reason it can be small. "Copy text" spelled out was carrying
 * the whole message on its own and needed the width to do it; a copy mark plus
 * the word reads at a glance and takes less room doing it.
 */
function CopyPill({
  tone = 'inline',
  shown,
  done,
  idle,
  confirmed
}: {
  tone?: 'inline' | 'hud'
  shown: boolean
  done: boolean
  idle: string
  confirmed: string
}): React.JSX.Element {
  const hud = tone === 'hud'

  return (
    <AnimatePresence>
      {shown && (
        <motion.span
          /* Inline it arrives from the trailing edge, which is where it lives
             and the direction the eye is already travelling. Over an image
             there is no edge to arrive from, so it scales up in place. */
          initial={hud ? { opacity: 0, scale: 0.94 } : { opacity: 0, x: 4 }}
          animate={hud ? { opacity: 1, scale: 1 } : { opacity: 1, x: 0 }}
          exit={hud ? { opacity: 0, scale: 0.96 } : { opacity: 0, x: 4 }}
          transition={springSnap}
          className={cn(
            'flex items-center gap-1 rounded-full whitespace-nowrap',
            hud
              ? 'material-hud vibrant px-2 py-[1px] text-2xs shadow-hud'
              : cn(
                  'border border-border bg-elevated px-1.5 py-[1px]',
                  'text-2xs font-medium text-foreground shadow-control',
                  /* Green would be the obvious way to say "done" and the wrong
                     one — the window has no colour in it. The tick says it. */
                  done && 'text-foreground'
                )
          )}
        >
          {done ? <Check className="size-2.5" /> : <Copy className="size-2.5" />}
          {done ? confirmed : idle}
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
