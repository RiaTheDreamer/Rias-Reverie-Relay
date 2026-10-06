// @ts-nocheck -- Pure offline Story State acceptance tests.
import assert from 'node:assert/strict'
import { emptyStoryConstellationState, proposeStoryEvents, confirmStoryProposal, confirmStoryEchoProposal, markStorySourceEdited, activeStoryEvents } from '../src/storyState'
import { completeEventSidecarCandidates, inferGroundedEventEchoCandidates, normalizeEventSidecarOutput, prepareStoryAnalysisText, shouldAnalyzeStoryText } from '../src/eventConstellationSidecar'
import { DEFAULT_PROMPT_REGISTRY, PROMPT_REGISTRY_DEFINITIONS } from '../src/protocols'
import { eventCandidate, storyLine, storySource } from './event-constellation-fixtures'

assert.equal(PROMPT_REGISTRY_DEFINITIONS.find(row => row.id === 'sidecar.events.request')?.version, 3, 'Event Sidecar decision/schema corrections must advance the prompt contract')
const schema = DEFAULT_PROMPT_REGISTRY['sidecar.events.request'].match(/(\{"events":\[\{[\s\S]*?\}\]\})\. Do not add fields/)
assert(schema, 'the candidate schema must be a complete JSON object, not an unclosed outer object')
assert.equal(JSON.parse(schema[1]).events.length, 1)
assert(DEFAULT_PROMPT_REGISTRY['sidecar.events.system'].includes('The same actors or setting do not make two changes duplicates'), 'new consequences must not be suppressed by a known event with the same cast')
assert(DEFAULT_PROMPT_REGISTRY['sidecar.events.request'].includes('set likelyDuplicateEventId to the exact matching knownConfirmedEvents id'), 'Event Sidecar must explicitly link a grounded repeated source to a known event')
assert(DEFAULT_PROMPT_REGISTRY['sidecar.events.request'].includes('Do not create a second Event Node'), 'Event Sidecar must keep Echoes from duplicating canon events')
for (const prefix of ['OOC local test:', 'OOC:', '(OOC)', 'Out of character:']) {
  const instruction = `${prefix} Restate the completed public disclosure. The photo has been published publicly and identifies both of them.`
  assert.equal(prepareStoryAnalysisText(instruction), '', 'plain OOC instructions cannot supply Event or Echo evidence')
  assert.equal(shouldAnalyzeStoryText(instruction), false, 'plain OOC setup should not spend a Sidecar call')
  assert.equal(prepareStoryAnalysisText(`${instruction}\n\nA signed notice permanently revoked the named tenants\' access.`), 'A signed notice permanently revoked the named tenants\' access.', 'separate actual prose must survive OOC removal')
}
assert.equal(prepareStoryAnalysisText('"OOC," the technician read from a label. The sealed document was handed over.'), '"OOC," the technician read from a label. The sealed document was handed over.', 'quoted story content is not an OOC control paragraph')

const realStory = 'The signed notice permanently revoked the tenants\' access.'
for (const root of ['reverie_illustration', 'reverie-illustration', 'image_request']) {
  const control = `[${root}][alt]An invented public wedding.[/alt][visual_prompt]Both characters announce their engagement.[/visual_prompt][/${root}]`
  assert.equal(prepareStoryAnalysisText(control), '', `${root} image descriptions are not Event evidence`)
  assert.equal(shouldAnalyzeStoryText(control), false, `${root} alone must not spend an Event Sidecar call`)
  assert.equal(prepareStoryAnalysisText(`${realStory}\n\n${control}\n\nThe door locked.`), `${realStory}\n\n \n\nThe door locked.`, 'actual sibling prose survives removal of complete image controls')
  const partial = `[${root}][visual_prompt]Both characters announce their engagement.`
  assert.equal(shouldAnalyzeStoryText(partial), false, 'an unfinished image control must not leak speculative facts')
  assert.equal(prepareStoryAnalysisText(`${realStory}\n\n${partial}`), realStory, 'real prose before an unfinished image control remains eligible')
}
assert.equal(prepareStoryAnalysisText('[phone_owner]Mira[/phone_owner]\nA signed notice revoked access.'), '[phone_owner]Mira[/phone_owner]\nA signed notice revoked access.', 'unrelated Surface fields are not blanket-stripped')

