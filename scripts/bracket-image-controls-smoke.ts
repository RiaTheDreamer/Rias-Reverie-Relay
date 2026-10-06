// @ts-nocheck -- offline parsing/rendering and production backend harness.
import assert from 'node:assert/strict'
import { parseImageRequests, containsImageRequestMarkup, inspectProseIllustrationSchemas, inspectStoryModelOutputContracts, sanitizeRelayPromptHistoryText } from '../src/contracts'
import { buildIllustrationSceneContract, enforceIllustrationSceneContract } from '../src/illustrationSceneContract'
import { bracketImageControls, bracketImageControlInstructions } from '../src/imageControlMarkup'
import { BracketIllustrationStream } from '../src/instantIllustrationStream'
import { inspectProviderPromptSafety } from '../src/providerPromptSafety'
import { renderNativeSurfaceMarkup } from '../src/nativeSurfaces'
import { renderNarrativeRegex } from '../src/narrativeRegexAssets'
import { bracketExampleFromXml } from '../src/bracketSurfaceAuthoring'
import { shippedSurfaceDefinitions } from '../src/shippedSurfaceDefinitions'
import { r45SupplementalSurfaceDefinitions } from '../src/r45SurfaceCatalog'
import { DEFAULT_PROMPT_REGISTRY, PROMPT_REGISTRY_DEFINITIONS } from '../src/protocols'

globalThis.spindle = { on() {}, onFrontendMessage() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, sendToFrontend() {}, permissions: { has: () => true }, log: { info() {}, warn() {}, error() {} } }
const { hasExactStateProjectionOwner, normalizeProseIllustratorSettings, parseSafeSurfaceImageRequests, proseParagraphBeforeImageRequest } = await import('../src/backend')
const paragraph = 'Mira lifts the blue folder into the low wall shelf with both hands.'
const prompt = 'View: side-on medium shot. Mira in a charcoal blazer lifts the blue folder into the low shelf. [soft lighting], (shelf:1.1), A & B.'
const xml = (slot = 'folder', value = prompt) => `<reverie-illustration request="generate" slot="${slot}" aspect="4:3" cast="none" alt="Shelving"><visual_prompt>${value}</visual_prompt></reverie-illustration>`
const bracket = (slot = 'folder', value = prompt) => bracketImageControlInstructions(xml(slot, value))
for (const value of [prompt, '1girl, solo, from_side, holding, folder, blazer, shelf, office']) {
  const raw = bracket('folder', value)
  const source = `${paragraph}\n\n${raw}`
  const [request] = parseImageRequests(source)
  assert.equal(request.promptSource, 'visual_prompt')
  assert.equal(request.prompt, value)
  assert.equal(request.index, source.indexOf(raw))
  assert.equal(request.fullMatch, raw)
  assert.equal(request.target, 'prose.illustration')
  assert.equal(inspectProseIllustrationSchemas(source).length, 0)
  assert(containsImageRequestMarkup(raw))
  assert.equal(inspectStoryModelOutputContracts(source, { expectedInlineIllustrations: 1 }).inline.valid, true)
  assert(!sanitizeRelayPromptHistoryText(source).includes('[visual_prompt]'))
  assert.equal(sanitizeRelayPromptHistoryText(source).trim(), paragraph)
  assert(inspectProviderPromptSafety(raw).some(issue => issue.code === 'raw-markup'))
  assert(!inspectProviderPromptSafety(value).some(issue => issue.code === 'raw-markup'), 'literal/weight brackets in the value remain allowed')
  const job = { requestId: 'folder', target: 'prose.illustration', slots: ['folder'] }
  assert(hasExactStateProjectionOwner(source, job))
  assert(!hasExactStateProjectionOwner(`${source}\n${raw}`, job), 'duplicate owners cannot inherit a generated asset')
  assert.equal(parseSafeSurfaceImageRequests(source)[0]?.fullMatch, raw)
  assert.equal(proseParagraphBeforeImageRequest(source, request.index)?.paragraph, paragraph)
}
const mixed = `${paragraph}\n\n${xml('legacy')}\n\nAnother anchored action.\n\n${bracket('new')}`
assert.deepEqual(parseImageRequests(mixed).map(request => request.id), ['legacy', 'new'])
assert.equal(proseParagraphBeforeImageRequest(mixed, parseImageRequests(mixed)[1].index)?.paragraph, 'Another anchored action.')
const threeAnchors = `${paragraph}\n\n${bracket('first')}\n\nMira closes the cupboard.\n\n${bracket('second')}\n\nMira leaves the office.\n\n${bracket('third')}`
assert.deepEqual(parseImageRequests(threeAnchors).map(request => proseParagraphBeforeImageRequest(threeAnchors, request.index)?.paragraph), [paragraph, 'Mira closes the cupboard.', 'Mira leaves the office.'])
const foldBeat = 'Yejin folds the sealed letter in half at the worktable.'
const drawBeat = 'Yejin draws a floor plan beside the studio entrance.'
const twoIllustrations = `${foldBeat}\n\n${xml('fold', 'Yejin folds the sealed letter in half at the worktable.')}\n\n${drawBeat}\n\n${xml('draw', 'Yejin sketches the floor plan beside the studio entrance.')}`
const twoRequests = parseSafeSurfaceImageRequests(twoIllustrations)
assert.deepEqual(twoRequests.map(request => proseParagraphBeforeImageRequest(twoIllustrations, request.index)?.paragraph), [foldBeat, drawBeat], 'each illustration must retain the story paragraph immediately before its own request')
const secondRequest = twoRequests[1]
const secondAnchor = proseParagraphBeforeImageRequest(twoIllustrations, secondRequest.index)?.paragraph || ''
const secondContract = buildIllustrationSceneContract({ sourceParagraph: secondAnchor, anchorExcerpt: secondAnchor, actors: [{ name: 'Yejin', identity: [], current: [], action: 'draws the floor plan', contact: 'pencil against paper' }] })
assert.equal(secondContract.centralAction, 'draw')
assert.equal(enforceIllustrationSceneContract(secondRequest.prompt, 'natural-language', secondContract).issues.length, 0, 'the second request may paraphrase draw as sketch without losing the action')
assert(!/visual_prompt|reverie[_-]illustration/.test(sanitizeRelayPromptHistoryText(mixed)))
const narrative = `[Plot_Sparks][Spark][Media]${bracket()}[/Media][/Spark][/Plot_Sparks]`
assert.equal(parseImageRequests(narrative)[0].target, 'custom.artifact-media')
assert.equal(inspectStoryModelOutputContracts(narrative).inline.actualCanonicalIllustrations, 0)
for (const malformed of [
  bracket().replace('[request]generate[/request]', ''),
  bracket().replace('[slot]folder[/slot]', '[slot]folder[/slot][slot]duplicate[/slot]'),
  bracket().replace('[visual_prompt]', '[scene_brief]').replace('[/visual_prompt]', '[/scene_brief]'),
  bracket().replace('[cast]none[/cast]', '[cast]everyone[/cast]'),
  bracket().replace('[/reverie_illustration]', ''),
  bracket().replace('[reverie_illustration]', '[reverie_illustration slot="folder"]'),
]) {
  assert.equal(parseImageRequests(malformed).length, 0)
  assert(inspectProseIllustrationSchemas(malformed).length > 0)
}
const generic = '[image_request][id]surface[/id][target]instagram.carousel[/target][slot]carousel[/slot][count]3[/count][cast]none[/cast][visual_prompt]Three views.[/visual_prompt][negative_prompt]text[/negative_prompt][/image_request]'
assert.equal(parseImageRequests(generic)[0].count, 3)
assert.equal(parseImageRequests(generic)[0].cast, 'none')
assert.equal(parseImageRequests(generic)[0].prompt, 'Three views.')
assert.equal(parseImageRequests(generic)[0].promptSource, 'structured')

