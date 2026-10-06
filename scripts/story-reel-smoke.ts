// @ts-nocheck -- Pure offline Reel projection tests.
import assert from 'node:assert/strict'
import { emptyStoryConstellationState, proposeStoryEvents, confirmStoryProposal, updateStoryReelOverride, markStorySwipe } from '../src/storyState'
import { projectStoryReel } from '../src/storyReel'
import { eventCandidate, storyLine, storySource } from './event-constellation-fixtures'

let state = emptyStoryConstellationState()
const confirmedProposal = proposeStoryEvents(state, [eventCandidate()], storySource(), { sourceText: storyLine })
state = confirmedProposal.state
const confirmed = confirmStoryProposal(confirmedProposal.state, confirmedProposal.proposalIds[0])!
const otherText = 'Minho announced a public apology at the press conference.'
const secondProposal = proposeStoryEvents(state, [eventCandidate({ title: 'A public apology is announced', summary: otherText, anchor: otherText, eventType: 'public', participants: [{ name: 'Minho' }] })], storySource('message-2', otherText), { sourceText: otherText })
state = secondProposal.state
const second = confirmStoryProposal(secondProposal.state, secondProposal.proposalIds[0])!
const unrelated = { ...confirmed, eventId: 'event-proposed', canonState: 'proposed' }
state.events[unrelated.eventId] = unrelated
const nonCanon = { ...confirmed, eventId: 'event-noncanon', canonState: 'non-canon' }
state.events[nonCanon.eventId] = nonCanon

let reel = projectStoryReel(state, { [confirmed.eventId]: 10, [second.eventId]: 20 })
assert.equal(reel.length, 2, 'only confirmed events appear; proposals and non-canon history stay out')
assert.equal(reel[0].sourceOrder, 10, 'ambiguous time falls back to source ordering without fabricated dates')
assert(!('sourceRefs' in reel[0]) && !('knowledgeEdges' in reel[0]), 'Reel cards are a projection, not duplicate event storage')

updateStoryReelOverride(state, confirmed.eventId, { pinned: true, captionOverride: 'Pinned caption' }, 40)
updateStoryReelOverride(state, confirmed.eventId, { chapterLabelOverride: 'Chapter One' }, 41)
reel = projectStoryReel(state)
assert.equal(reel[0].eventId, confirmed.eventId, 'pinned event sorts to the top')
assert.equal(reel[0].caption, 'Pinned caption')
assert.equal(reel[0].chapterLabel, 'Chapter One', 'partial updates preserve earlier overrides')
updateStoryReelOverride(state, confirmed.eventId, { hidden: true })
assert(!projectStoryReel(state).some(card => card.eventId === confirmed.eventId))
updateStoryReelOverride(state, confirmed.eventId, { hidden: false })
assert(projectStoryReel(state).some(card => card.eventId === confirmed.eventId), 'hidden card can be restored')
markStorySwipe(state, confirmed.chatId, confirmed.sourceRefs[0].messageId, 1)
assert(!projectStoryReel(state).some(card => card.eventId === confirmed.eventId), 'inactive swipe is excluded')
markStorySwipe(state, confirmed.chatId, confirmed.sourceRefs[0].messageId, 0)
assert(projectStoryReel(state).some(card => card.eventId === confirmed.eventId), 'reactivated swipe returns')
console.log('PASS Story Reel: confirmed-only derived cards, source order, pin/hide/caption persistence, swipe reactivation')
