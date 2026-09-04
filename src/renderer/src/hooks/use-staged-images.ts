import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { MAX_IMAGES } from '@shared/constants'
import { toBytes } from '@/lib/images'

/** A picture waiting in the composer: its bytes, and a URL to draw it with. */
export type StagedImage = {
  /** The object URL, which is unique per attachment and doubles as the key. */
  id: string
  url: string
  bytes: Uint8Array
}

export type Staging = {
  images: StagedImage[]
  /** Takes as many as there is room for, and says so when it cannot take them all. */
  attach: (files: File[]) => Promise<void>
  remove: (id: string) => void
  clear: () => void
}

/*
 * Pictures held between arriving and being stashed.
 *
 * They arrive one way or another — pasted, dropped, picked from a dialog — and
 * they all land here rather than each making a stash of its own, because a
 * paste of four screenshots is one thought with four pictures in it. The
 * composer is where a thought is assembled, so it is where they wait, and the
 * caption typed under them is the caption they are stashed with.
 *
 * Nothing here touches the store. Until Return is pressed there is no stash and
 * no PNG on disk, which is what makes the x on a thumbnail a free action rather
 * than a delete with an undo behind it.
 */
export function useStagedImages(): Staging {
  const [images, setImages] = useState<StagedImage[]>([])

  /*
   * The count, kept in a ref beside the state.
   *
   * Attaching has an await in the middle of it — reading the file — and two
   * pastes in quick succession both start before either finishes. Reading the
   * room left from `images` would have them both see an empty tray and both
   * claim the whole cap. The ref is claimed before the await and given back
   * after, so the second paste sees what the first took.
   */
  const count = useRef(0)

  /* Object URLs are a resource, not a string, and the ones still open are not
     derivable from a render's state by the time an unmount cleanup runs. */
  const open = useRef<Set<string>>(new Set())

  const release = useCallback((url: string) => {
    if (!open.current.delete(url)) return
    URL.revokeObjectURL(url)
  }, [])

  useEffect(() => {
    const urls = open.current
    return () => {
      for (const url of urls) URL.revokeObjectURL(url)
      urls.clear()
    }
  }, [])

  const attach = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return

      const room = MAX_IMAGES - count.current
      if (room <= 0) {
        toast(`Only ${MAX_IMAGES} images fit in one stash`)
        return
      }

      const wanted = files.slice(0, room)
      const overflowed = files.length - wanted.length
      count.current += wanted.length

      const prepared: StagedImage[] = []
      for (const file of wanted) {
        const bytes = await toBytes(file)
        if (!bytes) {
          toast.error(`${file.name || 'Image'} is too large to stash`)
          continue
        }
        /* From the File rather than from the bytes, so the URL carries the
           real type and the browser decodes a JPEG as a JPEG. */
        const url = URL.createObjectURL(file)
        open.current.add(url)
        prepared.push({ id: url, url, bytes })
      }

      /* The room the rejected ones were holding, handed back. */
      count.current -= wanted.length - prepared.length

      if (prepared.length > 0) setImages((current) => [...current, ...prepared])

      /* Said once for the batch. A toast per file over the line would be three
         toasts for one paste, all saying the same thing. */
      if (overflowed > 0) toast(`Only ${MAX_IMAGES} images fit in one stash`)
    },
    []
  )

  const remove = useCallback(
    (id: string) => {
      setImages((current) => {
        const next = current.filter((image) => image.id !== id)
        count.current = next.length
        return next
      })
      release(id)
    },
    [release]
  )

  const clear = useCallback(() => {
    count.current = 0
    setImages((current) => {
      for (const image of current) release(image.url)
      return current.length === 0 ? current : []
    })
  }, [release])

  return { images, attach, remove, clear }
}
