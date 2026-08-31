import { describe, expect, it } from 'vitest'
import { parseForwardedAction } from './args'

describe('parseForwardedAction', () => {
  it('reads the capture flags', () => {
    expect(parseForwardedAction(['coffer', '--stash'])).toEqual({ kind: 'stash' })
    expect(parseForwardedAction(['coffer', '--clip'])).toEqual({ kind: 'clip' })
  })

  it('reads the id that follows --copy and --done', () => {
    expect(parseForwardedAction(['coffer', '--copy', 'byW9AwaE4DQz']))
      .toEqual({ kind: 'copy', id: 'byW9AwaE4DQz' })
    expect(parseForwardedAction(['coffer', '--done', 'byW9AwaE4DQz']))
      .toEqual({ kind: 'done', id: 'byW9AwaE4DQz' })
  })

  it('is nothing for a plain launch', () => {
    expect(parseForwardedAction(['coffer'])).toBeNull()
    expect(parseForwardedAction(['coffer', '--hidden'])).toBeNull()
  })

  it('is nothing when an id is missing, so the launch opens the window', () => {
    expect(parseForwardedAction(['coffer', '--copy'])).toBeNull()
    expect(parseForwardedAction(['coffer', '--done'])).toBeNull()
  })

  it('does not read the next flag as an id', () => {
    expect(parseForwardedAction(['coffer', '--copy', '--hidden'])).toBeNull()
  })

  it('prefers capture over the item flags when both are passed', () => {
    expect(parseForwardedAction(['coffer', '--stash', '--copy', 'abc']))
      .toEqual({ kind: 'stash' })
  })
})