const ordinary = 'Jaehyun asked whether Minho wanted another cup of tea. They talked about the rain.'
const ordinaryResult = proposeStoryEvents(emptyStoryConstellationState(), [eventCandidate({ anchor: 'Jaehyun asked whether Minho wanted another cup of tea', summary: 'They have tea together.' })], storySource('ordinary', ordinary), { sourceText: ordinary })
assert.equal(ordinaryResult.proposalIds.length, 0, 'ordinary dialogue without a consequential change cue must not become an event')
assert.equal(ordinaryResult.rejectionReasons['no-consequential-evidence'], 1)
const inventedConsequence = proposeStoryEvents(emptyStoryConstellationState(), [eventCandidate({ anchor: 'Jaehyun asked whether Minho wanted another cup of tea', summary: 'Jaehyun publicly announced an engagement.' })], storySource('invented-summary', ordinary), { sourceText: ordinary })
assert.equal(inventedConsequence.proposalIds.length, 0, 'a model-written summary cannot invent consequentiality absent from the source anchor')
for (const [notice, expected] of [
  ['PERMANENT TRANSFER OF ASSETS EXECUTED TO THE RECIPIENT.', 1],
  ['Transfer of the equipment case completed.', 1],
  ['Transfer of assets will be executed tomorrow.', 0],
  ['No permanent transfer of assets executed.', 0],
  ['The proposed permanent transfer of assets executed in a hypothetical notice.', 0],
  ['They discussed a permanent transfer of assets.', 0],
] as const) {
  const text = `Mira read the notice: ${notice}`
  const result = proposeStoryEvents(emptyStoryConstellationState(), [eventCandidate({title:'Equipment ownership change',summary:'Mira reads the transfer notice.',anchor:notice,eventType:'possession',participants:[{name:'Mira',role:'witness'}]})], storySource('transfer-notice',text), {sourceText:text})
  assert.equal(result.proposalIds.length, expected, `completed transfer receipt must stay distinct from future/negated wording: ${notice}`)
  if (!expected) assert.equal(result.rejectionExamples[0].anchor,notice,'rejection diagnostic must retain the exact bounded anchor')
}

const photographSource = 'Arin and Jaehyun leave a restaurant together. A photographer standing across the street captures several clear photos of them. Minutes later the pictures are published publicly, identifying both of them.'
const photographed = proposeStoryEvents(emptyStoryConstellationState(), [eventCandidate({
  title: 'Arin and Jaehyun are photographed together',
  summary: 'A photographer captures clear photos of Arin and Jaehyun together and the pictures are published.',
  anchor: 'A photographer standing across the street captures several clear photos of them',
  eventType: 'media', participants: [{ name: 'Arin', role: 'subject' }, { name: 'Jaehyun', role: 'subject' }],
})], storySource('photograph', photographSource), { sourceText: photographSource })
assert.equal(photographed.proposalIds.length, 1, 'the controlled published-photograph event must survive validation')
assert.equal(photographed.state.proposals[photographed.proposalIds[0]].participants.length, 2, 'story actors resolve without Appearance Memory')

let state = emptyStoryConstellationState()
const grounded = proposeStoryEvents(state, [eventCandidate()], storySource(), { sourceText: storyLine })
assert.equal(grounded.proposalIds.length, 1, 'meaningful grounded change should create a proposal')
const proposal = grounded.state.proposals[grounded.proposalIds[0]]
assert.equal(proposal.sourceRef.contentFingerprint, storySource().contentFingerprint, 'source fingerprint must be preserved')
assert.equal(proposal.sourceRef.excerpt, proposal.anchor, 'bounded supporting anchor must be preserved')
state = grounded.state
assert.equal(state.events[Object.keys(state.events)[0]], undefined, 'high confidence stays proposed when auto-confirm is off')
const confirmed = confirmStoryProposal(state, proposal.proposalId)
assert(confirmed && confirmed.canonState === 'confirmed', 'proposal should transition to confirmed')
assert.equal(activeStoryEvents(state).length, 1)

