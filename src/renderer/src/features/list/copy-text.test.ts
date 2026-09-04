import { describe, expect, it } from 'vitest'
import type { Item } from '@shared/types/item'
import { asNumberedList, asParagraphs } from './copy-text'

const text = (id: string, body: string): Item => ({
  id,
  kind: 'text',
  text: body,
  done: false,
  order: 0,
  createdAt: 0
})

const image = (id: string, caption: string): Item => ({
  id,
  kind: 'image',
  caption,
  images: [{ file: `${id}.png`, width: 10, height: 10, bytes: 100 }],
  done: false,
  order: 0,
  createdAt: 0
})

describe('asNumberedList', () => {
  it('numbers from one, in the order it is given', () => {
    expect(asNumberedList([text('a', 'item1'), text('b', 'item2')])).toBe('1. item1\n2. item2')
  })

  it('folds a stash of its own line breaks into one entry', () => {
    expect(asNumberedList([text('a', 'first\nsecond'), text('b', 'third')])).toBe(
      '1. first second\n2. third'
    )
  })

  it('trims, so the number is not followed by whitespace', () => {
    expect(asNumberedList([text('a', '  padded  ')])).toBe('1. padded')
  })

  it('numbers an image by its caption', () => {
    expect(asNumberedList([image('a', 'a screenshot'), text('b', 'a note')])).toBe(
      '1. a screenshot\n2. a note'
    )
  })

  /* Dropped rather than numbered as a blank — and the numbering closes over the
     gap, so it never counts to three while showing two lines. */
  it('leaves out anything with no text and renumbers around it', () => {
    expect(asNumberedList([text('a', 'kept'), image('b', ''), text('c', 'also kept')])).toBe(
      '1. kept\n2. also kept'
    )
  })

  it('is empty when nothing has text', () => {
    expect(asNumberedList([])).toBe('')
    expect(asNumberedList([image('a', '')])).toBe('')
  })
})

describe('asParagraphs', () => {
  it('separates with a blank line and keeps the line breaks inside a stash', () => {
    expect(asParagraphs([text('a', 'first\nsecond'), text('b', 'third')])).toBe(
      'first\nsecond\n\nthird'
    )
  })
})
