import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import type { ClipDraft } from '@shared/types/item'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { coffer } from '@/lib/ipc'
import { spring, springSheet } from '@/lib/motion'

export function ClipForm(): React.JSX.Element {
  const [draft, setDraft] = useState<ClipDraft | null>(null)
  const [caption, setCaption] = useState('')
  const [saving, setSaving] = useState(false)
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
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={springSheet}
      className="material-thick material-edge flex h-full flex-col overflow-hidden rounded-xl text-foreground shadow-overlay"
    >
      <div className="drag-region relative flex h-[30px] shrink-0 items-center justify-center border-b border-border px-2">
        <span className="text-sm font-semibold">New Clip</span>
        {draft && (
          <span className="absolute right-2.5 text-2xs text-muted-foreground tabular-nums">
            {draft.width} × {draft.height}
          </span>
        )}
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-well p-2">
        {draft && (
          <motion.img
            src={draft.url}
            alt="Clipped region"
            draggable={false}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={spring}
            className="max-h-full max-w-full rounded-[3px] object-contain shadow-card"
          />
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t border-border p-2.5">
        <Textarea
          ref={areaRef}
          rows={2}
          value={caption}
          placeholder="Add a note… (optional)"
          onChange={(event) => setCaption(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              commit()
            }
          }}
          className="max-h-20 min-h-[38px]"
        />

        <div className="flex items-center justify-end gap-2">
          <span className="mr-auto text-2xs text-muted-foreground">Return to stash · Esc to discard</span>

          <Button size="sm" variant="default" onClick={() => coffer.clipper.cancel()}>
            Cancel
          </Button>

          <Button size="sm" variant="tint" disabled={saving || !draft} onClick={commit}>
            {saving ? 'Stashing…' : 'Stash'}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
