// @ts-nocheck -- Context assembly is pure and never calls a model/provider.
import assert from 'node:assert/strict'
import { emptyStoryConstellationState, proposeStoryEvents, confirmStoryProposal, ensureStoryActor, applyStoryKnowledge, markStorySourceDeleted } from '../src/storyState'
import { buildOptionalStoryPromptContext } from '../src/eventConstellationContext'
import { ingestCharacterPhoneSnapshot } from '../src/livingCharacterPhone'
import { eventCandidate, storyLine, storySource, phoneFixture } from './event-constellation-fixtures'

const text = `${storyLine}\n${phoneFixture()}`
const source = storySource('context-turn', text)
const proposed = proposeStoryEvents(emptyStoryConstellationState(), [eventCandidate()], source, { sourceText: storyLine })
const event = confirmStoryProposal(proposed.state, proposed.proposalIds[0])!
const state = proposed.state
const minho = ensureStoryActor(state, 'Minho')!
applyStoryKnowledge(state, { eventId: event.eventId, actorId: minho.actorId, beliefState: 'knows', acquisitionMode: 'involved', sourceRef: source, origin: 'manual' })
const unknown = ensureStoryActor(state, 'Manager')!
applyStoryKnowledge(state, { eventId: event.eventId, actorId: unknown.actorId, beliefState: 'unknown', acquisitionMode: 'manual', sourceRef: source, origin: 'manual' })
ingestCharacterPhoneSnapshot(state, text, source)
const off = buildOptionalStoryPromptContext(state, { featureEnabled: false, injectEventKnowledge: true, characterPhoneRequested: true })
assert.deepEqual(off, { eventKnowledgeContext: '', phoneMemoryContext: '' }, 'feature off means zero story-context injection')
const noPhone = buildOptionalStoryPromptContext(state, { featureEnabled: true, injectEventKnowledge: true, characterPhoneRequested: false })
assert(noPhone.eventKnowledgeContext.includes('Minho knows') && !noPhone.eventKnowledgeContext.includes('Manager'), 'only explicit scoped knowledge is injected; unknown is not emitted as unaware or as fact')
assert(!noPhone.phoneMemoryContext, 'Character Phone memory is absent unless that Utility is requested')
const withPhone = buildOptionalStoryPromptContext(state, { featureEnabled: true, injectEventKnowledge: false, characterPhoneRequested: true })
assert(!withPhone.eventKnowledgeContext && withPhone.phoneMemoryContext.includes('CHARACTER PHONE MEMORY'))
assert(!withPhone.phoneMemoryContext.includes(event.eventId) && !withPhone.phoneMemoryContext.includes('Story Reel'), 'projection must not expose internal IDs or inject the Reel')
markStorySourceDeleted(state, source.chatId, source.messageId)
const staleSource = buildOptionalStoryPromptContext(state, { featureEnabled: true, injectEventKnowledge: true, characterPhoneRequested: true })
assert(!staleSource.eventKnowledgeContext && !staleSource.phoneMemoryContext, 'deleted-source canon remains reviewable but is excluded from live prompt context')
console.log('PASS event context firebreak: feature-off gate, actor boundaries, Character Phone-only projection, no Story Reel/IDs')
