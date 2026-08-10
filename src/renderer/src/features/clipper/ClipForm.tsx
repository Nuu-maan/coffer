import { useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import type { ClipDraft } from '@shared/types/item'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { coffer } from '@/lib/ipc'

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
    <div className="flex h-full flex-col gap-3 rounded-xl border bg-background p-3 text-foreground shadow-2xl">
      <div className="drag-region flex items-center justify-between px-1">
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Clip
        </span>
        {draft && (
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {draft.width} × {draft.height}
          </span>
        )}
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
        {draft && (
          <img
            src={draft.dataUrl}
            alt="Clipped region"
            draggable={false}
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
        className="max-h-24 min-h-0 resize-none"
      />

      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground">Enter to stash · Esc to discard</span>
        <Button size="sm" className="ml-auto" disabled={saving || !draft} onClick={commit}>
          {saving ? 'Stashing…' : 'Add to Coffer'}
          <ArrowRight />
        </Button>
      </div>
    </div>
  )
}
