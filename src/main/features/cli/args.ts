export type ForwardedAction =
  | { kind: 'stash' }
  | { kind: 'clip' }
  | { kind: 'copy'; id: string }
  | { kind: 'done'; id: string }

function flagValue(argv: readonly string[], flag: string): string | undefined {
  const index = argv.indexOf(flag)
  if (index === -1) return undefined
  const value = argv[index + 1]
  return value && !value.startsWith('--') ? value : undefined
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
