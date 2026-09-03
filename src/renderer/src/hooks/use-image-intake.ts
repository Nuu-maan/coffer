import { useEffect, useState } from 'react'
import { hasImage, imageFilesFrom } from '@/lib/images'

type Intake = {
  dragging: boolean
  handlers: {
    onDragOver: (event: React.DragEvent) => void
    onDragLeave: (event: React.DragEvent) => void
    onDrop: (event: React.DragEvent) => void
  }
}

/*
 * The two ways a picture arrives from outside the window, both ending in the
 * same place: the composer's tray, not the list.
 *
 * They used to each make a stash on the spot. That is the right answer for one
 * picture and the wrong one for four — four stashes, four captions to write,
 * four rows for one thing — and it left no moment at which a caption could be
 * typed. Staging them costs a Return and buys both.
 *
 * The paste listener is on the window rather than on the field, because a paste
 * meant for this panel is a paste anywhere in it. Pasting into the composer's
 * own textarea is text, and the browser has already handled that by the time
 * this sees an image-less clipboard and stands down.
 */
export function useImageIntake(attach: (files: File[]) => Promise<void>): Intake {
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    function onPaste(event: ClipboardEvent): void {
      const files = imageFilesFrom(event.clipboardData)
      if (files.length === 0) return
      event.preventDefault()
      void attach(files)
    }

    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [attach])

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
        void attach(files)
      }
    }
  }
}
