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

  /* Chromium hands the running instance an argv with every switch first and
     the positional arguments last, so the id no longer follows its flag. */
  it('finds the id after Chromium has moved it to the end', () => {
    expect(parseForwardedAction(['coffer', '--done', '--no-sandbox', 'byW9AwaE4DQz']))
      .toEqual({ kind: 'done', id: 'byW9AwaE4DQz' })
    expect(parseForwardedAction(['coffer', '--copy', '--hidden', 'byW9AwaE4DQz']))
      .toEqual({ kind: 'copy', id: 'byW9AwaE4DQz' })
  })

  it('reads the inlined form, which survives argv reordering', () => {
    expect(parseForwardedAction(['coffer', '--copy=byW9AwaE4DQz']))
      .toEqual({ kind: 'copy', id: 'byW9AwaE4DQz' })
    expect(parseForwardedAction(['coffer', '--done=byW9AwaE4DQz']))
      .toEqual({ kind: 'done', id: 'byW9AwaE4DQz' })
    expect(parseForwardedAction(['coffer', '--copy='])).toBeNull()
  })

  it('prefers the inlined id over a stray positional', () => {
    expect(parseForwardedAction(['coffer', '--done=abc', 'out/main/index.js']))
      .toEqual({ kind: 'done', id: 'abc' })
  })

  it('prefers capture over the item flags when both are passed', () => {
    expect(parseForwardedAction(['coffer', '--stash', '--copy', 'abc']))
      .toEqual({ kind: 'stash' })
  })
})
