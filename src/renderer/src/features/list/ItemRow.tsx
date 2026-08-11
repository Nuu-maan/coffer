import { useEffect, useRef, useState } from 'react'
import { Check, GripVertical, X } from 'lucide-react'
import { AnimatePresence, Reorder, motion, useDragControls } from 'motion/react'
import type { Item } from '@shared/types/item'
import { imageUrl } from '@shared/constants'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { STAGGER, spring, springMomentum, springSnap } from '@/lib/motion'

type Props = {
  item: Item
  index: number
  selected: boolean
  copied: 'image' | 'text' | null
  onSelect: () => void
  onCopy: (what: 'image' | 'text') => void
  onToggle: () => void
  onRemove: () => void
  onUpdate: (text: string) => void
  onDragEnd: () => void
}

export function ItemRow({
  item,
  index,
  selected,
  copied,
  onSelect,
  onCopy,
  onToggle,
  onRemove,
  onUpdate,
  onDragEnd
}: Props): React.JSX.Element {
  const label = item.kind === 'text' ? item.text : item.caption
  const [editing, setEditing] = useState(false)
  const [dragging, setDragging] = useState(false)
  // Two independent flags rather than one "what is hovered": moving off the
  // image and back onto the column has to bring the text label back, and
  // mouseenter does not fire again for the column you never left.
  const [overText, setOverText] = useState(false)
  const [overImage, setOverImage] = useState(false)
  const [draft, setDraft] = useState(label)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const controls = useDragControls()

  const canCopyText = !editing && label.trim().length > 0
  const copyTextLabel = item.kind === 'image' ? 'Copy caption' : 'Copy text'

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  useEffect(() => {
    setDraft(label)
  }, [label])

  function commit(): void {
    setEditing(false)
    if (draft.trim() !== label) onUpdate(draft)
  }

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => {
        setDragging(false)
        onDragEnd()
      }}
      // Rows arrive one after another rather than all at once, so the list
      // reads as filling in rather than blinking into place.
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.16 } }}
      transition={{ ...spring, delay: Math.min(index * STAGGER, 0.2) }}
      layout="position"
      onMouseDown={onSelect}
      style={{ position: 'relative' }}
      className={cn(
        'group list-none rounded-xl transition-colors duration-150',
        // While a row is being carried it lifts off the sheet and the rest of
        // the list flows underneath it.
        dragging ? 'z-20 bg-card shadow-float' : 'z-0',
        selected && !dragging && 'bg-accent/70',
        !selected && !dragging && 'hover:bg-accent/40'
      )}
    >
      {/* No divider: spacing and the hover surface separate the rows on their
          own, and a list of short lines does not need ruling. */}
      <div className="flex items-stretch gap-2.5 px-2.5 py-2.5">
        <button
          aria-label="Reorder"
          onPointerDown={(event) => {
            event.preventDefault()
            controls.start(event)
          }}
          className={cn(
            'hit-36 mt-[3px] shrink-0 self-start cursor-grab touch-none text-muted-foreground/40',
            'opacity-0 transition-opacity duration-150 active:cursor-grabbing',
            'group-hover:opacity-100 focus-visible:opacity-100'
          )}
        >
          <GripVertical className="size-4" />
        </button>

        <Checkbox
          checked={item.done}
          onCheckedChange={onToggle}
          aria-label={item.done ? 'Mark as not done' : 'Mark as done'}
          className="hit-36 mt-[3px] shrink-0 self-start"
        />

        {/* The whole column is the copy target, not just the glyphs. The
            negative margin lets it reach into the row's padding so there is no
            dead strip above and below the text. */}
        <div
          role={canCopyText ? 'button' : undefined}
          tabIndex={-1}
          aria-label={canCopyText ? copyTextLabel : undefined}
          onClick={() => {
            if (canCopyText) onCopy('text')
          }}
          onDoubleClick={() => setEditing(true)}
          onMouseEnter={() => setOverText(true)}
          onMouseLeave={() => setOverText(false)}
          className="-my-2.5 flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-2.5"
        >
          {item.kind === 'image' && (
            <motion.button
              onClick={(event) => {
                // The column around it copies the caption, so the image has to
                // claim its own click rather than let it through.
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
              whileTap={{ scale: 0.985 }}
              transition={springMomentum}
              className="relative overflow-hidden rounded-lg bg-muted ring-1 ring-border ring-inset"
            >
              <img
                src={imageUrl(item.file)}
                alt={item.caption || 'Stashed image'}
                draggable={false}
                className={cn(
                  'max-h-44 w-full object-contain transition-opacity duration-200',
                  item.done && 'opacity-40'
                )}
              />

              {/* The label sits on the image it describes, so what a click
                  will copy is answered before the click, not after it. */}
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <CopyPill
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
              className="text-base leading-relaxed"
            />
          ) : (
            (item.kind === 'text' || label) && (
              <div
                className={cn(
                  'text-left text-base leading-relaxed break-words whitespace-pre-wrap',
                  'transition-colors duration-200 [text-wrap:pretty]',
                  item.done && 'text-muted-foreground line-through decoration-border'
                )}
              >
                {label}
              </div>
            )
          )}

          {item.kind === 'image' && !label && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="self-start text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Add a caption
            </button>
          )}

          {/* Provenance, in mono so the numbers line up down the list. The
              copy label for the text rides on this line: it is directly under
              the words it applies to, and being absolute it cannot move them. */}
          <div className="relative flex items-center gap-1.5 text-2xs text-muted-foreground/70 tabular-nums">
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

        <div className="flex shrink-0 items-center gap-1 self-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onRemove}
                aria-label="Delete"
                className={cn(
                  'hit-36 opacity-0 transition-opacity duration-150',
                  'group-hover:opacity-100 focus-visible:opacity-100'
                )}
              >
                <X />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </Reorder.Item>
  )
}

/**
 * One pill that answers "what will this copy?" before the click and "it
 * copied" after it — the same object in the same place, so the confirmation is
 * obviously about the thing you just touched (§13, causality).
 *
 * It is absolutely positioned by its callers and never participates in layout,
 * which is what keeps the row from shifting when it appears.
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
          layout
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={springSnap}
          className={cn(
            'material-thick material-edge flex items-center gap-1 overflow-hidden rounded-full',
            'px-2 py-0.5 font-sans text-2xs font-medium tracking-normal whitespace-nowrap shadow-card',
            done ? 'text-tint' : 'text-foreground'
          )}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {done && (
              <motion.span
                key="tick"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ type: 'spring', bounce: 0.4, duration: 0.3 }}
                className="flex"
              >
                <Check className="size-3" strokeWidth={2.75} />
              </motion.span>
            )}
          </AnimatePresence>

          <motion.span layout="position" key={done ? 'done' : 'idle'}>
            {done ? confirmed : idle}
          </motion.span>
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