const echoSource = 'Minho forwards the Naver article link to Jaehyun, repeating the restaurant photograph from the press conference.'
const echoed = proposeStoryEvents(state, [eventCandidate({
  title: 'The photograph is shared with Jaehyun',
  summary: 'Minho forwards the Naver article link to Jaehyun, repeating the restaurant photograph from the press conference.',
  anchor: 'Minho forwards the Naver article link to Jaehyun',
  participants: [{ name: 'Minho', role: 'source' }, { name: 'Jaehyun', role: 'recipient' }],
  echoes: [{ kind: 'kakao', channel: 'Naver link via Kakao', summary: echoSource, confidence: 0.94 }],
  likelyDuplicateEventId: confirmed.eventId,
})], storySource('message-echo', echoSource), { sourceText: echoSource })
assert.equal(echoed.proposalIds.length, 1, 'explicitly matched repeat becomes a reviewable Echo proposal')
assert.equal(echoed.state.proposals[echoed.proposalIds[0]].proposalKind, 'event-echo')
assert.equal(Object.values(echoed.state.events).filter(event => event.canonState === 'confirmed').length, 1, 'a manifestation must not duplicate its confirmed Event Node')
const linkedEcho = confirmStoryEchoProposal(echoed.state, echoed.proposalIds[0])
assert(linkedEcho && linkedEcho.eventId === confirmed.eventId, 'reviewed repeat links back to existing canon, not a second event')
assert.equal(linkedEcho.sourceRefs.length, 2, 'Echo provenance remains attached to the canonical event')
assert.equal(linkedEcho.echoIds.length, 1, 'confirmed Echo is attached to the Event Node')
assert.equal(echoed.state.echoes[linkedEcho.echoIds[0]].summary, echoSource, 'confirmed Echo retains the exact grounded manifestation')

const publicPhotoProposal = proposeStoryEvents(emptyStoryConstellationState(), [eventCandidate({
  title: 'Photos of Arin and Jaehyun published publicly',
  summary: 'A photographer captures photos of Arin and Jaehyun and the images are published publicly.',
  anchor: 'A photographer standing across the street captures several clear photos of them',
  eventType: 'public',
  participants: [{ name: 'Arin', role: 'subject' }, { name: 'Jaehyun', role: 'subject' }],
})], storySource('public-photo', photographSource), { sourceText: photographSource })
const publicPhotoEvent = confirmStoryProposal(publicPhotoProposal.state, publicPhotoProposal.proposalIds[0])!
const liveStyleEchoSource = "Tapping the display, he brought up Minho's incoming Kakao alert and followed the forwarded URL into the web portal, where the lead banner loaded with ruthless clarity: the identical high-resolution photo of Jaehyun on the wet stone while Arin looked up beneath the restaurant's brass awning. The phone message reads: Same article link. The restaurant photo is still trending."
const knownPhoto = [{
  id: publicPhotoEvent.eventId,
  title: publicPhotoEvent.title,
  summary: publicPhotoEvent.summary,
  eventType: publicPhotoEvent.eventType,
  importance: publicPhotoEvent.importance,
  participants: [{ name: 'Arin' }, { name: 'Jaehyun' }],
}]
const inferredEchoes = inferGroundedEventEchoCandidates(liveStyleEchoSource, knownPhoto)
assert.equal(inferredEchoes.length, 1, 'a same-photo Kakao/phone manifestation with confirmed actors is recoverable when the Sidecar returns an empty list')
assert.equal(inferredEchoes[0].likelyDuplicateEventId, publicPhotoEvent.eventId, 'fallback Echo targets only the exact confirmed Event ID')
assert.equal(inferredEchoes[0].echoes?.[0].kind, 'kakao', 'fallback preserves a grounded Kakao channel')
assert(liveStyleEchoSource.includes(inferredEchoes[0].anchor), 'fallback evidence anchor is an exact current-source substring')
assert(liveStyleEchoSource.includes(inferredEchoes[0].echoes?.[0].summary || ''), 'fallback Echo summary is copied from the current source')
const inferredProposal = proposeStoryEvents(publicPhotoProposal.state, inferredEchoes, storySource('live-style-echo', liveStyleEchoSource), { sourceText: liveStyleEchoSource })
assert.equal(inferredProposal.proposalIds.length, 1, 'fallback Echo is still proposal-first and must pass normal validation')
assert.equal(inferredProposal.state.proposals[inferredProposal.proposalIds[0]].proposalKind, 'event-echo')
const inferredConfirmed = confirmStoryEchoProposal(inferredProposal.state, inferredProposal.proposalIds[0])
assert.equal(inferredConfirmed?.eventId, publicPhotoEvent.eventId, 'reviewed fallback Echo attaches to existing canon')
assert.equal(Object.values(inferredProposal.state.events).filter(event => event.canonState === 'confirmed').length, 1, 'fallback never creates a duplicate Event Node')
assert.equal(inferredConfirmed?.echoIds.length, 1, 'confirmed fallback adds one Event Echo projection')
const emptyModelResult = normalizeEventSidecarOutput('{"events":[]}')
const completedEmptyResult = completeEventSidecarCandidates(emptyModelResult, liveStyleEchoSource, knownPhoto, false)
assert.equal(completedEmptyResult.fallbackEchoes, 1, 'empty Sidecar output receives exactly one bounded Echo fallback')
assert.equal(completedEmptyResult.events[0].likelyDuplicateEventId, publicPhotoEvent.eventId)
const modelEchoResult = normalizeEventSidecarOutput(JSON.stringify({ events: [inferredEchoes[0]] }))
const modelEchoPreview = proposeStoryEvents(structuredClone(publicPhotoProposal.state), modelEchoResult.events, storySource('valid-model-echo-preview', liveStyleEchoSource), { sourceText: liveStyleEchoSource })
const modelEchoValidated = modelEchoPreview.proposalIds.some(proposalId => modelEchoPreview.state.proposals[proposalId]?.proposalKind === 'event-echo')
assert(modelEchoValidated, 'the real proposal validator accepts the grounded model Echo used for suppression')
assert.equal(completeEventSidecarCandidates(modelEchoResult, liveStyleEchoSource, knownPhoto, modelEchoValidated).fallbackEchoes, 0, 'a validator-approved model-authored Echo does not get duplicated by fallback')

