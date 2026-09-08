// @ts-nocheck -- local/mocked Narrative DLC host-integration regression gate.
import fs from 'node:fs'
import path from 'node:path'
import {
  NARRATIVE_DLC_FOLDER,
  NARRATIVE_DLC_NAMESPACE,
  buildNarrativeUtilityPrompt,
  inspectNarrativeRegex,
  narrativeRegexCreateInput,
  reconcileNarrativeRegex,
  removeNarrativeRegex,
} from '../src/narrativeDlcRuntime'
import { applyNarrativeDisplayNames, containsNarrativeRegexMarkup, narrativeRegexPack, narrativeRegexScripts, narrativeUtilityItems, narrativeUtilityNames, renderNarrativeRegex } from '../src/narrativeRegexAssets'

function assert(value: unknown, reason: string): asserts value { if (!value) throw new Error(reason) }

class MockRegexApi {
  rows: any[] = []
  creates = 0
  updates = 0
  deletes = 0
  failAtMutation = 0
  mutations = 0

  async list(options: any = {}) {
    const offset = options.offset || 0
    const limit = options.limit || 50
    return { data: this.rows.slice(offset, offset + limit).map(row => structuredClone(row)), total: this.rows.length }
  }
  mutationCheck() {
    this.mutations += 1
    if (this.failAtMutation && this.mutations === this.failAtMutation) throw new Error('mock host mutation failure')
  }
  async create(input: any) {
    this.mutationCheck(); this.creates += 1
    const row = this.dto(input, `host-${this.rows.length + 1}`)
    this.rows.push(row)
    return structuredClone(row)
  }
  async update(id: string, input: any) {
    this.mutationCheck(); this.updates += 1
    const index = this.rows.findIndex(row => row.id === id)
    if (index < 0) throw new Error('missing mock script')
    this.rows[index] = this.dto({ ...this.rows[index], ...input }, id)
    return structuredClone(this.rows[index])
  }
  async delete(id: string) {
    this.mutationCheck(); this.deletes += 1
    const index = this.rows.findIndex(row => row.id === id)
    if (index < 0) return false
    this.rows.splice(index, 1)
    return true
  }
  dto(input: any, id: string) {
    const metadata = structuredClone(input.metadata || {})
    if (input.folder && input.folder_version) metadata._lumiverse_spindle_extension = { identifier: 'dreamglass_image_router', version: input.folder_version }
    return {
      id, can_mutate: input.can_mutate !== false, name: input.name, script_id: input.script_id || '',
      find_regex: input.find_regex, replace_string: input.replace_string || '', flags: input.flags || '',
      placement: input.placement || ['ai_output'], scope: input.scope || 'global', scope_id: input.scope_id ?? null,
      target: Array.isArray(input.target) ? input.target : [input.target || 'display'], min_depth: input.min_depth ?? null, max_depth: input.max_depth ?? null,
      trim_strings: input.trim_strings || [], run_on_edit: input.run_on_edit === true,
      substitute_macros: input.substitute_macros || 'none', disabled: input.disabled === true,
      sort_order: Number(input.sort_order) || 0, description: input.description || '', folder: input.folder || '',
      folder_version: input.folder_version || null, metadata, actions: structuredClone(input.actions || []), created_at: 1, updated_at: Date.now(),
    }
  }
}

const api = new MockRegexApi()
const activeScriptCount = narrativeRegexScripts('sparkle-button').length
assert(activeScriptCount === 54, `active Narrative install must contain 53 approved base scripts plus Dramatic Cutaway, saw ${activeScriptCount}`)
const first = await reconcileNarrativeRegex(api as any, 'sparkle-button')
assert(first.status === 'healthy' && first.healthy === activeScriptCount && api.creates === activeScriptCount, 'first install must create and validate only active owned scripts')
assert(api.rows.every(row => row.disabled !== true && !/DISABLED|tombstone/i.test(row.name)), 'disabled legacy duplicates and tombstones must not be installed')
assert(api.rows.every(row => row.can_mutate && row.folder === NARRATIVE_DLC_FOLDER && row.metadata.reverie_namespace === NARRATIVE_DLC_NAMESPACE), 'installed scripts must be Relay-owned and namespaced')
assert(api.rows.every(row => row.metadata.reverie_narrative_variant === 'sparkle-button'), 'installed scripts must record selected variant')
assert(api.rows.some(row => row.actions.length > 0), 'installer must preserve approved Narrative interaction actions')
assert(api.rows.some(row => row.script_id === 'ria_dramatic_cutaway_lumiverse_native_bulletproof_v8'), 'approved Dramatic Cutaway renderer must be installed')

const disabledSourceScript = narrativeRegexPack('sparkle-button').scripts.find(script => script.disabled === true)
assert(Boolean(disabledSourceScript), 'source compatibility pack must retain disabled history for provenance testing')
api.rows.push(api.dto({ ...narrativeRegexCreateInput(disabledSourceScript!, 'sparkle-button'), can_mutate: true }, 'stale-disabled-owned'))
const pruned = await reconcileNarrativeRegex(api as any, 'sparkle-button')
assert(pruned.status === 'healthy' && !api.rows.some(row => row.script_id === disabledSourceScript!.script_id), 'reconcile must remove previously installed disabled legacy scripts')

