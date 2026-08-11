import { useEffect, useState } from 'react'

/*
 * A value that lives in the main process, held here for as long as the window
 * does.
 *
 * Panels are unmounted when their tab is left, so a hook that starts at null
 * and fetches on mount makes every return to the tab blink: an empty panel for
 * one frame, then the whole thing reassembling as each request lands. The cache
 * is what lets a remount paint the last known value on its first frame, and the
 * subscription is opened once rather than per mount.
 */
export type RemoteValue<T> = {
  /** The current value, or null until the first fetch lands. */
  use(): T | null
  /** The current value outside a render, for building a patch from. */
  peek(): T | null
  /** Publish a value the window already knows, ahead of the main process. */
  set(value: T): void
}

export function remoteValue<T>(
  fetch: () => Promise<T>,
  subscribe?: (listener: (value: T) => void) => () => void
): RemoteValue<T> {
  let cached: T | null = null
  let started = false
  const listeners = new Set<(value: T) => void>()

  function publish(value: T): void {
    cached = value
    for (const listener of listeners) listener(value)
  }

  function start(): void {
    if (started) return
    started = true
    void fetch().then(publish)
    // Never torn down: the subscription belongs to the window, not to whichever
    // panel happened to mount first.
    subscribe?.(publish)
  }

  return {
    use() {
      const [value, setValue] = useState<T | null>(cached)

      useEffect(() => {
        listeners.add(setValue)
        start()
        // Covers the gap between reading the cache for the initial state and
        // subscribing, which another panel's fetch can land in.
        if (cached !== null) setValue(cached)
        return () => {
          listeners.delete(setValue)
        }
      }, [])

      return value
    },
    peek: () => cached,
    set: publish
  }
}
