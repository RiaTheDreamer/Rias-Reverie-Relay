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
    assembled: 'bf8acaca65078e41b8323e4e8b288701f94072e396d47ed7badb906aa43f53b7',
  },
  'plain-button': {
    raw: '2fc76fd965435f4d50ed2772cdc6145efe982a9bb3afc1327444e724b49d6b0e',
    assembled: 'fb8f735c733b4cf74000cb92f366fc0e9f636f6fffa4338f2fa8cc7e55da9dc0',
  },
  'sparkle-button': {
    raw: '866e8351a2455f9c9754135c2c114a37a73292368f6f0db867d11920796e2c6b',
    assembled: '2311b58261bb4b98c8210c78cb20d618b73ed3d5ba9ebcd3f3eb5e5a90b7c2e7',
  },
  glass: {
    raw: 'e91c242f9ffd7c336562802cc5c766aafc30bf925b0cd7a380afd761fe89c6cb',
    assembled: '632dff96cc93443749dbe2722554b1a4d13f80dbfcb6ff8bf6aa7cc659223a7e',
  },
  'plain-glass': {
    raw: 'd7adeea0003765870b6a06d6add585c1a9e743e581f21c99c94e8c9fda50a787',
    assembled: 'a57a781df597d7aa4ff8c636daa6c04470108e393a12fbd780063037a5bd9232',
  },
}

const GLASS_BODY_ASSEMBLED = 'cc1c4d5b157e4c0a1693737b06f513ed6d70fcff339b8d41d8175e1413caf9d0'

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
