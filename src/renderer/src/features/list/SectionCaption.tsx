import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal, Plus, Trash } from '@/components/icons'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

type Props = {
  name: string
  /** Freshly made by the + menu, and waiting to be named. */
  autoEdit: boolean
  onRename: (next: string) => void
  onRemove: () => void
  onAdd: () => void
  onNudge: (direction: -1 | 1) => void
  onEdited: () => void
  onDragHandle: (event: React.PointerEvent) => void
}

/*
 * The caption over a section: its name, and the two things you can do to the
 * section itself.
 *
 * Two, because a section is a word above some cards and that is nearly all it
 * is. The menu had grown to nine items — move up, move down, mark all done,
 * mark all not done, move everything to each of the other sections in turn,
 * move everything out, rename, delete — which is a control panel hanging off a
 * label. Most of it was reachable another way already: what a section holds is
 * filed and unfiled from the cards themselves, and where a section sits is
 * decided by dragging it.
 *
 * The whole line is the drag handle. It had a grip of its own on the leading
 * edge, held back until hover the way the cards' grips are — which meant the
 * name sat twenty pixels in from the left margin, behind a column that was
 * empty almost all of the time. A caption is a strip of mostly-rule with a word
 * at one end; there is nothing on it to grab by mistake, so all of it can be
 * the thing you grab.
 *
 * Caps at 10px with the tracking opened up: at that size lowercase letterforms
 * stop resolving and the label reads as smudge, while caps are all one height
 * and hold together. The rule fills the rest of the line, which is what keeps a
 * short caption from leaving a ragged hole above the cards — and says the
 * caption belongs to what is under it rather than floating between two groups.
 */
