// @ts-nocheck -- Offline Bun smoke harness; no host or provider call is allowed.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  CHARACTER_PHONE_APPS,
  ORIGINAL_CHARACTER_PHONE_DEFAULT_APPS,
  auditCharacterPhoneApps,
  buildCharacterPhoneRuntimeDirective,
  characterPhoneAppLabel,
  normalizeCharacterPhoneDefaultApps,
} from '../src/characterPhoneConfig'

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
assert(!partialDirective.includes('Messages ·') && !partialDirective.includes('Photos ·'), 'contextual pool must exclude default apps')

const emptyDirective = buildCharacterPhoneRuntimeDirective([])
assert(emptyDirective.includes('Choose exactly eight distinct apps'), 'empty defaults must delegate all slots contextually')
const fullDirective = buildCharacterPhoneRuntimeDirective(ORIGINAL_CHARACTER_PHONE_DEFAULT_APPS)
assert(fullDirective.includes('Do not replace any app contextually.'), 'full defaults must prevent contextual app substitution')
const resolvedUtility = backend.buildResolvedNarrativeUtilityPrompt({
  narrativeDlcEnabled: true,
  narrativeDlcUtilityNames: ['Character Phone'],
  characterPhoneDefaultApps: ['messages', 'photos'],
})
assert.equal((resolvedUtility.content.match(/CHARACTER PHONE — ACTIVE APP LAYOUT/g) || []).length, 1, 'the dynamic Character Phone layout must join the real Narrative expansion exactly once')
assert(resolvedUtility.content.includes('Fill slots 3–8 with exactly 6 distinct context-relevant apps'), 'real Narrative expansion must carry the saved default selection')

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
assert(backendSource.includes('buildResolvedNarrativeUtilityPrompt') && backendSource.includes("narrative.utilityNames.includes('Character Phone')"), 'Character Phone runtime directive must share the real narrative prompt-injection path')
assert(frontendSource.includes('Character Phone Apps') && frontendSource.includes('Story Model fills'), 'Character Phone defaults need their Narrative Utilities control')

console.log('Character Phone modular smoke passed: migration, explicit empty choice, bounded ordered defaults, contextual pool, audit diagnostics, prompt injection, and UI controls.')
