// @ts-nocheck -- Bun smoke harness uses runtime crypto without Node typings.
import { createHash } from 'node:crypto'
import {
  NARRATIVE_REGEX_VARIANTS,
  narrativeRegexPack,
  narrativeRegexScripts,
  type NarrativeRegexScript,
  type NarrativeRegexVariant,
} from '../src/narrativeRegexAssets'
import { PLOT_SPARKS_SCRIPT_ID, PLOT_SPARKS_LEGACY_SCRIPT_ID } from '../src/plotSparksPresentation'

function assert(value: unknown, reason: string): asserts value {
  if (!value) throw new Error(reason)
}

function presentationHash(scripts: NarrativeRegexScript[]): string {
  const authority = scripts.map(({ script_id, replace_string }) => ({ script_id, replace_string }))
  return createHash('sha256').update(JSON.stringify(authority)).digest('hex')
}

const EXPECTED: Record<NarrativeRegexVariant, { raw: string; assembled: string }> = {
  inline: {
    raw: 'a2375cb9cce3d6605a7cada86d7412132f94ae45ce76b1fbdf39dd7093fc8b40',
    assembled: '9adaad5c5f393a6e4013ffc2207acdf9e505df107a2cbdadff3bf33087f3fb04',
  },
  'plain-button': {
    raw: '11fb59ac7095ef9b5a71776666f68a76d04adec0e8d09346ad19865e477de978',
    assembled: 'e494266ac4f63a93d0f1e1dd3d01066a09875a2108c2b4b57bb3b1ba5a57e6c5',
  },
  'sparkle-button': {
    raw: 'a2c7bbae82abbab02c2ebf876937b0ce55e8525f3a6489524c3be3d3b12d6854',
    assembled: '7096349ad19ce13dad31b08e4691f394b4413613834dcfffbd468a088f2aa430',
  },
  glass: {
    raw: 'fbfe2b91bf60b66b381f772c7e8a69970a13c99ce2151bd237f23cf05ea51bc9',
    assembled: '40bad52ac82c132fb7a8c2c6693e899feb0f42a4df125756e80a67baea5eb4c7',
  },
  'plain-glass': {
    raw: '3500a32d1e2952a251259ebb9c61db715de55869e33580f6836c5ddabe1fb8d8',
    assembled: '9f6dcc082ead75c34c17aa36864d4119fa17c73076e78bb0183dee522c87d06b',
  },
}

const GLASS_BODY_ASSEMBLED = 'a971857d5df926fe0240194d7ae2dc8d47471c8279b5ffdb91a982ca00025ed9'

// XML normalization replacements and the ten-Spark extension are intentional.
// Rendered HTML/CSS remains byte-identical to the pre-migration authority.
// Lock every other
// assembled body and the saved seven-panel body to the original authority;
// the ten-panel captures, actions and all color/presentation variants have
// their own executable acceptance gate in plot-sparks-ten-options-smoke.ts.
function originalAuthorityProjection(scripts: NarrativeRegexScript[]): NarrativeRegexScript[] {
  return scripts.filter(script => script.script_id !== PLOT_SPARKS_SCRIPT_ID)
    .map(script => script.script_id === PLOT_SPARKS_LEGACY_SCRIPT_ID ? { ...script, script_id: PLOT_SPARKS_SCRIPT_ID } : script)
}

for (const variant of NARRATIVE_REGEX_VARIANTS) {
  const raw = narrativeRegexPack(variant).scripts
  const assembled = narrativeRegexScripts(variant)
  const rawHash = presentationHash(raw)
  const assembledHash = presentationHash(originalAuthorityProjection(assembled))
  assert(raw.length === (variant === 'glass' || variant === 'plain-glass' ? 95 : 93), `${variant}: raw Narrative authority inventory changed`)
  assert(assembled.length === 57, `${variant}: assembled Narrative authority inventory changed`)
  assert(rawHash === EXPECTED[variant].raw && assembledHash === EXPECTED[variant].assembled, `${variant}: Narrative presentation authority drifted (raw ${rawHash}, assembled ${assembledHash})`)
}

assert(presentationHash(originalAuthorityProjection(narrativeRegexScripts('glass', 'glass'))) === GLASS_BODY_ASSEMBLED, 'Glass Color Mode must retain its complete independent body authority')

console.log('Narrative presentation authority lock passed: 5 variants, 469 raw scripts and 285 assembled active scripts; intentional ten-Spark extension isolated, all other presentation drift 0.')