const mutationsAfterInstall = api.mutations
const second = await reconcileNarrativeRegex(api as any, 'sparkle-button')
assert(second.status === 'healthy' && api.mutations === mutationsAfterInstall, 'repeated install must be idempotent')

const switched = await reconcileNarrativeRegex(api as any, 'plain-button')
assert(switched.status === 'healthy' && switched.variant === 'plain-button', 'variant switch must reconcile to a healthy install')
assert(api.rows.every(row => row.metadata.reverie_narrative_variant === 'plain-button'), 'variant switch must update every owned script without parallel installs')
assert(api.rows.length === activeScriptCount, 'variant switch must remain mutually exclusive and active-only')

api.rows[0].replace_string = 'user drift'
const drift = await inspectNarrativeRegex(api as any, 'plain-button')
assert(drift.status === 'drifted' && drift.drifted === 1, 'health inspection must detect changed owned scripts')
const repaired = await reconcileNarrativeRegex(api as any, 'plain-button')
assert(repaired.status === 'healthy', 'repair must restore source-of-truth content')

const collisionApi = new MockRegexApi()
collisionApi.rows.push(collisionApi.dto({ ...narrativeRegexPack('inline').scripts[0], target: 'display', can_mutate: false, folder: 'Somebody Else' }, 'foreign-1'))
let collisionRefused = false
try { await reconcileNarrativeRegex(collisionApi as any, 'inline') } catch (error) { collisionRefused = /outside Relay ownership/i.test(String(error)) && /manually imported or foreign/i.test(String(error)) }
assert(collisionRefused && collisionApi.mutations === 0, 'installer must refuse foreign script-ID collisions without mutating them')

const rollbackApi = new MockRegexApi()
rollbackApi.failAtMutation = 8
let rollbackFailed = false
try { await reconcileNarrativeRegex(rollbackApi as any, 'inline') } catch { rollbackFailed = true }
assert(rollbackFailed && rollbackApi.rows.length === 0, 'partial first install must roll back every script it created')

const removed = await removeNarrativeRegex(api as any, 'plain-button')
assert(removed.status === 'removed' && api.rows.length === 0, 'remove must delete exactly the Relay-owned Narrative install')

const utility = buildNarrativeUtilityPrompt()
assert(utility.utilityNames.length === 13, 'all 13 Narrative Utilities must be selected by default')
assert(utility.utilityNames.join('|') === narrativeUtilityNames().join('|'), 'Utility injection order must match the source bundle')
for (const item of narrativeUtilityItems()) {
  assert(utility.content.includes(applyNarrativeDisplayNames(item.loomContent)), `${item.loomName}: final prompt injection must preserve the complete source Utility instructions under its public label`)
}
assert(utility.content.includes('<reverie_narrative_utility') && utility.content.includes('contract="narrative"'), 'Narrative Utility wrapper must use the Narrative contract name')
const subset = buildNarrativeUtilityPrompt(['Scene Compass', 'Character Phone'])
assert(subset.utilityNames.join('|') === 'Character Phone|Scene Compass', 'selected Utility prompt must preserve source order and contain only enabled contracts')
assert(subset.content.includes(applyNarrativeDisplayNames(narrativeUtilityItems()[0].loomContent)) && subset.content.includes(applyNarrativeDisplayNames(narrativeUtilityItems()[3].loomContent)), 'selected Utility prompt omitted enabled complete contracts')
assert(!subset.content.includes(narrativeUtilityItems()[1].loomContent), 'selected Utility prompt leaked a disabled contract')

const dramaticFixture = '<dramatic_parallel><div class="dp-head">LOCATION:Roof • TIME:Night • PRESSURE:Secret</div><div class="dp-media"><reverie-illustration request="generate" slot="dramatic-cutaway-test" aspect="16:9" cast="none"><visual_prompt>Rain crossing an empty rooftop.</visual_prompt></reverie-illustration></div><div class="dp-body"><p>A door opened.</p><p>The evidence changed hands.</p></div><div class="dp-foot">STATUS: OFFSCREEN • PRESSURE: LIVE • FIREWALL: ACTIVE</div></dramatic_parallel>'
assert(containsNarrativeRegexMarkup(dramaticFixture), 'Relay Narrative detection must include Dramatic Cutaway XML')
const dramaticRendered = renderNarrativeRegex(dramaticFixture, 'sparkle-button', 'dramatic-runtime')
assert(dramaticRendered.includes('dg-dramatic-cutaway') && !dramaticRendered.includes('<dramatic_parallel>'), 'approved Dramatic Cutaway renderer must execute in the shared Narrative adapter')

