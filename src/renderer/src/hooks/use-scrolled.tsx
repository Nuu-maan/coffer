import { createContext, useCallback, useContext, useState } from 'react'

/*
 * Whether the panel under the title bar has been scrolled away from its top.
 *
 * The bar draws a hairline only while that is true, which is how macOS and iOS
 * do it: at rest the bar and the content are one surface, and the line appears
 * to say there is something above rather than to fence the two apart. A rule
 * that is always there says nothing, which is most of what made this window
 * read as a wireframe.
 *
 * It lives in a context because the two sides of it are in different trees —
 * the bar is in App, the scroller is inside whichever tab is mounted — and the
 * tabs crossfade, so the old one is still reporting while the new one mounts.
 * The report carries no identity, so `reset` is what the tab switch calls to
 * stop a stale `true` from outliving the panel that set it.
 */
const ScrolledContext = createContext<(scrolled: boolean) => void>(() => {})

export function useReportScrolled(): (event: React.UIEvent<HTMLElement>) => void {
  const report = useContext(ScrolledContext)
  return useCallback(
    (event: React.UIEvent<HTMLElement>) => report(event.currentTarget.scrollTop > 0),
    [report]
  )
}

export function useScrolled(): {
  scrolled: boolean
  reset: () => void
  Provider: (props: { children: React.ReactNode }) => React.JSX.Element
} {
  const [scrolled, setScrolled] = useState(false)
  const reset = useCallback(() => setScrolled(false), [])

  const Provider = useCallback(
    ({ children }: { children: React.ReactNode }) => (
      <ScrolledContext.Provider value={setScrolled}>{children}</ScrolledContext.Provider>
    ),
    []
  )

  return { scrolled, reset, Provider }
}