const invalidShapedModelResult = normalizeEventSidecarOutput(JSON.stringify({ events: [{ ...inferredEchoes[0], importance: 'background' }] }))
assert.equal(invalidShapedModelResult.events[0].likelyDuplicateEventId, publicPhotoEvent.eventId, 'the regression fixture keeps the exact known Event target despite its invalid importance')
const invalidModelEchoPreview = proposeStoryEvents(structuredClone(publicPhotoProposal.state), invalidShapedModelResult.events, storySource('invalid-model-echo-preview', liveStyleEchoSource), { sourceText: liveStyleEchoSource })
assert.equal(invalidModelEchoPreview.proposalIds.length, 0, 'the validator rejects the shaped model Echo with background importance')
assert.equal(invalidModelEchoPreview.rejectionReasons['background-importance'], 1)
const recoveredInvalidModelEcho = completeEventSidecarCandidates(invalidShapedModelResult, liveStyleEchoSource, knownPhoto, false)
assert.equal(recoveredInvalidModelEcho.fallbackEchoes, 1, 'an invalid-but-shaped model Echo must not suppress the grounded fallback')
const recoveredInvalidEchoProposal = proposeStoryEvents(publicPhotoProposal.state, recoveredInvalidModelEcho.events, storySource('invalid-model-echo-recovery', liveStyleEchoSource), { sourceText: liveStyleEchoSource })
assert.equal(recoveredInvalidEchoProposal.proposalIds.length, 1, 'fallback recovers a reviewable Echo proposal after the model candidate is rejected')
assert.equal(recoveredInvalidEchoProposal.rejectionReasons['background-importance'], 1, 'the bad model candidate remains visible as rejected while the fallback succeeds')
assert.equal(recoveredInvalidEchoProposal.state.proposals[recoveredInvalidEchoProposal.proposalIds[0]].proposalKind, 'event-echo')

const unrelatedConfirmed = [{ ...knownPhoto[0], id: 'event-unrelated-weather', title: 'Jaehyun receives an unrelated weather alert', summary: 'Jaehyun receives a weather update from Minho.', eventType: 'discovery' as const }]
assert.equal(inferGroundedEventEchoCandidates('Minho sends Jaehyun a weather update before the train arrives.', unrelatedConfirmed).length, 0, 'a phone message without same-event and media evidence does not become an Echo')
assert.equal(inferGroundedEventEchoCandidates('Arin and Jaehyun read a new article about a hotel opening.', knownPhoto).length, 0, 'shared actors and a generic article are insufficient without repetition and event-specific evidence')
const ambiguousTargets = [...knownPhoto, { ...knownPhoto[0], id: 'event-second-photo', title: 'Another restaurant photo is published publicly' }]
assert.equal(inferGroundedEventEchoCandidates(liveStyleEchoSource, ambiguousTargets).length, 0, 'ambiguous active targets fail closed instead of guessing which Event to echo')

