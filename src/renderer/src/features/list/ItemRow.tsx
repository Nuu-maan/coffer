import { useEffect, useRef, useState } from 'react'
import { Check, GripVertical, X } from '@/components/icons'
import { AnimatePresence, Reorder, motion, useDragControls } from 'motion/react'
import type { Item } from '@shared/types/item'
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
  onDragEnd: () => void
}

export function ItemRow({
  item,
  index,
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

  /* macOS is the only place ⌘ and ⌫ mean anything. Everywhere else the menu has
     to say the keys that are actually on the keyboard. */
  const mac = usePlatform()?.platform === 'darwin'
  const keys = mac
    ? { copy: '⌘C', copyList: '⇧⌘C', remove: '⌫' }
    : { copy: 'Ctrl C', copyList: 'Ctrl Shift C', remove: 'Del' }

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
        onMouseDown={(event) =>
          onSelect({ shift: event.shiftKey, toggle: event.metaKey || event.ctrlKey })
        }
        style={{ position: 'relative' }}
        className={cn(
          'group list-none rounded-2xl bg-card transition-shadow duration-100',
          dragging && 'z-20 shadow-float',
          !dragging && !selected && 'shadow-card',
          !dragging &&
            selected &&
            'shadow-[0_0_0_2.5px_var(--selected-ring),0_1px_3px_rgb(0_0_0/0.06)]'
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
            className="hit-36 mt-[3px] shrink-0 self-start"
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
                className="relative overflow-hidden rounded-xl bg-well shadow-[inset_0_0_0_0.5px_var(--border)]"
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
                      item.done && 'text-muted-foreground line-through decoration-border'
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
                      className="text-xs font-medium text-tint transition-colors hover:text-tint-hover"
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
                className="self-start text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Add a caption
              </button>
            )}

            <div
              className="relative flex items-center gap-1.5 text-2xs text-muted-foreground/80 tabular-nums"
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
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => onCopySelection(false)}>
          {selectionSize > 1 ? `Copy ${selectionSize} stashes` : copyTextLabel}
          <ContextMenuShortcut>{keys.copy}</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuItem disabled={selectionSize < 2} onSelect={() => onCopySelection(true)}>
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

        <ContextMenuItem disabled={selectionSize > 1} onSelect={() => setEditing(true)}>
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
