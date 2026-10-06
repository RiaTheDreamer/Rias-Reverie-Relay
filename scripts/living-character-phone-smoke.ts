// @ts-nocheck -- Pure offline phone-state tests; no Lumiverse/Sidecar/provider calls.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { emptyStoryConstellationState, createStorySourceRef, ensureStoryActor } from '../src/storyState'
import { extractCharacterPhoneEntries, ingestCharacterPhoneSnapshot } from '../src/livingCharacterPhone'
import { phoneFixture } from './event-constellation-fixtures'
import { bracketImageControlInstructions } from '../src/imageControlMarkup'

const canonical = phoneFixture()
const alternate = '[WHATIF|dream][character_phone][cp_owner]Wrong Owner[/cp_owner][cp_app][cp_name]Messages[/cp_name][cp_content][cp_msg][cp_text]A hypothetical text.[/cp_text][/cp_msg][/cp_content][/cp_app][/character_phone][/WHATIF]'
const spark = '[Plot_Sparks][character_phone][cp_owner]Spark Owner[/cp_owner][cp_app][cp_name]Messages[/cp_name][cp_content][cp_msg][cp_text]Unused spark text.[/cp_text][/cp_msg][/cp_content][/cp_app][/character_phone][/Plot_Sparks]'
const content = `${alternate}\n${spark}\n${canonical}`
const sourceRef = createStorySourceRef({ chatId: 'phone-chat', messageId: 'phone-1', swipeId: 0, role: 'assistant', content, excerpt: 'A phone snapshot appeared.' })
const assets = [{ assetId: 'asset-photo-1', imageId: 'image-photo-1', requestId: 'phone-photo-1', chatId: sourceRef.chatId, messageId: sourceRef.messageId, swipeId: sourceRef.swipeId, status: 'available' }]
const state = emptyStoryConstellationState()
const extracted = extractCharacterPhoneEntries(content, sourceRef)
assert.equal(extracted.length, 2, 'only the canonical message and photo are ingested')
assert.equal(extracted[1].requestId, 'phone-photo-1', 'phone photo request is linked by stable request id')
const added = ingestCharacterPhoneSnapshot(state, content, sourceRef, 100, assets)
assert.equal(added, 2)
assert.equal(Object.keys(state.phoneEntries).length, 2)
const entries = Object.values(state.phoneEntries)
assert(entries.some(entry => entry.kind === 'message' && entry.body === 'The local paper published the photograph.'))
assert.equal(entries.find(entry => entry.kind === 'photo')?.assetId, 'asset-photo-1', 'matching existing Asset Library asset is referenced')
assert.equal(entries.find(entry => entry.kind === 'photo')?.imageId, 'image-photo-1')

const bracketPhone = bracketImageControlInstructions(canonical)
const bracketState = emptyStoryConstellationState()
assert.equal(extractCharacterPhoneEntries(bracketPhone, sourceRef)[1].requestId, 'phone-photo-1', 'bracket-native photo controls retain their request id')
ingestCharacterPhoneSnapshot(bracketState, bracketPhone, sourceRef, 100, assets)
assert.equal(Object.values(bracketState.phoneEntries).find(entry => entry.kind === 'photo')?.assetId, 'asset-photo-1', 'bracket photo links the exact existing asset')
const unrelatedAsset = { ...assets[0], messageId: 'another-message', assetId: 'unrelated-photo' }
const wrongOwnerState = emptyStoryConstellationState()
ingestCharacterPhoneSnapshot(wrongOwnerState, bracketPhone, sourceRef, 100, [unrelatedAsset])
assert.equal(Object.values(wrongOwnerState.phoneEntries).find(entry => entry.kind === 'photo')?.assetId, undefined, 'same request id in another source cannot supply a phone photo')
for (const broken of [bracketPhone.replace('[/image_request]', ''), bracketPhone.replace('[id]phone-photo-1[/id]', '[id]phone-photo-1[/id][id]wrong[/id]')]) {
  assert.equal(extractCharacterPhoneEntries(broken, sourceRef).find(entry => entry.kind === 'photo')?.requestId, undefined, 'incomplete or ambiguous bracket controls cannot supply an asset reference')
}
ingestCharacterPhoneSnapshot(state, content, sourceRef, 200, assets)
assert.equal(Object.keys(state.phoneEntries).length, 2, 'rendering/replaying the same source is idempotent')
assert(!JSON.stringify(state.phoneEntries).includes('data:image'), 'phone state never copies image blobs')

const editedPhone = canonical.replace('The local paper published the photograph.', 'The local paper published the corrected photograph.')
const editedSourceRef = createStorySourceRef({ chatId: sourceRef.chatId, messageId: sourceRef.messageId, swipeId: sourceRef.swipeId, role: 'assistant', content: editedPhone, excerpt: 'The source message was edited.' })
ingestCharacterPhoneSnapshot(state, editedPhone, editedSourceRef, 250, assets)
assert.equal(Object.keys(state.phoneEntries).length, 2, 'editing a phone message updates its stable row rather than creating a duplicate')
assert.equal(Object.values(state.phoneEntries).find(entry => entry.kind === 'message')?.body, 'The local paper published the corrected photograph.')
assert.equal(Object.values(state.phoneEntries).find(entry => entry.kind === 'message')?.sourceRef.contentFingerprint, editedSourceRef.contentFingerprint)

const nextContent = '[character_phone][cp_owner]Jaehyun[/cp_owner][cp_app][cp_name]Messages[/cp_name][cp_content][cp_msg][cp_side]self[/cp_side][cp_name]Jaehyun[/cp_name][cp_text]I will call you.[/cp_text][/cp_msg][/cp_content][/cp_app][/character_phone]'
const nextSource = createStorySourceRef({ chatId: sourceRef.chatId, messageId: 'phone-2', swipeId: 0, role: 'assistant', content: nextContent, excerpt: 'A later phone view.' })
ingestCharacterPhoneSnapshot(state, nextContent, nextSource, 300)
assert.equal(Object.keys(state.phoneEntries).length, 3, 'a later message appends without deleting omitted older phone entries')
const alias = ensureStoryActor(state, 'Jaehyun')!
assert.equal(entries[0].ownerActorId, alias.actorId, 'owner uses a stable story actor id')

const frontend = await readFile(new URL('../src/frontend.ts', import.meta.url), 'utf8')
assert(!frontend.includes('renderCharacterPhoneAppSettings') && frontend.includes('No legacy phone records to display.'), 'legacy records remain readable without restoring Surface authoring')
console.log('PASS Living Character Phone: text-only snapshots, idempotent append, owner identity, Asset IDs, WHATIF/Plot Spark exclusion')