const definitions = [...shippedSurfaceDefinitions(1), ...r45SupplementalSurfaceDefinitions(1)]
const studio = { definitions: Object.fromEntries(definitions.map(definition => [definition.surfaceId, definition])), activePresetIds: Object.fromEntries(definitions.map(definition => [definition.baseSurfaceId, definition.surfaceId])), collectionPresets: {}, defaultShellMode: 'plain', colorMode: 'realistic' }
const rendered = renderNativeSurfaceMarkup(`${paragraph}\n\n${bracket()}`, studio, { chatId: 'chat', messageId: 'message' })
assert(rendered.content.includes('data-rrn-native-request="folder"'))
assert(!rendered.content.includes('[visual_prompt]'))
const failed = renderNativeSurfaceMarkup(bracket().replace('[cast]none[/cast]', '[cast]everyone[/cast]'), studio, { chatId: 'chat', messageId: 'message' })
assert(failed.content.includes('Format error'))
const { JSDOM } = await import('jsdom')
const phoneSource = bracketExampleFromXml(definitions.find(definition => definition.baseSurfaceId === 'smartphone')!.sampleXml).replace('[/messages]', '[corrupt_field]Broken.[/messages]')
const phoneRendered = renderNativeSurfaceMarkup(phoneSource, studio, { chatId: 'chat', messageId: 'phone-message', swipeId: 2 })
const phoneDom = new JSDOM(phoneRendered.content)
const phoneOwner = phoneDom.window.document.querySelector('[data-rrn-editable-surface="smartphone"]')!
assert(phoneOwner, JSON.stringify({ ids: phoneRendered.renderedSurfaceIds, markup: phoneDom.window.document.body.textContent?.slice(0,900) }))
assert.equal(phoneOwner.getAttribute('data-rrn-surface-original'), phoneSource, 'editor ownership retains authored brackets, not the XML presentation adapter')
assert(phoneOwner.getAttribute('data-rrn-surface-source')!.includes('[image_request]'))
phoneDom.window.close()
const badBoard = `[Plot_Sparks][ID]bracket-board[/ID][Spark][Key]a[/Key][Vector]detonation[/Vector][Text]Visible branch.[/Text][Media]${bracket('spark-a')}[/Media][/Spark][/Plot_Sparks]`
const boardDom = new JSDOM(renderNarrativeRegex(badBoard, 'sparkle-button', 'board-message', { chatId: 'chat', swipeId: 2 }))
assert.equal(boardDom.window.document.querySelector('[data-rrn-editable-surface="plot-sparks"]')?.getAttribute('data-rrn-surface-original'), badBoard, 'failed Narrative repair also locks the raw authored brackets')
boardDom.window.close()
for (const definition of PROMPT_REGISTRY_DEFINITIONS) for (const token of definition.requiredTokens || []) assert(definition.defaultTemplate.includes(token), `${definition.id} missing required token ${token}`)
for (const id of ['story.model-placed', 'story.inline-protocol', 'story.inline-protocol.booru-tags', 'story.surface-protocol', 'story.artifact-media']) {
  assert(/<(?:image_request|reverie-illustration)\b/.test(DEFAULT_PROMPT_REGISTRY[id]), `${id} must teach XML controls`)
  assert(!/\[(?:image_request|reverie_illustration)\]/.test(DEFAULT_PROMPT_REGISTRY[id]), `${id} must not teach old bracket controls`)
}
const migrated = normalizeProseIllustratorSettings({ promptRegistry: { 'story.inline-protocol': 'Custom protocol retained.' } })
const oldGrammarRule = 'The outer request is literal XML: its first character is < and its name is reverie-illustration; close the same element with </reverie-illustration>. Put one non-empty <visual_prompt>...</visual_prompt> pair inside it. This request uses raw XML, not Relay square-bracket syntax. Never emit an unfinished opener or partial request; verify both closing tags before ending the response.'
const currentGrammarRule = bracketImageControlInstructions(oldGrammarRule)
assert(currentGrammarRule.includes('Its first character is [.'))
assert(currentGrammarRule.includes('[reverie_illustration] ... [/reverie_illustration]'))
assert(!/literal XML|first character is <|raw XML|not Relay square-bracket/.test(currentGrammarRule), 'saved grammar reminders cannot contradict bracket examples')
assert.equal(migrated.promptRegistry['story.inline-protocol'], 'Custom protocol retained.')
const legacyCompletion = bracketImageControlInstructions('Write a <reverie-illustration> XML element. Never substitute square-bracket markup, a note, or a status placeholder.')
assert(legacyCompletion.includes('[reverie_illustration] bracket request'))
assert(!legacyCompletion.includes('Never substitute square-bracket'))

