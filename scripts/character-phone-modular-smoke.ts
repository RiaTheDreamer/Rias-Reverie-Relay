// @ts-nocheck -- Offline Bun smoke harness; no host or provider call is allowed.
import assert from 'node:assert/strict'
import { xmlSurfaceExamples } from '../src/xmlSurfaceFormat'
import { readFile } from 'node:fs/promises'
import {
  CHARACTER_PHONE_APPS,
  ORIGINAL_CHARACTER_PHONE_DEFAULT_APPS,
  auditCharacterPhoneApps,
  buildCharacterPhoneRuntimeDirective,
  characterPhoneAppLabel,
  normalizeCharacterPhoneDefaultApps,
} from '../src/characterPhoneConfig'
import { NARRATIVE_MEDIA_COMPATIBILITY_STYLE, narrativeRegexScripts, narrativeUtilityItems, renderNarrativeRegex } from '../src/narrativeRegexAssets'

// Import the real backend expansion path with an offline host shim.  This test
// must never contact Lumiverse, a Sidecar, or an image/provider endpoint.
;(globalThis as any).spindle = {
  on() {}, onFrontendMessage() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, sendToFrontend() {},
  permissions: { has: () => true }, log: { info() {}, warn() {}, error() {} },
  userStorage: { async getJson(_path: string, { fallback }: any) { return structuredClone(fallback) }, async setJson() {}, async mkdir() {} },
  chats: { async get() { return null } }, characters: { async get() { return null } }, personas: { async get() { return null }, async getActive() { return null } },
  chat: { async getMessages() { return [] } }, connections: { async get() { return null } },
  generate: { async raw() { throw new Error('Provider call forbidden in Character Phone smoke') } },
  imageGen: new Proxy({}, { get() { throw new Error('Live image call forbidden') } }),
}
const backend = await import('../src/backend')

assert.deepEqual(normalizeCharacterPhoneDefaultApps(undefined), ORIGINAL_CHARACTER_PHONE_DEFAULT_APPS, 'missing legacy configuration must migrate to the historical eight apps')
assert.deepEqual(normalizeCharacterPhoneDefaultApps([]), [], 'an explicit empty selection must stay empty')
assert.deepEqual(normalizeCharacterPhoneDefaultApps(['messages', 'messages', 'not-an-app', 'photos']), ['messages', 'photos'], 'app selections must be canonical, unique, and catalog-bound')
assert.equal(normalizeCharacterPhoneDefaultApps(CHARACTER_PHONE_APPS.map(([id]) => id)).length, 8, 'selection must never exceed eight defaults')

const partialDirective = buildCharacterPhoneRuntimeDirective(['messages', 'photos'])
assert(partialDirective.includes('defaults="2"') && partialDirective.includes('context_slots="6"'), 'partial defaults must expose exact context capacity')
assert(partialDirective.includes('1. Messages') && partialDirective.includes('2. Photos'), 'default app order must be authored explicitly')
assert(partialDirective.includes('Photos: use <cp_tone>photos') && partialDirective.includes('two-column camera-roll grid'), 'Photos must explicitly request a visible gallery grid')
assert(partialDirective.includes('Browser: use <cp_tone>browser') && partialDirective.includes('newest first'), 'Browser must explicitly request chronological browser history')
assert(partialDirective.includes('Health: use <cp_tone>health') && partialDirective.includes('measured <cp_stat> tiles'), 'Health must explicitly request a metrics dashboard')
assert(!partialDirective.includes('Messages ·') && !partialDirective.includes('Photos ·'), 'contextual pool must exclude default apps')