const lorebookFixtures = [
  { kind: 'cast-introduction', source: '[NPC:MAJOR|Lisa]\n<npc-media>portrait</npc-media>\nb: dancer\na: messy lavender hair, glasses\np: observant\n[/NPC]' },
  { kind: 'character-dossier', source: '[[npc Lisa|main]]<npc-media>portrait</npc-media>Identity and history.[[/npc]]' },
  { kind: 'location-file', source: '[[place Moon Pier]]<place-media>location</place-media>A quiet pier under moonlight.[[/place]]' },
]
for (const fixture of lorebookFixtures) {
  const rendered = renderNarrativeRegex(fixture.source, 'sparkle-button', 'lorebook-message', { chatId: 'chat-1', swipeId: 2 })
  assert(rendered.includes('Send to Lorebook'), `${fixture.kind}: eligible Narrative renderer must expose the Lorebook export action`)
  assert(rendered.includes(`data-rrn-lorebook-kind="${fixture.kind}"`) && rendered.includes('data-rrn-chat-id="chat-1"') && rendered.includes('data-rrn-swipe-id="2"'), `${fixture.kind}: Lorebook action must retain exact chat/message/swipe ownership`)
}
const duplicateDossiers = renderNarrativeRegex(`${lorebookFixtures[1].source}\n${lorebookFixtures[1].source.replace(/Lisa/g, 'Example B')}`, 'plain-button', 'two-dossiers', { chatId: 'chat-2', swipeId: 0 })
assert(duplicateDossiers.includes('data-rrn-lorebook-index="0"') && duplicateDossiers.includes('data-rrn-lorebook-index="1"'), 'multiple eligible Surfaces in one response must retain distinct export occurrences')

const root = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const backend = fs.readFileSync(path.join(root, 'src/backend.ts'), 'utf8')
const narrativeLorebook = fs.readFileSync(path.join(root, 'src/narrativeLorebook.ts'), 'utf8')
assert(backend.includes('const automaticNarrative = routerConfig.narrativeDlcEnabled') && backend.includes('buildResolvedNarrativeUtilityPrompt(routerConfig)'), 'Story Model interceptor must resolve Narrative Utilities through the runtime source path')
assert(backend.includes("name: 'reverie_narrative'") && backend.includes('NARRATIVE_MACRO_MARKER'), 'placed Narrative macro path must be registered and expanded')
assert(backend.includes('renderNarrativeRegex(renderedContent, snapshot.narrativeVariant') && backend.includes("renderContext.rendererMode !== 'legacy-regex'"), 'Relay/Hybrid must execute the isolated Narrative renderer while legacy Regex mode remains host-owned')
assert(backend.includes("type: 'export_narrative_lorebook'") && narrativeLorebook.includes('reverie_relay_lorebook_chat_id') && narrativeLorebook.includes('chat_world_book_ids'), 'Lorebook export must create a chat-owned archive and preserve existing chat bindings')
assert(narrativeLorebook.includes('reverie_relay_source_message_id') && narrativeLorebook.includes('reverie_relay_source_swipe_id'), 'Lorebook entries must retain source message/swipe provenance')
assert(!fs.readFileSync(path.join(root, 'src/nativeSurfaces.ts'), 'utf8').includes('renderNarrativeRegex'), 'Narrative rendering must remain isolated from the 46 built-in Surface registry')
const frontend = fs.readFileSync(path.join(root, 'src/frontend.ts'), 'utf8')
for (const name of narrativeUtilityNames()) assert(frontend.includes(`'${name}'`), `${name}: Surface Library must expose an individual Narrative Utility toggle`)
assert(frontend.includes('View Exact Injected Prompt') && frontend.includes("type: 'surface_prompt_preview'"), 'Surface Library must expose combined exact prompt visibility')
const surfaceLibraryStart = frontend.indexOf('function renderSurfaceLibrary()')
const settingsStart = frontend.indexOf('function renderSettings()')
assert(surfaceLibraryStart > -1 && settingsStart > surfaceLibraryStart, 'Surface Library and Settings render boundaries must remain discoverable')
const librarySource = frontend.slice(surfaceLibraryStart, settingsStart)
assert(librarySource.includes("panelSection('Narrative Utilities', renderNarrativeUtilityCategory(config))"), 'Narrative Utilities must render inside the Surface Library')
assert(librarySource.indexOf('for (const category of categoryOrder)') < librarySource.indexOf("panelSection('Narrative Utilities'"), 'Narrative Utilities must appear after all original Surface categories')
assert(librarySource.indexOf('View Exact Injected Prompt') < librarySource.indexOf('for (const category of categoryOrder)'), 'combined prompt preview must remain above every Surface category')
assert(!frontend.includes('Inject FINAL Narrative Utilities') && !frontend.includes('complete FINAL Utility contract'), 'user-facing Surface controls must call them Narrative Utilities')
assert(!frontend.slice(settingsStart).includes("panelSection('Narrative Utilities'"), 'Narrative Utility controls must not remain in Settings')

console.log(`R4.6 Narrative runtime smoke passed: ${activeScriptCount} active-only owned scripts including Dramatic Cutaway, no disabled legacy installs, Relay/Hybrid rendering, combined prompt preview wiring, and 13 complete Narrative Utility injections.`)
