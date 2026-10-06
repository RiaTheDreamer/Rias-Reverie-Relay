// @ts-nocheck -- Pure offline knowledge-boundary acceptance tests.
import assert from 'node:assert/strict'
import { emptyStoryConstellationState, proposeStoryEvents, confirmStoryProposal, applyStoryKnowledge, ensureStoryActor, mergeStoryActors, resolveStoryKnowledgeConflict } from '../src/storyState'
import { eventCandidate, storyLine, storySource } from './event-constellation-fixtures'

const proposed = proposeStoryEvents(emptyStoryConstellationState(), [eventCandidate()], storySource(), { sourceText: storyLine })
const event = confirmStoryProposal(proposed.state, proposed.proposalIds[0])!
const state = proposed.state
const actor = (name: string) => ensureStoryActor(state, name)!
const minho = actor('Minho')
const jaehyun = actor('Jaehyun')
const manager = actor('Manager')

const manualRef = storySource('manual-knowledge', 'Explicit user knowledge correction.')
applyStoryKnowledge(state, { eventId: event.eventId, actorId: minho.actorId, beliefState: 'unaware', acquisitionMode: 'manual', sourceRef: manualRef, origin: 'manual' })
const hard = applyStoryKnowledge(state, { eventId: event.eventId, actorId: minho.actorId, beliefState: 'knows', acquisitionMode: 'witnessed', sourceRef: storySource('hard-conflict', 'Minho says he saw the photograph.'), origin: 'sidecar' })
assert.equal(hard.conflict?.severity, 'hard', 'explicit unaware contradiction must become a hard conflict')
assert.equal(state.knowledgeEdges[`${event.eventId}:${minho.actorId}`].beliefState, 'unaware', 'hard conflict must not silently overwrite recorded belief')

applyStoryKnowledge(state, { eventId: event.eventId, actorId: manager.actorId, beliefState: 'unknown', acquisitionMode: 'manual', sourceRef: manualRef, origin: 'manual' })
const soft = applyStoryKnowledge(state, { eventId: event.eventId, actorId: manager.actorId, beliefState: 'knows', acquisitionMode: 'told', sourceActorId: jaehyun.actorId, sourceRef: storySource('soft-conflict', 'Jaehyun tells Manager about the photograph.'), origin: 'sidecar' })
assert.equal(soft.conflict?.severity, 'soft', 'unknown plus new knowledge creates an unexplained-path warning, not an unaware contradiction')
assert.equal(state.knowledgeEdges[`${event.eventId}:${manager.actorId}`].beliefState, 'unknown')
const invalidEchoResolution = resolveStoryKnowledgeConflict(state, soft.conflict.conflictId, 'linked-existing-echo', 'missing-echo', 20)
assert.equal(invalidEchoResolution, false, 'a missing Echo cannot resolve a knowledge conflict')
assert.equal(state.conflicts[soft.conflict.conflictId].status, 'open', 'invalid provenance leaves the conflict open')
const existingEcho = {
  echoId: 'echo-manager-message', eventId: event.eventId, chatId: 'story-smoke-chat', kind: 'phone-message',
  summary: 'Jaehyun forwarded the photograph to Manager.', sourceRef: storySource('manager-phone', 'Jaehyun forwarded the photograph to Manager.'),
  linkState: 'confirmed', confidence: 1, createdAt: 10, updatedAt: 10,
}
state.echoes[existingEcho.echoId] = existingEcho
state.events[event.eventId].echoIds.push(existingEcho.echoId)
assert(resolveStoryKnowledgeConflict(state, soft.conflict.conflictId, 'linked-existing-echo', existingEcho.echoId, 21))
assert.equal(state.knowledgeEdges[`${event.eventId}:${manager.actorId}`].beliefState, 'knows')
assert.equal(state.knowledgeEdges[`${event.eventId}:${manager.actorId}`].sourceEchoId, existingEcho.echoId, 'the Echo is durable acquisition provenance')
assert.equal(state.knowledgeEdges[`${event.eventId}:${manager.actorId}`].acquisitionMode, 'told')