const unrelatedPhoneText = 'Minho sends Jaehyun a weather update before the train arrives.'
const unrelatedPhone = proposeStoryEvents(state, [eventCandidate({
  anchor: 'Minho sends Jaehyun a weather update',
  participants: [{ name: 'Minho' }, { name: 'Jaehyun' }],
  echoes: [{ kind: 'phone-message', summary: unrelatedPhoneText, confidence: 0.9 }],
})], storySource('unrelated-phone', unrelatedPhoneText), { sourceText: unrelatedPhoneText })
assert.equal(unrelatedPhone.proposalIds.length, 0, 'a phone message without a grounded link to a confirmed event must not become an Echo')
assert.equal(unrelatedPhone.rejectionReasons['no-consequential-evidence'], 1)

const duplicate = proposeStoryEvents(state, [eventCandidate()], storySource('message-2', storyLine), { sourceText: storyLine })
assert.equal(duplicate.proposalIds.length, 0, 'repeated restatement must not duplicate an already-confirmed event')

const predictionText = 'Jaehyun promised that Minho will probably reveal the photograph tomorrow.'
const prediction = proposeStoryEvents(emptyStoryConstellationState(), [eventCandidate({ anchor: 'Minho will probably reveal the photograph tomorrow', summary: predictionText })], storySource('prediction', predictionText), { sourceText: predictionText })
assert.equal(prediction.proposalIds.length, 0, 'future prediction must not be promoted to canon')

const sparkOnly = '[Plot_Sparks][Spark][Text]Minho reveals the secret[/Text][/Spark][/Plot_Sparks]'
const whatIfOnly = '[WHATIF|alternate][whatif_scenario]Minho revealed the secret in another life.[/whatif_scenario][/WHATIF]'
const oocOnly = '[OOC]Minho revealed the secret, but this is only an author note.[/OOC]'
for (const [label, input] of [['Plot Spark', sparkOnly], ['In Another Life', whatIfOnly], ['OOC', oocOnly]]) {
  const cleaned = prepareStoryAnalysisText(input)
  assert(!/Minho revealed|Minho reveals/i.test(cleaned), `${label} content must be removed before Event Sidecar analysis`)
}
const runtime = prepareStoryAnalysisText(`Before <reverie-illustration request="generate"><visual_prompt>Minho reveals the secret</visual_prompt><img src="data:image/png;base64,abc"></reverie-illustration> after`)
assert(!runtime.includes('data:image') && !runtime.includes('visual_prompt') && runtime.includes('Before') && runtime.includes('after'), 'runtime image markup must be removed while surrounding prose survives')

const cleanNew = 'Minho revealed the photograph to Jaehyun at the press conference.'
let confirmedState = emptyStoryConstellationState()
const first = proposeStoryEvents(confirmedState, [eventCandidate({ anchor: 'Minho revealed the photograph to Jaehyun', title: 'Photograph revealed' })], storySource('stable', cleanNew), { sourceText: cleanNew })
const firstEvent = confirmStoryProposal(first.state, first.proposalIds[0])!
const restoredSourceState = structuredClone(first.state)
markStorySourceEdited(restoredSourceState, 'story-smoke-chat', 'stable', 0, `${cleanNew}\nTemporary source edit.`)
assert.equal(restoredSourceState.events[firstEvent.eventId].sourceState, 'edited')
assert(restoredSourceState.events[firstEvent.eventId].sourceWarning?.includes('source message changed'))
markStorySourceEdited(restoredSourceState, 'story-smoke-chat', 'stable', 0, cleanNew)
assert.equal(restoredSourceState.events[firstEvent.eventId].sourceState, 'active')
assert.equal(restoredSourceState.events[firstEvent.eventId].sourceWarning, undefined, 'exact source restoration must clear only its stale edit warning')
assert.equal(restoredSourceState.events[firstEvent.eventId].summary, firstEvent.summary, 'restoration does not reauthor confirmed facts')
restoredSourceState.events[firstEvent.eventId].sourceWarning = 'A source swipe was deleted. Canon is preserved for review.'
markStorySourceEdited(restoredSourceState, 'story-smoke-chat', 'stable', 0, cleanNew)
assert.equal(restoredSourceState.events[firstEvent.eventId].sourceWarning, 'A source swipe was deleted. Canon is preserved for review.', 'unrelated warnings must survive exact restoration')
const multiEdited = structuredClone(first.state)
multiEdited.events[firstEvent.eventId].sourceRefs.push({ ...multiEdited.events[firstEvent.eventId].sourceRefs[0], messageId: 'other-edited-source', sourceState: 'edited' })
markStorySourceEdited(multiEdited, 'story-smoke-chat', 'stable', 0, `${cleanNew}\nTemporary source edit.`)
markStorySourceEdited(multiEdited, 'story-smoke-chat', 'stable', 0, cleanNew)
assert(multiEdited.events[firstEvent.eventId].sourceWarning?.includes('source message changed'), 'a different still-edited source must retain the warning')
const sameMeaningEdit = 'Minho revealed the photograph to Jaehyun during the press conference.'
markStorySourceEdited(first.state, 'story-smoke-chat', 'stable', 0, sameMeaningEdit)
const reconciled = proposeStoryEvents(first.state, [eventCandidate({ anchor: 'Minho revealed the photograph to Jaehyun', title: 'Photograph revealed' })], storySource('stable', sameMeaningEdit), { sourceText: sameMeaningEdit })
assert.equal(reconciled.proposalIds.length, 0, 'same-meaning confirmed-source edit reconciles without duplicate proposal')
assert.equal(reconciled.reconciled, 1)
assert.equal(reconciled.state.events[firstEvent.eventId].sourceState, 'active')
assert.equal(reconciled.state.events[firstEvent.eventId].sourceRefs.length, 2, 'new source fingerprint is retained as provenance')

