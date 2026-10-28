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
    raw: '30b9c996ed782dd68b41250e85a195334b11073c64ab3d6e1153d28facea2c70',
    assembled: '4afe3a6189f29cbb7a3d530d270548b923760a018e14ba58008e1fd68fd30c2d',
  },
  'plain-button': {
    raw: 'f3d420e1fda3b714093c2b17787a24f9b57c02d3f380358433e63ba31c84cb48',
    assembled: '42c25f1d63e1727d1e51c6cbf2cc5c3410bfcec8dbe867cbaff1a4d47b862d4c',
  },
  'sparkle-button': {
    raw: '04992973f01e05ed44f02826e05b91b66b62ac466224f636dcdd65e51c417796',
    assembled: '96588eadb0917c71b9a67144b7c3e00e854a1e8a257695e2f94018bb64aefe5c',
  },
  glass: {
    raw: 'cde271e1c5960aa026a2e842e1c71903dbd06826e9d5d2c843ab1d747313421f',
    assembled: '5520e473be6955c2e83d9e8cf4cbf48f91ddc6f1fa550d9faecf6665c972fb9b',
  },
  'plain-glass': {
    raw: 'bb324036cfc7243f66b5a61c3dc8777e8e81aee4f8c3a2cf20f29d67e58c2098',
    assembled: 'f373dc5d80f5892dfefa5782f2f4c9ca2f72763980deb77fd85d0c81b7c3a34c',
  },
}

const GLASS_BODY_ASSEMBLED = '6ac92f74fe5f7dea2036a09a61f887ac2fad8a15ec3d86590d450096143d2881'

// Snapshot from the previous release, excluding only launcher tags and their
// owned shared icon sheet. Every other card byte still belongs to that release.
const BODY_AUTHORITY = {
  inline: '14947aa21ab804c894250d6b67f5328d22f6995ef3690823a9bd36a66aefd0e7',
  'plain-button': '55058a4b2123b90462d351eabdd9d2362b73f888790ae4e02f04c07e1c82370b',
  'sparkle-button': '503b6f1585dd6dc5a98a3081a0576387d843404a78a0847dad0a1ad657c14ab1',
  glass: '5becdfcc4ac7c9bec81b336ac93ac545d83927b3f0999832d2ae70ef497ca7d7',
  'plain-glass': 'c21eb14f45bfb0274d60d5cbc6fed5992ed4b491042390e7f4e2bc607764b898',
  'glass-color': 'e7a9e5c960d1a9f1f5e45d3d2bde00e6d46dbcd5b0d58bcd2fe37d77e7790e1b',
}
function bodyAuthorityHash(scripts: NarrativeRegexScript[]): string {
  return presentationHash(originalAuthorityProjection(scripts).map(script => ({...script, replace_string:script.replace_string
    .replace(/<summary\b[\s\S]*?<\/summary>/gi, '<!-- launcher -->')
    .replace(/<label\b[^>]*class="[^"]*\brrcp-launch\b[^"]*"[\s\S]*?<\/label>/gi, '<!-- phone launcher -->')
    .replace(/<style data-rr-surface-icon-style="1">[\s\S]*?<\/style>/g, '')})))
}

// Raw assets use the current neutral style-marker name; this metadata-only
// rename does not change the assembled presentation hashes below.
// XML normalization replacements and the ten-Spark extension are intentional.
// Card HTML/CSS remains byte-identical to the pre-migration authority. The
// identity echo is an intentional, separately tested display-only prefix.
// Lock every other
// assembled body and the saved seven-panel body to the original authority;
// the ten-panel captures, actions and all color/presentation variants have
// their own executable acceptance gate in plot-sparks-ten-options-smoke.ts.
function originalAuthorityProjection(scripts: NarrativeRegexScript[]): NarrativeRegexScript[] {
  const identityById = {
    reverie_npc_intro_images_v1: ['cast-introduction', 'name'],
    reverie_npc_upgrade_images_v1: ['cast-introduction', 'name'],
    reverie_npc_ref_v1: ['cast-introduction', 'name'],
    reverie_npc_relationship_v1: ['cast-introduction', 'name'],
    relay_shenanigans_dossier_images_sparkle_v1: ['character-dossier', 'visible'],
    relay_shenanigans_location_images_sparkle_v1: ['location-file', 'visible'],
  }
  return scripts.filter(script => script.script_id !== PLOT_SPARKS_SCRIPT_ID)
    .map(script => script.script_id === PLOT_SPARKS_LEGACY_SCRIPT_ID ? { ...script, script_id: PLOT_SPARKS_SCRIPT_ID } : script)
    .map(script => {
      const identity = identityById[script.script_id]
      if (!identity) return script
      const prefix = `<span data-reverie-narrative-identity="${identity[0]}">$<${identity[1]}></span>`
      assert(script.replace_string.startsWith(prefix), `${script.script_id}: exact identity-preservation prefix missing`)
      return { ...script, replace_string: script.replace_string.slice(prefix.length) }
    })
}

for (const variant of NARRATIVE_REGEX_VARIANTS) {
  const raw = narrativeRegexPack(variant).scripts
  const assembled = narrativeRegexScripts(variant)
  const rawHash = presentationHash(raw)
  const assembledHash = presentationHash(originalAuthorityProjection(assembled))
  assert(bodyAuthorityHash(assembled) === BODY_AUTHORITY[variant], `${variant}: card content outside the owned launcher changed`)
  assert(raw.length === (variant === 'glass' || variant === 'plain-glass' ? 95 : 93), `${variant}: raw Narrative authority inventory changed`)
  assert(assembled.length === 57, `${variant}: assembled Narrative authority inventory changed`)
  assert(rawHash === EXPECTED[variant].raw && assembledHash === EXPECTED[variant].assembled, `${variant}: Narrative presentation authority drifted (raw ${rawHash}, assembled ${assembledHash})`)
}

assert(bodyAuthorityHash(narrativeRegexScripts('glass', 'glass')) === BODY_AUTHORITY['glass-color'] && presentationHash(originalAuthorityProjection(narrativeRegexScripts('glass', 'glass'))) === GLASS_BODY_ASSEMBLED, 'Glass Color Mode must retain its complete independent body authority')

console.log('Narrative presentation authority lock passed: 5 variants, 469 raw scripts and 285 assembled active scripts; intentional ten-Spark and identity-prefix extensions isolated, all card presentation drift 0.')
