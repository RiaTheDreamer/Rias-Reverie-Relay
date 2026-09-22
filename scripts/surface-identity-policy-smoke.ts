// Product-wide identity policy for Core Surfaces, default examples, and Narrative Utilities.
import bracketInline from '../regex-packs/r45/Reverie-Surfaces-R4.5-BRACKET-INLINE-REALISTIC.json'
import bracketPlain from '../regex-packs/r45/Reverie-Surfaces-R4.5-BRACKET-PLAIN-BUTTON-REALISTIC.json'
import bracketSparkling from '../regex-packs/r45/Reverie-Surfaces-R4.5-BRACKET-SPARKLE-BUTTON-REALISTIC.json'
import inlinePrimary from '../regex-packs/r45/Reverie-Surfaces-R4.5-INLINE-PRIMARY.json'
import inlineRealistic from '../regex-packs/r45/Reverie-Surfaces-R4.5-INLINE-REALISTIC.json'
import plainPrimary from '../regex-packs/r45/Reverie-Surfaces-R4.5-COLLAPSIBLE-PLAIN-PRIMARY.json'
import plainRealistic from '../regex-packs/r45/Reverie-Surfaces-R4.5-COLLAPSIBLE-PLAIN-REALISTIC.json'
import sparklingPrimary from '../regex-packs/r45/Reverie-Surfaces-R4.5-COLLAPSIBLE-SPARKLING-PRIMARY.json'
import sparklingRealistic from '../regex-packs/r45/Reverie-Surfaces-R4.5-COLLAPSIBLE-SPARKLING-REALISTIC.json'
import { narrativeRegexScripts, NARRATIVE_REGEX_VARIANTS } from '../src/narrativeRegexAssets'
import { PLOT_SPARKS_V2_UTILITY } from '../src/plotSparksV2'
import { r45SupplementalSurfaceDefinitions } from '../src/r45SurfaceCatalog'
import { shippedSurfaceDefinitions } from '../src/shippedSurfaceDefinitions'

function assert(value: unknown, reason: string): asserts value { if (!value) throw new Error(reason) }

type Pack = { name?: string; scripts: Array<{ script_id: string; find_regex: string; replace_string: string }> }
const packs = [bracketInline, bracketPlain, bracketSparkling, inlinePrimary, inlineRealistic, plainPrimary, plainRealistic, sparklingPrimary, sparklingRealistic] as Pack[]
const definitions = [...shippedSurfaceDefinitions(1), ...r45SupplementalSurfaceDefinitions(1)]
// Assemble previously observed private/demo names without reintroducing those
// literal strings into the public source that this gate is responsible for.
const observedPrivateNames = ['Mi' + 'na', 'Mi' + 'ra', 'K' + 'ai', 'A' + 'ri', 'Elena' + ' Ward']
const forbiddenIdentity = new RegExp(`\\b(?:${observedPrivateNames.join('|')}|Character [A-Z]|Contact [A-Z]|Archive [A-Z]|Reader [A-Z]|Seller [A-Z]|Patient [A-Z]|Clinician [A-Z]|Judge [A-Z])\\b|@handle\\b|@reader\\b|>EW<`)

assert(definitions.length === 46, `identity policy expected 46 built-in Surfaces, received ${definitions.length}`)
for (const pack of packs) {
  assert(pack.scripts.length === 138, `${pack.name || 'R4.5 pack'}: identity policy expected 138 scripts`)
  for (const script of pack.scripts) {
    assert(!forbiddenIdentity.test(script.replace_string), `${pack.name}/${script.script_id}: renderer contains a hard-coded person identity`)
  }
  const discord = pack.scripts.find(script => /discord_server/.test(script.find_regex))?.replace_string || ''
  assert(discord.includes('<aside class="rrdc-members"><b>ONLINE — $4</b><div class="rrdc-member"><i class="rrdc-dot"></i>Active participants</div><b>MEMBERS — $3</b></aside>'), `${pack.name}: Discord must render aggregate counts without invented members`)
  const property = pack.scripts.find(script => /property_listing/.test(script.find_regex))?.replace_string || ''
  assert(property.includes('<span class="rr23-agent-avatar" aria-hidden="true">⌂</span><b>Listing contact</b><span>Property inquiries</span>'), `${pack.name}: Property Listing must use a neutral contact role`)
}

for (const definition of definitions) {
  assert(!forbiddenIdentity.test(definition.sampleXml), `${definition.baseSurfaceId}: default example contains a hard-coded person identity`)
  assert(!forbiddenIdentity.test(definition.promptModule), `${definition.baseSurfaceId}: model-facing module contains a hard-coded person identity`)
}

assert(PLOT_SPARKS_V2_UTILITY.includes('Never invent, rename, or substitute a person, username, or handle.'), 'Plot Sparks identity boundary is missing')
assert(!forbiddenIdentity.test(PLOT_SPARKS_V2_UTILITY), 'Plot Sparks prompt contains a hard-coded person identity')
for (const variant of NARRATIVE_REGEX_VARIANTS) {
  for (const script of narrativeRegexScripts(variant)) {
    assert(!forbiddenIdentity.test(script.replace_string), `${variant}/${script.script_id}: Narrative renderer contains a hard-coded person identity`)
  }
}

console.log('Surface identity policy smoke passed: 46 built-ins, nine R4.5 packs, and Plot Sparks contain no Relay-invented person identities')