const revisedText = 'Minho admitted the photograph had been staged by Jaehyun.'
markStorySourceEdited(first.state, 'story-smoke-chat', 'stable', 0, revisedText)
const revision = proposeStoryEvents(first.state, [eventCandidate({ title: 'The photograph was staged', summary: revisedText, anchor: 'Minho admitted the photograph had been staged', participants: [{ name: 'Minho' }, { name: 'Jaehyun' }] })], storySource('stable', revisedText), { sourceText: revisedText })
assert.equal(revision.proposalIds.length, 1, 'materially changed confirmed source must produce a revision proposal')
assert.equal(revision.state.proposals[revision.proposalIds[0]].proposalKind, 'revision')
assert.equal(revision.state.proposals[revision.proposalIds[0]].likelyDuplicateEventId, firstEvent.eventId)

const autoOff = proposeStoryEvents(emptyStoryConstellationState(), [eventCandidate()], storySource('auto-off'), { sourceText: storyLine })
assert.equal(autoOff.state.events[Object.keys(autoOff.state.events)[0]], undefined, 'auto-confirm is absent by default')
const autoOn = proposeStoryEvents(emptyStoryConstellationState(), [eventCandidate()], storySource('auto-on'), { sourceText: storyLine, autoConfirmHighConfidence: true })
assert.equal(Object.values(autoOn.state.events).filter(event => event.canonState === 'confirmed').length, 1, 'conservatively validated >=95% candidate can auto-confirm only when explicitly enabled')

const output = normalizeEventSidecarOutput('```json\n{"events":[{"title":"x","summary":"y","anchor":"z","eventType":"nonsense","importance":"major","confidence":2,"participants":[]}] }\n```')
assert.equal(output.events[0].eventType, 'other', 'Sidecar categories are validated')
assert.equal(output.events[0].confidence, 1, 'Sidecar confidence is clamped')
assert.equal(output.rawCandidates, 1)
assert.equal(output.rejectedCandidates, 0)
assert.equal(normalizeEventSidecarOutput('{"events":[{"title":"incomplete"}]}').rejectedCandidates, 1, 'normalization rejections must be counted')
const capped = normalizeEventSidecarOutput(JSON.stringify({ events: Array.from({ length: 9 }, () => ({ title: 'x', summary: 'y', anchor: 'z' })) }))
assert.equal(capped.rawCandidates, 9, 'diagnostics count every raw candidate even when the safety cap applies')
assert.equal(capped.rejectedCandidates, 1, 'candidates above the safety cap are visible as rejected')
assert.throws(() => normalizeEventSidecarOutput('{"events":"nope"}'), /events array/)
console.log('PASS event constellations: grounded proposals, consequentiality, duplicate/revision/Echo lifecycle, sanitization, validation')
