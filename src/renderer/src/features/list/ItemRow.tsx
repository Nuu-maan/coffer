import { useEffect, useRef, useState } from 'react'
import { Check, GripVertical, X } from 'lucide-react'
import { AnimatePresence, Reorder, motion, useDragControls } from 'motion/react'
import type { Item } from '@shared/types/item'
import { imageUrl } from '@shared/constants'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { STAGGER, spring, springSnap } from '@/lib/motion'

const LONG_TEXT = 320

type Props = {
  item: Item
  index: number
  selected: boolean
  divider: boolean
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
  divider,
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
  const [overText, setOverText] = useState(false)
  const [overImage, setOverImage] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState(label)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const controls = useDragControls()

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
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => {
        setDragging(false)
        onDragEnd()
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ ...spring, delay: Math.min(index * STAGGER, 0.12) }}
      layout="position"
      data-slot="item-row"
      data-selected={selected || undefined}
      onMouseDown={onSelect}
      style={{ position: 'relative' }}
      className={cn(
        'group list-none rounded-[5px] transition-colors duration-100',
        dragging && 'z-20 bg-card shadow-float',
        selected && !dragging && 'bg-selected text-selected-foreground',
        !selected && !dragging && 'hover:bg-accent'
      )}
    >
      {divider && !dragging && (
        <span className="pointer-events-none absolute right-2 bottom-0 left-[46px] h-px bg-border" />
      )}

      <div className="flex items-stretch gap-2 px-2 py-1.5">
        <button
          aria-label="Reorder"
          onPointerDown={(event) => {
            event.preventDefault()
            controls.start(event)
          }}
          className={cn(
            'hit-36 mt-[2px] shrink-0 cursor-grab touch-none self-start opacity-0',
            'text-current/40 transition-opacity duration-100 active:cursor-grabbing',
            'group-hover:opacity-100 focus-visible:opacity-100'
          )}
        >
          <GripVertical className="size-3.5" />
        </button>

        <Checkbox
          checked={item.done}
          onCheckedChange={onToggle}
          aria-label={item.done ? 'Mark as not done' : 'Mark as done'}
          className={cn(
            'hit-36 mt-[3px] shrink-0 self-start',
            selected && 'border-white/50 bg-white/15 data-[state=checked]:bg-white/25'
          )}
        />

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
              className="relative overflow-hidden rounded-md bg-well shadow-[inset_0_0_0_0.5px_var(--border)]"
            >
              <img
                src={imageUrl(item.file)}
                alt={item.caption || 'Stashed image'}
                draggable={false}
                className={cn(
                  'max-h-40 w-full object-contain transition-opacity duration-150',
                  item.done && 'opacity-40'
                )}
              />

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
              className="text-base"
            />
          ) : (
            (item.kind === 'text' || label) && (
              <div className="flex flex-col items-start gap-0.5">
                <div
                  className={cn(
                    'text-left text-base break-words whitespace-pre-wrap [text-wrap:pretty]',
                    long && !expanded && 'line-clamp-6',
                    item.done && !selected && 'text-muted-foreground line-through decoration-border',
                    item.done && selected && 'line-through opacity-60'
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
                    className={cn(
                      'text-xs font-medium transition-colors',
                      selected ? 'text-current/80 hover:text-current' : 'text-tint hover:text-tint-hover'
                    )}
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
              className={cn(
                'self-start text-xs transition-colors',
                selected ? 'text-current/70 hover:text-current' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Add a caption
            </button>
          )}

          <div
            className={cn(
              'relative flex items-center gap-1.5 text-2xs tabular-nums',
              selected ? 'text-current/65' : 'text-muted-foreground/80'
            )}
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
            'group-hover:opacity-100 focus-visible:opacity-100',
            selected && 'text-current hover:bg-white/20 hover:text-current'
          )}
        >
          <X />
        </Button>
      </div>
    </Reorder.Item>
  )
}

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
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={springSnap}
          className={cn(
            'material-hud vibrant flex items-center gap-1 rounded-full px-2 py-[1px]',
            'text-2xs whitespace-nowrap shadow-float'
          )}
        >
          {done && <Check className="size-2.5" strokeWidth={3} />}
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
