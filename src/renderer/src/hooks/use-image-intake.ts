import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { hasImage, imageFilesFrom, toBytes } from '@/lib/images'

type Intake = {
  dragging: boolean
  handlers: {
    onDragOver: (event: React.DragEvent) => void
    onDragLeave: (event: React.DragEvent) => void
    onDrop: (event: React.DragEvent) => void
  }
}

export function useImageIntake(addImage: (data: Uint8Array) => Promise<void>): Intake {
  const [dragging, setDragging] = useState(false)

  const ingest = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        const bytes = await toBytes(file)
        if (!bytes) {
          toast.error(`${file.name || 'Image'} is too large to stash`)
          continue
        }
        await addImage(bytes)
      }
    },
    [addImage]
  )

  useEffect(() => {
    function onPaste(event: ClipboardEvent): void {
      const files = imageFilesFrom(event.clipboardData)
      if (files.length === 0) return
      event.preventDefault()
      void ingest(files)
    }

    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [ingest])

  return {
    dragging,
    handlers: {
      onDragOver: (event) => {
        if (!hasImage(event.dataTransfer)) return
        event.preventDefault()
        setDragging(true)
      },
      onDragLeave: (event) => {
        if (event.currentTarget === event.target) setDragging(false)
      },
      onDrop: (event) => {
        const files = imageFilesFrom(event.dataTransfer)
        setDragging(false)
        if (files.length === 0) return
        event.preventDefault()
        void ingest(files)
      }
    }
  }
}
