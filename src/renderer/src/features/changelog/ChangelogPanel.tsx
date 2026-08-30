import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useReportScrolled } from '@/hooks/use-scrolled'
import { RELEASES } from './entries'

/*
 * The changelog, in the window rather than on a release page.
 *
 * It is a reading screen and nothing else, so it is set as prose: one column,
 * a version as its heading, and the changes as sentences. The dot down the
 * leading edge is what makes a scan of the versions possible without the
 * headings having to shout — the current one is filled, the shipped ones are
 * outlined.
 */
export function ChangelogPanel(): React.JSX.Element {
  const reportScrolled = useReportScrolled()

  return (
    <ScrollArea className="h-full bg-background" onViewportScroll={reportScrolled}>
      <div className="flex flex-col gap-5 px-3 py-3">
        {RELEASES.map((release) => (
          <section key={release.version} className="relative pl-4">
            <span
              aria-hidden
              className={cn(
                'absolute top-[5px] left-0 size-[7px] rounded-full',
                release.unreleased ? 'bg-tint' : 'border border-border-strong'
              )}
            />

            <div className="flex items-baseline gap-2">
              <h2 className="text-md font-semibold tabular-nums">{release.version}</h2>
              <span className="text-2xs text-muted-foreground tabular-nums">
                {release.unreleased ? 'Unreleased' : date(release.date)}
              </span>
            </div>

            <ul className="mt-1.5 flex flex-col gap-1.5">
              {release.changes.map((change) => (
                <li
                  key={change}
                  className="relative pl-3 text-base text-muted-foreground [text-wrap:pretty]"
                >
                  <span
                    aria-hidden
                    className="absolute top-[8px] left-0 size-[3px] rounded-full bg-border-strong"
                  />
                  {change}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </ScrollArea>
  )
}

function date(value: string): string {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
