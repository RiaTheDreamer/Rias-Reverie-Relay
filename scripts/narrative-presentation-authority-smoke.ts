// @ts-nocheck -- Bun smoke harness uses runtime crypto without Node typings.
import { createHash } from 'node:crypto'
import {
  NARRATIVE_REGEX_VARIANTS,
  narrativeRegexPack,
  narrativeRegexScripts,
  type NarrativeRegexScript,
  type NarrativeRegexVariant,
} from '../src/narrativeRegexAssets'

function assert(value: unknown, reason: string): asserts value {
  if (!value) throw new Error(reason)
}

function presentationHash(scripts: NarrativeRegexScript[]): string {
  const authority = scripts.map(({ script_id, replace_string }) => ({ script_id, replace_string }))
  return createHash('sha256').update(JSON.stringify(authority)).digest('hex')
}

const EXPECTED: Record<NarrativeRegexVariant, { raw: string; assembled: string }> = {
  inline: {
    raw: 'fedb87a76b45236206c498243a86d160f3b53921c2382a35fc04ac1b7c9f9d77',
    assembled: '1e0a11a25a9eddd2adfcbd19110de6e77d92fe84bb32714b98328f39da39cc57',
  },
  'plain-button': {
    raw: '2fc76fd965435f4d50ed2772cdc6145efe982a9bb3afc1327444e724b49d6b0e',
    assembled: '51d527eefed3e01fb1c0d0d5336bcc7da511f07d5b8f5c42a0ac5f9c65b09363',
  },
  'sparkle-button': {
    raw: '866e8351a2455f9c9754135c2c114a37a73292368f6f0db867d11920796e2c6b',
    assembled: '8f82b1f497e1e62d4d4012c2470c92b83b5769353855a96c6cdf8a4a7900e29f',
  },
  glass: {
    raw: 'e91c242f9ffd7c336562802cc5c766aafc30bf925b0cd7a380afd761fe89c6cb',
    assembled: 'cc1f3a3c50019c85305aa5bb6d427ae72224a547c1f2f838a1dc5dd8f90602e3',
  },
  'plain-glass': {
    raw: 'd7adeea0003765870b6a06d6add585c1a9e743e581f21c99c94e8c9fda50a787',
    assembled: '1055294859a39b19f1fcfb02cf7033176162aa2c6924669487e25edd88d7d1b8',
  },
}

const GLASS_BODY_ASSEMBLED = '04cee0e26855b6cdd75454d42f11e7e06138690a34fa18db7eda2e5a0e5966ed'

for (const variant of NARRATIVE_REGEX_VARIANTS) {
  const raw = narrativeRegexPack(variant).scripts
  const assembled = narrativeRegexScripts(variant)
  const rawHash = presentationHash(raw)
  const assembledHash = presentationHash(assembled)
  assert(raw.length === (variant === 'glass' || variant === 'plain-glass' ? 95 : 93), `${variant}: raw Narrative authority inventory changed`)
  assert(assembled.length === 56, `${variant}: assembled Narrative authority inventory changed`)
  assert(rawHash === EXPECTED[variant].raw && assembledHash === EXPECTED[variant].assembled, `${variant}: Narrative presentation authority drifted (raw ${rawHash}, assembled ${assembledHash})`)
}

assert(presentationHash(narrativeRegexScripts('glass', 'glass')) === GLASS_BODY_ASSEMBLED, 'Glass Color Mode must retain its complete independent body authority')

console.log('Narrative presentation authority lock passed: 5 variants, 469 raw scripts and 280 assembled active scripts, replace_string/presentation drift 0.')