const emptyDirective = buildCharacterPhoneRuntimeDirective([])
assert(emptyDirective.includes('Choose exactly eight distinct apps'), 'empty defaults must delegate all slots contextually')
const fullDirective = buildCharacterPhoneRuntimeDirective(ORIGINAL_CHARACTER_PHONE_DEFAULT_APPS)
assert(fullDirective.includes('Do not replace any app contextually.'), 'full defaults must prevent contextual app substitution')
const resolvedUtility = backend.buildResolvedNarrativeUtilityPrompt({
  narrativeDlcEnabled: true,
  narrativeDlcUtilityNames: ['Character Phone'],
  characterPhoneDefaultApps: ['messages', 'photos'],
  characterPhonePresentation: 'surface',
})
assert.equal(resolvedUtility.content, '', 'a saved Surface setting cannot resurrect retired phone authoring')
assert.deepEqual(resolvedUtility.utilityNames, [])
assert.equal(resolvedUtility.characterPhoneDirective, '')
const legacyUtility = narrativeUtilityItems(true).find(item => item.loomName === 'Character Phone')!
// Read-only legacy fixture coverage remains; these instructions are never injected.
const legacyContent = legacyUtility.loomContent
assert(legacyContent.includes('Photos'), 'legacy archive fixture must remain available')
assert(NARRATIVE_MEDIA_COMPATIBILITY_STYLE.includes('.rrcp-tone-photos .rrcp-page-body{display:grid'), 'Photos page body must render as a two-column grid')
assert(NARRATIVE_MEDIA_COMPATIBILITY_STYLE.includes('.rrcp-photo:has(>.rrcp-photo-media>.rrcp-media:empty)'), 'text-only Photos must collapse empty media squares into caption cards')
assert(NARRATIVE_MEDIA_COMPATIBILITY_STYLE.includes('.rrcp-tone-browser .rrcp-row{'), 'Browser history rows must have dedicated styling')
assert(NARRATIVE_MEDIA_COMPATIBILITY_STYLE.includes('.rrcp-tone-health .rrcp-stat{'), 'Health dashboard metrics must have dedicated styling')
const browserApp = '[cp_app][cp_slot]3[/cp_slot][cp_name]Browser[/cp_name][cp_icon]⌕[/cp_icon][cp_tone]browser[/cp_tone][cp_badge]0[/cp_badge][cp_content][cp_row][cp_glyph]↗[/cp_glyph][cp_title]Example[/cp_title][cp_meta]09:10 · example.com[/cp_meta][cp_text]Visited page[/cp_text][/cp_row][/cp_content][/cp_app]'
const healthApp = browserApp.replace('[cp_name]Browser[/cp_name]', '[cp_name]Health[/cp_name]').replace('[cp_tone]browser[/cp_tone]', '[cp_tone]health[/cp_tone]')
for (const variant of ['inline', 'plain-button', 'sparkle-button', 'glass', 'plain-glass'] as const) {
  const appScript = narrativeRegexScripts(variant).find(script => script.script_id === 'rrpp_proto_app_v3')
  assert(appScript && new RegExp(appScript.find_regex, appScript.flags).test(xmlSurfaceExamples(browserApp)), `${variant}: XML Browser tone must match the Character Phone app renderer`)
  assert(appScript && new RegExp(appScript.find_regex, appScript.flags).test(xmlSurfaceExamples(healthApp)), `${variant}: XML Health tone must match the Character Phone app renderer`)
  const semanticToneApp = browserApp.replace('[cp_tone]browser[/cp_tone]', '[cp_tone]messages[/cp_tone]')
  assert(appScript && new RegExp(appScript.find_regex, appScript.flags).test(xmlSurfaceExamples(semanticToneApp)), `${variant}: a class-safe XML semantic tone must not strand raw app markup`)
  const unsafeToneApp = browserApp.replace('[cp_tone]browser[/cp_tone]', '[cp_tone]browser\" onclick=\"bad[/cp_tone]')
  assert(appScript && !new RegExp(appScript.find_regex, appScript.flags).test(xmlSurfaceExamples(unsafeToneApp)), `${variant}: unsafe tone text must never enter a CSS class`)
  const semanticTones = ['messages', 'photos', 'browser', 'notes', 'contacts', 'banking', 'vault', 'wardrobe']
  const semanticApps = semanticTones.map((tone, index) => `[cp_app][cp_slot]${index + 1}[/cp_slot][cp_name]App ${index + 1}[/cp_name][cp_icon]◇[/cp_icon][cp_tone]${tone}[/cp_tone][cp_badge]0[/cp_badge][cp_content][cp_row][cp_glyph]◇[/cp_glyph][cp_title]Item[/cp_title][cp_meta]Now[/cp_meta][cp_text]Detail[/cp_text][/cp_row][/cp_content][/cp_app]`).join('')
  const semanticPhone = `[character_phone][cp_presentation]plain[/cp_presentation][cp_owner]Maya[/cp_owner][cp_subtitle]Private device[/cp_subtitle][cp_time]20:15[/cp_time][cp_day]Rainy evening[/cp_day][cp_battery]62[/cp_battery][cp_wallpaper][/cp_wallpaper][cp_apps]${semanticApps}[/cp_apps][/character_phone]`
  const renderedPhone = renderNarrativeRegex(semanticPhone, variant)
  assert.equal((renderedPhone.match(/class="rrcp-entry /g) || []).length, 8, `${variant}: all eight semantic-tone apps must render`)
  assert(!renderedPhone.includes('[cp_app]'), `${variant}: raw Character Phone app tags must not leak`)
  for (const color of ['realistic', 'primary', 'glass'] as const) {
    const phone = renderNarrativeRegex(semanticPhone, variant, 'phone-no-widget', {}, color)
    assert(!phone.includes('<small>STORY SNAPSHOT</small>') && !phone.includes('<div class="rrcp-widget">'), `${variant}/${color}: removed Story Snapshot footer returned`)
    assert.equal((phone.match(/class="rrcp-entry /g) || []).length, 8, `${variant}/${color}: footer removal altered the eight apps`)
    assert(phone.includes('Maya') && phone.includes('Private device'), `${variant}/${color}: footer removal changed phone ownership`)
  }
}

function phoneMarkup(appNames: string[], slots = appNames.map((_, index) => index + 1)): string {
  return appNames.map((name, index) => `[cp_app]\n[cp_slot]${slots[index]}[/cp_slot]\n[cp_name]${name}[/cp_name]\n[/cp_app]`).join('\n')
}

const defaultNames = ORIGINAL_CHARACTER_PHONE_DEFAULT_APPS.map(characterPhoneAppLabel)
assert.equal(auditCharacterPhoneApps(phoneMarkup(defaultNames), ORIGINAL_CHARACTER_PHONE_DEFAULT_APPS).valid, true, 'a canonical eight-app phone must pass audit')
const duplicateAudit = auditCharacterPhoneApps(phoneMarkup([...defaultNames.slice(0, 7), defaultNames[0]]), ORIGINAL_CHARACTER_PHONE_DEFAULT_APPS)
assert(duplicateAudit.duplicateApps.length > 0 && !duplicateAudit.valid, 'duplicate app names must be reported')
const slotAudit = auditCharacterPhoneApps(phoneMarkup(defaultNames, [1, 2, 3, 4, 5, 6, 7, 7]), ORIGINAL_CHARACTER_PHONE_DEFAULT_APPS)
assert(slotAudit.duplicateSlots.includes(7) && slotAudit.missingSlots.includes(8) && !slotAudit.valid, 'duplicate/missing slots must be reported')

const [backendSource, frontendSource] = await Promise.all([
  readFile(new URL('../src/backend.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/frontend.ts', import.meta.url), 'utf8'),
])
assert(backendSource.includes('retirePhoneSurfaceDisplay(source)'), 'production chat display must retire the full phone Surface')
assert(!frontendSource.includes('renderCharacterPhoneAppSettings'), 'retired eight-app authoring controls must not remain in the UI')

console.log('Retired Phone compatibility smoke passed: archive layout/reader retained, retired prompt and UI controls absent, historical app normalization and audit diagnostics preserved.')