const offscreenActor = actor('Offscreen Learner')
applyStoryKnowledge(state, { eventId: event.eventId, actorId: offscreenActor.actorId, beliefState: 'unknown', acquisitionMode: 'manual', sourceRef: manualRef, origin: 'manual' })
const offscreenConflict = applyStoryKnowledge(state, { eventId: event.eventId, actorId: offscreenActor.actorId, beliefState: 'knows', acquisitionMode: 'inferred', sourceRef: storySource('offscreen-conflict', 'Offscreen Learner references the photograph.'), origin: 'sidecar' }).conflict!
assert(resolveStoryKnowledgeConflict(state, offscreenConflict.conflictId, 'learned-offscreen', undefined, 22))
const offscreenEdge = state.knowledgeEdges[`${event.eventId}:${offscreenActor.actorId}`]
assert.equal(state.echoes[offscreenEdge.sourceEchoId]?.channel, 'Off-screen learning', 'off-screen resolution creates a source-linked Echo')
assert.equal(offscreenEdge.history[0].from, 'unknown')

const rumorActor = actor('Ria')
const transitionRef = storySource('transition', 'Evidence changes the belief state.')
applyStoryKnowledge(state, { eventId: event.eventId, actorId: rumorActor.actorId, beliefState: 'rumor', acquisitionMode: 'told', sourceRef: transitionRef, origin: 'sidecar' })
applyStoryKnowledge(state, { eventId: event.eventId, actorId: rumorActor.actorId, beliefState: 'suspects', acquisitionMode: 'evidence', sourceRef: storySource('transition-2', 'Ria examines the photograph.'), origin: 'sidecar' })
applyStoryKnowledge(state, { eventId: event.eventId, actorId: rumorActor.actorId, beliefState: 'knows', acquisitionMode: 'witnessed', sourceRef: storySource('transition-3', 'Ria witnesses the publication.'), origin: 'sidecar' })
const transitioned = state.knowledgeEdges[`${event.eventId}:${rumorActor.actorId}`]
assert.deepEqual(transitioned.history.map(row => [row.from, row.to]), [['rumor', 'suspects'], ['suspects', 'knows']])

const mistaken = actor('Witness C')
applyStoryKnowledge(state, { eventId: event.eventId, actorId: mistaken.actorId, beliefState: 'misinformed', acquisitionMode: 'told', sourceRef: transitionRef, origin: 'sidecar' })
applyStoryKnowledge(state, { eventId: event.eventId, actorId: mistaken.actorId, beliefState: 'knows', acquisitionMode: 'evidence', sourceRef: storySource('correction', 'Witness C reads the original report.'), origin: 'sidecar' })
assert.equal(state.knowledgeEdges[`${event.eventId}:${mistaken.actorId}`].history[0].from, 'misinformed', 'correction must preserve prior misinformation')

const resolution = applyStoryKnowledge(state, { eventId: event.eventId, actorId: minho.actorId, beliefState: 'knows', acquisitionMode: 'manual', sourceRef: storySource('resolution', 'User resolves the conflict.'), origin: 'manual' })
assert.equal(resolution.edge?.beliefState, 'knows', 'explicit manual resolution can override an earlier boundary')
assert.equal(state.knowledgeEdges[`${event.eventId}:${minho.actorId}`].explicit, true)
assert.equal(state.knowledgeEdges[`${event.eventId}:${jaehyun.actorId}`], undefined, 'unmentioned actors are not silently marked unaware or knowledgeable')

const aliasActor = actor('Min-ho')
assert(mergeStoryActors(state, aliasActor.actorId, minho.actorId), 'actor merge should succeed')
assert.equal(state.actors[aliasActor.actorId].mergedIntoActorId, minho.actorId)
assert(state.actors[minho.actorId].aliases.includes('Min-ho'))
assert(state.events[event.eventId].participants.some(person => person.actorId === minho.actorId), 'event participant refs reconcile to canonical actor')
console.log('PASS event knowledge: unknown/unaware distinction, acquisition history, conflicts, explicit resolution, one-hop actor links, actor merge')
