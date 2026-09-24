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
    assembled: '7ce7ce2c7f24defe04c9c2312e28f89c73d5c904234279adfb7a461af1f21c13',
  },
  'plain-button': {
    raw: '2fc76fd965435f4d50ed2772cdc6145efe982a9bb3afc1327444e724b49d6b0e',
    assembled: 'ee3de1ce1ff2d05bee22b3a3e8a7657b0c2a6476e27ff1d93a7201ce074c3a9b',
  },
  'sparkle-button': {
    raw: '866e8351a2455f9c9754135c2c114a37a73292368f6f0db867d11920796e2c6b',
    assembled: '4e8a3c21a9521686aa8f1c00047f796d4617a77e0c54802c6c1080a0e4cd3e47',
  },
  glass: {
    raw: 'e91c242f9ffd7c336562802cc5c766aafc30bf925b0cd7a380afd761fe89c6cb',
    assembled: 'e852440da3b1a15d109ece6efa88275ed9e2c1e0826ae2a5af8e4e57c3b9e006',
  },
}

const GLASS_BODY_ASSEMBLED = '65c143df732843598c11a9914ffb61614245ccc39d88c07eed35435eb0b774a8'

for (const variant of NARRATIVE_REGEX_VARIANTS) {
  const raw = narrativeRegexPack(variant).scripts
  const assembled = narrativeRegexScripts(variant)
  const rawHash = presentationHash(raw)
  const assembledHash = presentationHash(assembled)
  assert(raw.length === (variant === 'glass' ? 95 : 93), `${variant}: raw Narrative authority inventory changed`)
  assert(assembled.length === 56, `${variant}: assembled Narrative authority inventory changed`)
  assert(rawHash === EXPECTED[variant].raw && assembledHash === EXPECTED[variant].assembled, `${variant}: Narrative presentation authority drifted (raw ${rawHash}, assembled ${assembledHash})`)
}

assert(presentationHash(narrativeRegexScripts('glass', 'glass')) === GLASS_BODY_ASSEMBLED, 'Glass Color Mode must retain its complete independent body authority')

console.log('Narrative presentation authority lock passed: 4 variants, 374 raw scripts and 224 assembled active scripts, replace_string/presentation drift 0.')