// Every character boundary, including partial roots and closing delimiters.
const source = `${paragraph}\n\n${bracket()}`
for (let split = 0; split < source.length; split++) {
  const stream = new BracketIllustrationStream()
  stream.start('gen', 'chat', 'message')
  assert.equal(stream.push({ generationId: 'gen', chatId: 'chat', token: source.slice(0, split), offset: 0 }).length, 0)
  const requests = stream.push({ generationId: 'gen', chatId: 'chat', token: source.slice(split), offset: split })
  assert.equal(requests.length, 1)
  assert.equal(requests[0].sourceContent, source)
  assert.equal(stream.push({ generationId: 'gen', chatId: 'chat', token: source.slice(split), offset: split }).length, 0)
  stream.clear()
  assert.equal(stream.push({ generationId: 'gen', chatId: 'chat', token: bracket('later'), offset: source.length }).length, 0)
}
const gap = new BracketIllustrationStream()
gap.start('gen', 'chat', 'message')
assert.equal(gap.push({ generationId: 'gen', chatId: 'chat', token: source, offset: 2 }).length, 0)
assert.equal(gap.push({ generationId: 'gen', chatId: 'chat', token: source, offset: 0 }).length, 0, 'gap disables Instant until a fresh generation; completed response can reconcile')
console.log('Bracket image controls passed: dual ingress, Natural/Booru values, raw offsets, ownership, schema failures, rendering, history, provider safety, overrides and every streaming split.')
