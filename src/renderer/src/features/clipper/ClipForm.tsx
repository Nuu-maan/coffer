import { useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { motion } from 'motion/react'
import type { ClipDraft } from '@shared/types/item'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { coffer } from '@/lib/ipc'
import { spring, springSheet } from '@/lib/motion'

/**
 * The clip lands as a sheet: the window itself is small and floating, so the
 * whole surface is one piece of glass rather than a panel with chrome on it.
 */
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
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={springSheet}
      className="material-thick material-edge flex h-full flex-col gap-2.5 rounded-2xl p-3 text-foreground shadow-overlay"
    >
      <div className="drag-region flex items-center justify-between px-0.5">
        <span className="vibrant text-2xs tracking-[0.2em] text-muted-foreground uppercase">
          Clip
        </span>
        {draft && (
          <Badge variant="glass" size="sm" numeric>
            {draft.width} × {draft.height}
          </Badge>
        )}
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-black/[0.04] ring-1 ring-border ring-inset dark:bg-black/20">
        {draft && (
          <motion.img
            src={draft.dataUrl}
            alt="Clipped region"
            draggable={false}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={spring}
            className="max-h-full max-w-full object-contain"
          />
        )}
      </div>

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
        className="max-h-24 min-h-0 resize-none rounded-xl"
      />

      <div className="flex items-center gap-2">
        <span className="text-2xs text-muted-foreground">⏎ to stash · esc to discard</span>
        <Button size="sm" className="ml-auto" disabled={saving || !draft} onClick={commit}>
          {saving ? 'Stashing…' : 'Add to Coffer'}
          <ArrowRight />
        </Button>
      </div>
    </motion.div>
  )
}
