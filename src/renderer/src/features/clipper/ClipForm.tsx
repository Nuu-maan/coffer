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
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={springSheet}
      className="material-thick material-edge flex h-full flex-col overflow-hidden rounded-window text-foreground shadow-overlay"
    >
      {/*
        A sheet's title bar, not a toolbar: the name centred, the one fact worth
        knowing about the clip trailing it, and a separator rather than a border
        underneath — this runs between two parts of one surface, so it is drawn
        as light as the ones in the panel.
      */}
      <div className="drag-region relative flex h-[32px] shrink-0 items-center justify-center px-2.5">
        <span className="text-sm font-semibold">New Clip</span>
        {draft && (
          <span className="absolute right-2.5 text-2xs text-muted-foreground tabular-nums">
            {draft.width} × {draft.height}
          </span>
        )}
        <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-separator" />
      </div>

      {/*
        The clip is what this window is about, so it gets the room. The well
        behind it is what says where the image ends when the image is a
        screenshot of something the same colour as the sheet, and the hairline
        on the image itself finishes that job when the well cannot — a light
        screenshot on a light well has no edge of its own.
      */}
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-well p-2.5">
        {draft && (
          <motion.img
            src={draft.url}
            alt="Clipped region"
            draggable={false}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={spring}
            className="max-h-full max-w-full rounded-inner object-contain shadow-raised ring-[0.5px] ring-border"
          />
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-2 p-2.5">
        <span aria-hidden className="pointer-events-none -mx-2.5 -mt-2.5 h-px bg-separator" />

        {/*
          The same field as the panel's composer, because it is the same act:
          filled like a card rather than outlined and recessed, growing from one
          line as the note wraps. It used to be a two-line box with a border, a
          well and a focus ring all describing the same thing at once — three
          statements where the fill and the halo say it between them.
        */}
        <div
          data-focused={focused || undefined}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) areaRef.current?.focus()
          }}
          className={cn(
            'flex min-h-[28px] items-center rounded-card px-2.5 py-[5px]',
            'bg-card shadow-card',
            'transition-[box-shadow] duration-100',
            'data-[focused]:ring-[3px] data-[focused]:ring-ring/30'
          )}
        >
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
            className="max-h-20 flex-1 leading-snug"
          />
        </div>

        {/* The note is optional, and the placeholder no longer says so — a
            parenthetical inside a field is a footnote you cannot read once you
            start typing. The row below is where the terms of this window are
            stated, so it says it there, alongside the keys. */}
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