export function SectionCaption({
  name,
  autoEdit,
  onRename,
  onRemove,
  onAdd,
  onNudge,
  onEdited,
  onDragHandle
}: Props): React.JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(autoEdit)
  const [draft, setDraft] = useState(name)
  const inputRef = useRef<HTMLInputElement>(null)
  /* Set when the field is being opened from the menu rather than by a
     double-click, because those two need different handling on the way in. */
  const fromMenu = useRef(false)

  useEffect(() => setDraft(name), [name])
  useEffect(() => {
    if (autoEdit) setEditing(true)
  }, [autoEdit])
  useEffect(() => {
    if (!editing) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editing])

  function commit(): void {
    setEditing(false)
    onEdited()
    if (draft.trim() !== name) onRename(draft)
  }

  return (
    <div
      data-controls={menuOpen || undefined}
      /*
       * Focusable, and the only reason is the keyboard. Dragging the caption is
       * how a section moves with a pointer; there was no second way, which made
       * ordering a thing you could only do by holding a mouse. Tab reaches the
       * caption, Alt and an arrow carries it — the same chord that moves a row
       * — and the focus ring says the caption is a thing you can act on, which
       * a drag handle with no visible edge never managed to.
       */
      role="group"
      tabIndex={editing ? -1 : 0}
      aria-label={`Section ${name}`}
      aria-roledescription="Draggable section"
      onKeyDown={(event) => {
        if (editing) return
        if (!event.altKey) return
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
        event.preventDefault()
        onNudge(event.key === 'ArrowDown' ? 1 : -1)
      }}
      onPointerDown={(event) => {
        /* Everything on this line except the name and the menu is grabbable.
           Those two have their own jobs and stop the event themselves. */
        if (editing) return
        event.preventDefault()
        onDragHandle(event)
      }}
      className={cn(
        /* No padding of its own: the caption's first letter has to sit on the
           same left margin as the cards it captions, and 4px of inset was
           enough to read as a stagger. */
        /* min-h, not h: a fixed height on a container of text clips it the
           moment the reader turns their type size up. */
        'focus-halo group/caption relative flex min-h-[20px] items-center gap-1 rounded-[4px]',
        'outline-none select-none',
        !editing && 'cursor-grab touch-none active:cursor-grabbing'
      )}
    >
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          placeholder="Section name"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            event.stopPropagation()
            if (event.key === 'Enter') {
              event.preventDefault()
              commit()
            } else if (event.key === 'Escape') {
              setDraft(name)
              setEditing(false)
              onEdited()
            }
          }}
          className={cn(
            'mr-11 min-w-0 flex-1 rounded-[4px] bg-well px-1 py-px outline-none',
            'text-2xs font-semibold tracking-[0.06em] text-foreground uppercase',
            'ring-[3px] ring-ring/30 placeholder:tracking-normal placeholder:normal-case'
          )}
        />
      ) : (
        <>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onDoubleClick={() => setEditing(true)}
            title="Double-click to rename"
            className={cn(
              'focus-halo shrink-0 rounded-[4px] px-0.5 outline-none',
              'text-2xs font-semibold tracking-[0.06em] uppercase',
              'cursor-text text-muted-foreground transition-colors hover:text-foreground'
            )}
          >
            {name}
          </button>

          {/*
            The rule runs to the margin every other line in this window runs to,
            and gets out of the way when the controls arrive.

            The controls float over its tail rather than holding a column open
            beside it — but they are ghost buttons, so at rest they have no fill
            to hide the hairline they are standing on, and the rule ran straight
            through them. Shortening it on hover costs one animated margin and
            means neither has to compromise: full width when there is nothing
            there, out of the way when there is.
          */}
          <span
            aria-hidden
            className={cn(
              'mx-1 h-px min-w-4 flex-1 bg-separator',
              'transition-[margin-right] duration-150 ease-[var(--ease-out-quart)]',
              'group-hover/caption:mr-[46px] group-data-[controls]/caption:mr-[46px]'
            )}
          />
        </>
      )}

      {/*
        Over the rule's tail rather than in the row beside it. In flow they held
        a 44px column open whether or not they were showing, and the rule
        stopped short of the margin every other line in the window runs to. They
        are only visible on hover, and by then they have a fill of their own to
        cover the hairline they are standing on.
      */}
      <div className="absolute inset-y-0 right-0 flex items-center gap-1">
        {/* Straight to a new card in this section, rather than typing it into
            the composer at the foot of the window and filing it afterwards. The
            composer adds to the list; this adds to the section you are looking
            at, which is a different thing and worth its own button. */}
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Add to ${name}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onAdd}
          className={cn(
            'hit-36 shrink-0 opacity-0 transition-opacity duration-100',
            'group-hover/caption:opacity-100 focus-visible:opacity-100'
          )}
        >
          <Plus />
        </Button>

        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`${name} options`}
              onPointerDown={(event) => event.stopPropagation()}
              className={cn(
                'hit-36 shrink-0 opacity-0 transition-opacity duration-100',
                'group-hover/caption:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100'
              )}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-44"
          /*
           * A closing menu puts focus back on the button that opened it, which
           * is right for every item here but one. Rename opens a text field and
           * then had it taken away again a tick later — the caret appeared in
           * the box and left, and the field sat there looking editable and
           * ignoring the keyboard.
           *
           * So when Rename is what closed the menu, the restore is called off
           * and the field is focused instead. A frame later, because the menu
           * closes and the field mounts in the same commit and the element has
           * to exist before it can be focused.
           */
          onCloseAutoFocus={(event) => {
            if (!fromMenu.current) return
            fromMenu.current = false
            event.preventDefault()
            requestAnimationFrame(() => {
              inputRef.current?.focus()
              inputRef.current?.select()
            })
          }}
        >
          <DropdownMenuItem
            onSelect={() => {
              fromMenu.current = true
              setEditing(true)
            }}
          >
            Rename…
          </DropdownMenuItem>

          {/* Destructive on the section, not on what is in it: deleting a
              section unfiles its stashes rather than throwing them away, which
              is the only reading that does not lose work to a mis-click. */}
          <DropdownMenuItem variant="destructive" onSelect={onRemove}>
            <Trash />
            Delete section
          </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
