// @ts-nocheck -- Pure offline lifecycle acceptance tests.
import assert from 'node:assert/strict'
import { emptyStoryConstellationState, proposeStoryEvents, confirmStoryProposal, markStorySwipe, markStorySwipeDeleted, markStorySourceDeleted, createStorySourceRef, activeStoryEvents, visibleStoryPhoneEntries } from '../src/storyState'
import { ingestCharacterPhoneSnapshot } from '../src/livingCharacterPhone'
import { eventCandidate, phoneFixture, storyLine, storySource } from './event-constellation-fixtures'

const content = `${storyLine}\n${phoneFixture()}`
const source = storySource('message-1', content, 0)
const initial = proposeStoryEvents(emptyStoryConstellationState(), [eventCandidate()], source, { sourceText: storyLine })
const event = confirmStoryProposal(initial.state, initial.proposalIds[0])!
ingestCharacterPhoneSnapshot(initial.state, content, source)
for (const entry of Object.values(initial.state.phoneEntries)) entry.eventId = event.eventId
assert(visibleStoryPhoneEntries(initial.state).length > 0)

markStorySwipe(initial.state, source.chatId, source.messageId, 1)
assert.equal(event.sourceState, 'inactive-swipe', 'old confirmed swipe stays stored but becomes inactive')
assert.equal(activeStoryEvents(initial.state).length, 0, 'inactive swipe must leave active event projections')
assert.equal(visibleStoryPhoneEntries(initial.state).length, 0, 'phone data from inactive swipe must be excluded')
markStorySwipe(initial.state, source.chatId, source.messageId, 0)
assert.equal(activeStoryEvents(initial.state).length, 1, 'switching back restores the event')
assert(visibleStoryPhoneEntries(initial.state).length > 0, 'switching back restores phone projection')

const additionalSwipe = createStorySourceRef({ chatId: source.chatId, messageId: source.messageId, swipeId: 1, content: 'An alternate swipe contains a supporting line.', excerpt: 'supporting line', role: 'assistant' })
event.sourceRefs.push(additionalSwipe)
markStorySwipeDeleted(initial.state, source.chatId, source.messageId, 1)
assert.equal(event.sourceRefs.find(ref => ref.swipeId === 0)?.sourceState, 'active', 'deleting one swipe preserves the active canonical source')
assert.equal(event.sourceRefs.find(ref => ref.swipeId === 1)?.sourceState, 'deleted', 'only the targeted swipe source is deleted')
assert.equal(event.sourceState, 'active', 'shared canon remains current while another active source exists')

markStorySourceDeleted(initial.state, source.chatId, source.messageId)
assert.equal(event.canonState, 'confirmed', 'deleting message must not erase canon')
assert.equal(event.sourceState, 'deleted')
assert.match(event.sourceWarning || '', /deleted/i)
assert.equal(activeStoryEvents(initial.state).length, 1, 'confirmed deleted-source event remains visible for review')
assert.equal(visibleStoryPhoneEntries(initial.state).length, 0, 'deleted phone source no longer projects as active')
console.log('PASS event lifecycle: swipe isolation/reactivation/deletion, phone projection, deleted-source canon preservation')
