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
    assembled: '88d8c83c84ec342b7160e47d732117fd328b6295e8b795ce4128ffde5d1c4362',
  },
  'plain-button': {
    raw: '2fc76fd965435f4d50ed2772cdc6145efe982a9bb3afc1327444e724b49d6b0e',
    assembled: '1c66269582be5691dc00ed912225db6c02cb757f5bf802b36d8718bbff5f5fc3',
  },
  'sparkle-button': {
    raw: '866e8351a2455f9c9754135c2c114a37a73292368f6f0db867d11920796e2c6b',
    assembled: '7c524ddd1863db5c8c949085b51c75d6705ab940ff6f31bb6e1ed1c4711f94a2',
  },
  glass: {
    raw: '7494a34bf123aaae1b58900810b7cb1c3ac3bdd2d7d12c0fbe3292ec0657074a',
    assembled: '5ec0af94883f6fea28fd0f93e88560621aff80ab3c6e86412af238eebb4f83f8',
  },
}

for (const variant of NARRATIVE_REGEX_VARIANTS) {
  const raw = narrativeRegexPack(variant).scripts
  const assembled = narrativeRegexScripts(variant)
  const rawHash = presentationHash(raw)
  const assembledHash = presentationHash(assembled)
  assert(raw.length === (variant === 'glass' ? 95 : 93), `${variant}: raw Narrative authority inventory changed`)
  assert(assembled.length === 56, `${variant}: assembled Narrative authority inventory changed`)
  assert(rawHash === EXPECTED[variant].raw && assembledHash === EXPECTED[variant].assembled, `${variant}: Narrative presentation authority drifted (raw ${rawHash}, assembled ${assembledHash})`)
}

console.log('Narrative presentation authority lock passed: 4 variants, 374 raw scripts and 224 assembled active scripts, replace_string/presentation drift 0.')
