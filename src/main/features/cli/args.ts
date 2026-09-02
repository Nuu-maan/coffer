export type ForwardedAction =
  | { kind: 'stash' }
  | { kind: 'clip' }
  | { kind: 'copy'; id: string }
  | { kind: 'done'; id: string }

function flagValue(argv: readonly string[], flag: string): string | undefined {
  const inlined = argv.find((arg) => arg.startsWith(flag + '='))
  if (inlined) return inlined.slice(flag.length + 1) || undefined

  const index = argv.indexOf(flag)
  if (index === -1) return undefined
  const next = argv[index + 1]
  if (next && !next.startsWith('-')) return next
  return argv.slice(1).filter((arg) => !arg.startsWith('-')).pop()
}

export function parseForwardedAction(argv: readonly string[]): ForwardedAction | null {
  if (argv.includes('--stash')) return { kind: 'stash' }
  if (argv.includes('--clip')) return { kind: 'clip' }

  const copyId = flagValue(argv, '--copy')
  if (copyId) return { kind: 'copy', id: copyId }

  const doneId = flagValue(argv, '--done')
  if (doneId) return { kind: 'done', id: doneId }

  return null
}
