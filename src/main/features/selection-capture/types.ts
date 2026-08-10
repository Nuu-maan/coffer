import type { NativeImage } from 'electron'

export type Capture =
  | { ok: true; kind: 'text'; text: string }
  | { ok: true; kind: 'image'; image: NativeImage }
  | { ok: false; reason: 'empty' | 'failed' | 'unsupported' }
