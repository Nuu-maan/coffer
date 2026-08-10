import { useRef, useState } from 'react'
import { ArrowUp, Crop, ImagePlus, MousePointerSquareDashed } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { coffer } from '@/lib/ipc'
import { toBytes } from '@/lib/images'

type Props = {
  onSubmit: (text: string) => void
}

export function Composer({ onSubmit }: Props): React.JSX.Element {
  const [text, setText] = useState('')
  const [stashing, setStashing] = useState(false)
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function submit(): void {
    const trimmed = text.trim()
    if (!trimmed) return
    onSubmit(trimmed)
    setText('')
    resize(areaRef.current)
  }

  async function grabSelection(): Promise<void> {
    setStashing(true)
    try {
      await coffer.stash.selection()
    } finally {
      setStashing(false)
    }
  }

  async function pickImages(files: FileList | null): Promise<void> {
    for (const file of Array.from(files ?? [])) {
      const bytes = await toBytes(file)
      if (!bytes) {
        toast.error(`${file.name} is too large to stash`)
        continue
      }
      await coffer.items.addImage({ data: bytes })
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const canSubmit = text.trim().length > 0

  return (
    <div className="shrink-0 border-t bg-card/40 p-2">
      <Textarea
        ref={areaRef}
        rows={1}
        value={text}
        placeholder="Type a stash…"
        onChange={(event) => {
          setText(event.target.value)
          resize(event.target)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            submit()
          }
        }}
        className="max-h-32 min-h-0 resize-none border-0 bg-transparent px-2 py-1.5 shadow-none focus-visible:ring-0 dark:bg-transparent"
      />

      <div className="flex items-center gap-1.5 pt-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="secondary" size="sm" disabled={stashing} onClick={() => void grabSelection()}>
              <MousePointerSquareDashed />
              {stashing ? 'Grabbing…' : 'Grab selection'}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy whatever is selected in the app in front</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Clip a region"
              onClick={() => void coffer.clipper.start()}
            >
              <Crop />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clip a region of the screen</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Add image"
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add an image file</TooltipContent>
        </Tooltip>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(event) => void pickImages(event.target.files)}
        />

        <Button
          size="icon-sm"
          className="ml-auto"
          disabled={!canSubmit}
          aria-label="Add stash"
          onClick={submit}
        >
          <ArrowUp />
        </Button>
      </div>
    </div>
  )
}

function resize(element: HTMLTextAreaElement | null): void {
  if (!element) return
  element.style.height = 'auto'
  element.style.height = `${Math.min(element.scrollHeight, 128)}px`
}
