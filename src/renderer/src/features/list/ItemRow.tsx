import { useEffect, useRef, useState } from 'react'
import { GripVertical, X } from 'lucide-react'
import type { Item } from '@shared/types/item'
import { imageUrl } from '@shared/constants'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type Props = {
  item: Item
  selected: boolean
  copied: 'image' | 'text' | null
  onSelect: () => void
  onCopy: (what: 'image' | 'text') => void
  onToggle: () => void
  onRemove: () => void
  onUpdate: (text: string) => void
  onDragStart: () => void
  onDragOver: (event: React.DragEvent) => void
  onDrop: () => void
}

export function ItemRow({
  item,
  selected,
  copied,
  onSelect,
  onCopy,
  onToggle,
  onRemove,
  onUpdate,
  onDragStart,
  onDragOver,
  onDrop
}: Props): React.JSX.Element {
  const label = item.kind === 'text' ? item.text : item.caption
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(label)
  const inputRef = useRef<HTMLTextAreaElement>(null)

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
    <li
      draggable={!editing}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onMouseDown={onSelect}
      className={cn(
        'group flex items-start gap-2.5 rounded-lg border bg-card px-3 py-2.5 text-card-foreground shadow-xs transition-colors',
        selected ? 'border-ring bg-accent' : 'hover:bg-accent/50'
      )}
    >
      <GripVertical className="mt-1 size-4 shrink-0 cursor-grab text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />

      <Checkbox
        checked={item.done}
        onCheckedChange={onToggle}
        aria-label={item.done ? 'Mark as not done' : 'Mark as done'}
        className="hit-36 mt-0.5 shrink-0"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {item.kind === 'image' && (
          <button
            onClick={() => onCopy('image')}
            onDoubleClick={() => setEditing(true)}
            aria-label="Copy image"
            className="overflow-hidden rounded-md border bg-muted/40"
          >
            <img
              src={imageUrl(item.file)}
              alt={item.caption || 'Stashed image'}
              draggable={false}
              className={cn(
                'max-h-44 w-full object-contain transition-opacity',
                item.done && 'opacity-40'
              )}
            />
          </button>
        )}

        {editing ? (
          <Textarea
            ref={inputRef}
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
            className="min-h-0 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
        ) : (
          (item.kind === 'text' || label) && (
            <button
              onClick={() => onCopy('text')}
              onDoubleClick={() => setEditing(true)}
              aria-label={item.kind === 'image' ? 'Copy caption' : 'Copy text'}
              className={cn(
                'whitespace-pre-wrap break-words text-left leading-normal [text-wrap:pretty]',
                item.done && 'text-muted-foreground line-through'
              )}
            >
              {label}
            </button>
          )
        )}

        {item.kind === 'image' && !label && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="self-start text-xs text-muted-foreground hover:text-foreground"
          >
            Add a caption
          </button>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 self-center">
        {copied && (
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
            {copied === 'image' ? 'Image copied' : 'Copied'}
          </Badge>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onRemove}
              aria-label="Delete"
              className="hit-36 text-muted-foreground opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
            >
              <X />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete</TooltipContent>
        </Tooltip>
      </div>
    </li>
  )
}
