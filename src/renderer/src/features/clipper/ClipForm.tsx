import { useEffect, useRef, useState } from 'react'
import { MotionConfig, motion } from 'motion/react'
import type { ClipDraft } from '@shared/types/item'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { coffer } from '@/lib/ipc'
import { spring, springSheet } from '@/lib/motion'

export function ClipForm(): React.JSX.Element {
  const [draft, setDraft] = useState<ClipDraft | null>(null)
  const [caption, setCaption] = useState('')
  const [saving, setSaving] = useState(false)
  const [focused, setFocused] = useState(false)
  const areaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    void coffer.clipper.draft().then(setDraft)
  }, [])

  useEffect(() => {
    if (draft) areaRef.current?.focus()
  }, [draft])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') coffer.clipper.cancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function commit(): void {
    if (saving) return
    setSaving(true)
    void coffer.clipper.commit(caption.trim())
  }

  return (
    /* Its own window, so its own root — see App.tsx for why. */
    <MotionConfig reducedMotion="user">
      {/*
        The panel, holding one clip.

        It used to be built as a dialog: a bordered title bar, a well the image
        was letterboxed into, a bordered field, a bordered footer. Four rules
        across a window 380 pixels wide, and none of them the way the app draws
        anything else. It is the same sheet as the main window now, at the same
        radius and the same 12px gutter, with the clip on a card and the note in
        the composer's own field. Nothing here is a new idea; that is the point.
      */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={springSheet}
        className="sheet flex h-full flex-col overflow-hidden rounded-window text-foreground"
      >
        {/* The panel's title bar: the same 44px, the same gutter. The size is
            the one fact worth knowing about a clip, so it trails the name
            rather than taking a line. */}
        <header className="drag-region flex h-[44px] shrink-0 items-center gap-2 px-3 select-none">
          <span className="text-sm font-semibold">New Clip</span>
          {draft && (
            <span className="ml-auto text-2xs text-muted-foreground tabular-nums">
              {draft.width} × {draft.height}
            </span>
          )}
        </header>

        {/* The clip, on a card — the same card a stash lands on, because that is
            what this is about to be. The image is inset by the card's own
            padding so the two curves stay parallel. */}
        <div className="min-h-0 flex-1 px-3 pb-2">
          <div className="flex h-full items-center justify-center overflow-hidden rounded-card bg-card p-1.5 shadow-card">
            {draft && (
              <motion.img
                src={draft.url}
                alt="Clipped region"
                draggable={false}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={spring}
                className="max-h-full max-w-full rounded-inner object-contain ring-[0.5px] ring-border"
              />
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 px-3 pt-1 pb-3">
          {/*
            The composer's field, because it is the composer's job: a line of
            text about to become a stash. Filled like a card rather than
            outlined and recessed, with the circle a stash carries on its
            leading edge.
          */}
          <div
            data-focused={focused || undefined}
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) areaRef.current?.focus()
            }}
            className={cn(
              'flex min-h-[34px] items-start gap-2 rounded-card px-2.5 py-2',
              'bg-card shadow-card',
              'transition-[box-shadow] duration-100',
              'data-[focused]:ring-[3px] data-[focused]:ring-ring/30'
            )}
          >
            <span
              aria-hidden
              className="mt-[1px] size-[17px] shrink-0 rounded-full border border-input-border"
            />

            <Textarea
              ref={areaRef}
              variant="bare"
              rows={1}
              value={caption}
              aria-label="Note for this clip"
              placeholder="Add a note"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onChange={(event) => setCaption(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  commit()
                }
              }}
              className="max-h-20 flex-1 text-base leading-snug"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="mr-auto text-2xs text-muted-foreground">
              Optional · Return to stash, Esc to discard
            </span>

            <Button size="sm" variant="ghost" onClick={() => coffer.clipper.cancel()}>
              Cancel
            </Button>

            <Button size="sm" variant="tint" disabled={saving || !draft} onClick={commit}>
              {saving ? 'Stashing…' : 'Stash'}
            </Button>
          </div>
        </div>
      </motion.div>
    </MotionConfig>
  )
}
