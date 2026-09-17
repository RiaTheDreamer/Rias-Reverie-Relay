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
    assembled: '751e34ac7d58518f7390b4a5670cb9f967848f0227ff934fbff5f0dc9056ff8d',
  },
  'plain-button': {
    raw: '2fc76fd965435f4d50ed2772cdc6145efe982a9bb3afc1327444e724b49d6b0e',
    assembled: '224a32298317254b9ef2a9355a0cc50194e30c7c04b4ab8a7d17d90f8eafdda0',
  },
  'sparkle-button': {
    raw: '866e8351a2455f9c9754135c2c114a37a73292368f6f0db867d11920796e2c6b',
    assembled: 'a0ee1981ed177fd3e5aaf1b085f9eda5e9f5a3d988d3fdd17dde475c5be0ffc1',
  },
}

for (const variant of NARRATIVE_REGEX_VARIANTS) {
  const raw = narrativeRegexPack(variant).scripts
  const assembled = narrativeRegexScripts(variant)
  assert(raw.length === 93, `${variant}: raw Narrative authority inventory changed`)
  assert(assembled.length === 56, `${variant}: assembled Narrative authority inventory changed`)
  assert(presentationHash(raw) === EXPECTED[variant].raw, `${variant}: raw Narrative replace_string authority drifted`)
  assert(presentationHash(assembled) === EXPECTED[variant].assembled, `${variant}: assembled Narrative presentation authority drifted`)
}

console.log('Narrative presentation authority lock passed: 3 variants, 279 raw scripts and 168 assembled active scripts, replace_string/presentation drift 0.')
