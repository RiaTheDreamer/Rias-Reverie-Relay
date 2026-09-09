import { readFile } from 'node:fs/promises'
import {
  parseImageRequests,
  parseRouterMarkers,
  mergeMissingSlotRecords,
  replaceImageUrlAfterSlotComment,
  replaceResolvedSlotAfterComment,
  renderResolvedMarkup,
  selectRescanSwipeRows,
  slotKey,
  slotsForRequest,
  targetApp,
  normalizeImageIntent,
  sanitizeRelayPromptHistoryText,
} from '../src/contracts'

const content = `<tw_post>
<image_request id="tw-1" target="twitter.media" alt="A">Twitter scene</image_request>
</tw_post>
<ig_app>
<image_request id="ig-1" target="instagram.carousel" count="2">Carousel scene</image_request>
</ig_app>
<smart_phone><messages>
<image_request request_id="phone-1" target="smartphone.message-image" time="02:15">
  <scene_brief>Phone selfie scene</scene_brief>
  <context_caption>Late-night selfie.</context_caption>
</image_request>
</messages></smart_phone>
<kakao_chat><messages><k_msg sender="Character A" avatar="M" color="#ffe812" time="08:42" side="left" read="1">
<image_request request_id="kakao-1" target="kakao.image" aspect="4:5">
  <scene_brief>Cafe table scene</scene_brief>
  <context_caption>Cafe photo.</context_caption>
</image_request>
</k_msg></messages></kakao_chat>
<scene_illustration id="scene-1" placement="inline" caption="A quiet hallway">
<image_request id="prose-1" target="prose.illustration" aspect="16:9" alt="Hallway illustration">
  <scene_brief>A quiet hallway after the argument.</scene_brief>
</image_request>
</scene_illustration>
<yt_thumbnail><image_request id="custom-1" target="custom.youtube-thumbnail" slot="thumbnail" aspect="16:9">A dramatic thumbnail fixture.</image_request></yt_thumbnail>`

const requests = parseImageRequests(content)
const modelPlaced = parseImageRequests(`<reverie-illustration request="generate" slot="scene-bridge-01" aspect="4:3" cast="char+user" alt="Two people together"><visual_prompt>2people, Character A and Persona A sitting together, tense eye contact, late afternoon light</visual_prompt></reverie-illustration>`)[0]
assert(modelPlaced?.promptSource === 'visual_prompt' && modelPlaced.cast === 'char+user', 'expected canonical Model-Placed visual_prompt and cast metadata')
assert(modelPlaced.prompt.startsWith('2people'), 'expected visual_prompt body to remain authoritative')
const legacyModelPlaced = parseImageRequests('<reverie-illustration request="generate" slot="legacy-scene" aspect="4:3">Character A walking through Location A at dusk.</reverie-illustration>')[0]
assert(legacyModelPlaced?.promptSource === 'legacy-body' && legacyModelPlaced.prompt.includes('walking through Location A'), 'expected direct-body prose illustration compatibility')
const noCast = parseImageRequests('<reverie-illustration request="generate" slot="object-scene" cast="none"><visual_prompt>cracked smartphone lying face-up on a woven rug, empty bedroom</visual_prompt></reverie-illustration>')[0]
assert(noCast?.cast === 'none', 'expected cast none to survive request parsing')
const narrativeIllustration = parseImageRequests('<dramatic_parallel><div class="dp-media"><reverie-illustration request="generate" slot="cutaway-1" aspect="16:9" cast="none"><visual_prompt>empty western street under hard noon light</visual_prompt></reverie-illustration></div></dramatic_parallel>')[0]
assert(narrativeIllustration?.target === 'custom.artifact-media', 'Narrative-owned illustration must resolve inside its artifact-media owner')
assert(narrativeIllustration?.promptSource === 'structured', 'Narrative-owned illustration must use the shared parser path')
assert(narrativeIllustration?.slot === 'cutaway-1', 'Narrative-owned illustration must preserve its exact owner slot')
const bracketNarrativeIllustration = parseImageRequests('[SCENE|Gym|17:10|Tense]<scene-media><reverie-illustration request="generate" slot="scene-card-1"><visual_prompt>players crossing a gym floor</visual_prompt></reverie-illustration></scene-media>[/SCENE]')[0]
assert(bracketNarrativeIllustration?.target === 'custom.artifact-media' && bracketNarrativeIllustration.promptSource === 'structured', 'bracket Narrative owner must normalize to artifact media')
assert(modelPlaced?.target === 'prose.illustration' && modelPlaced.promptSource === 'visual_prompt', 'standalone Prose Illustrator must retain its dedicated authoritative path')
const intentRequests = parseImageRequests(`<tw_post><image_request id="meme-1" target="twitter.media" intent="meme">A deliberately cheap reaction meme.</image_request></tw_post><image_request id="unknown-1" target="twitter.media" intent="banana-catastrophe">Normal candid.</image_request>`)
assert(intentRequests[0].intent === 'meme', 'expected supported image intent to parse and persist')
assert(intentRequests[1].intent === 'auto', 'expected unknown image intent to fall back to auto')
assert(normalizeImageIntent('Funny Edit') === 'funny_edit', 'expected intent normalization to support spaces')
assert(normalizeImageIntent(undefined) === 'auto', 'expected missing intent to remain backward-compatible auto')
const sanitizedPromptHistory = sanitizeRelayPromptHistoryText(`Before.
<!-- dreamglass:image chatId="chat-old" messageId="msg-old" swipeId="0" requestId="old-1" target="twitter.media" slot="media" -->
<scene_image><img src="/api/v1/images/old-1" data-dgir-request-id="old-1"></scene_image>
<image_request id="old-request" target="twitter.media"><scene_brief>Historical request body.</scene_brief></image_request>
<reverie-illustration request="generate" slot="old-illustration">Historical illustration request.</reverie-illustration>
<dreamglass_request>Obsolete request wrapper.</dreamglass_request>
![reverie-relay](/api/v1/images/old-1)
After.`)
assert(!/dreamglass:image|data-dgir-request-id|reverie-relay|scene_image|image_request|reverie-illustration|dreamglass_request/i.test(sanitizedPromptHistory), 'expected legacy Dreamglass, historical requests, and Relay-owned output markers to be removed from story-model history')
assert(sanitizedPromptHistory.includes('Before.') && sanitizedPromptHistory.includes('After.'), 'expected prose around removed output markers to remain in story-model history')
assert(requests.length === 6, 'expected six image requests')
const inheritedPhoneTime = parseImageRequests('<smart_phone sender="Character A" initial="M" time="19:52" day="Friday" battery="67"><notifications></notifications><contact>Character A</contact><messages><s_recv time="19:48">Photo follows.</s_recv><image_request id="phone-time" target="smartphone.message-image" slot="message-image" aspect="4:5"><scene_brief>Dark gate, no people visible.</scene_brief></image_request></messages><info>Active</info></smart_phone>')[0]
assert(inheritedPhoneTime?.time === '19:48', 'expected Smartphone request to inherit nearest message time for s_img hydration')
assert(requests[0].target === 'twitter.media', 'expected twitter target')
assert(requests[1].target === 'instagram.carousel', 'expected carousel target')
assert(requests[1].count === 2, 'expected carousel count to persist')
assert(requests[2].id === 'phone-1', 'expected request_id to parse')
assert(requests[2].target === 'smartphone.message-image', 'expected smartphone target')
assert(requests[2].prompt === 'Phone selfie scene', 'expected scene_brief prompt')
assert(requests[2].alt === 'Late-night selfie.', 'expected context caption as alt')
assert(requests[3].target === 'kakao.image', 'expected Kakao target')
const totalSlots = requests.reduce((sum, request) => sum + slotsForRequest(request).length, 0)
assert(totalSlots === 7, 'expected seven routed slots from mixed request set')
assert(requests[4].target === 'prose.illustration' && slotsForRequest(requests[4])[0] === 'illustration', 'expected prose illustration target and slot')
assert(requests[5].target === 'custom.youtube-thumbnail' && slotsForRequest(requests[5])[0] === 'thumbnail', 'expected custom surface target and slot')

const carouselJob = {
  chatId: 'chat-a',
  messageId: 'msg-a',
  swipeId: 0,
  requestId: 'ig-1',
  target: 'instagram.carousel' as const,
  count: 2,
  slots: ['slide-1', 'slide-2'],
  alt: 'Carousel image',
  originalSceneBrief: 'Carousel scene',
  originalNegativePrompt: '',
  originalRequestXml: requests[1].fullMatch,
}
const carouselResults = [
  {
    slot: 'slide-1',
    imageId: 'image-1',
    imageUrl: '/api/v1/image-gen/results/image-1',
    resolvedPositivePrompt: 'resolved one',
    resolvedNegativePrompt: '',
    promptMode: 'parsed_custom',
    promptPresetId: null,
    generatedAt: 1,
  },
  {
    slot: 'slide-2',
    imageId: 'image-2',
    imageUrl: '/api/v1/image-gen/results/image-2',
    resolvedPositivePrompt: 'resolved two',
    resolvedNegativePrompt: '',
    promptMode: 'parsed_custom',
    promptPresetId: null,
    generatedAt: 2,
  },
]

const carouselMarkup = renderResolvedMarkup(carouselJob, carouselResults)

assert(carouselMarkup.includes('<ig_media active="1" total="2">'), 'expected carousel wrapper')
assert(carouselMarkup.includes('slot="slide-1"'), 'expected slide one marker')
assert(carouselMarkup.includes('slot="slide-2"'), 'expected slide two marker')
assert(carouselMarkup.includes('<ig_slide src="/api/v1/image-gen/results/image-2"'), 'expected slide two URL')

const key = slotKey({
  chatId: 'chat-a',
  messageId: 'msg-a',
  swipeId: 0,
  requestId: 'ig-1',
  slot: 'slide-2',
})
const replaced = replaceImageUrlAfterSlotComment(carouselMarkup, {
  ...carouselJob,
  key,
  targetApp: 'instagram',
  slot: 'slide-2',
  status: 'completed',
  createdAt: 1,
  updatedAt: 2,
  imageId: 'image-2',
  imageUrl: '/api/v1/image-gen/results/image-2',
  history: [],
}, '/api/v1/image-gen/results/image-2b')
assert(replaced, 'expected slot URL replacement')
assert(replaced.includes('src="/api/v1/image-gen/results/image-2b"'), 'expected replacement URL')
assert(replaced.includes('src="/api/v1/image-gen/results/image-1"'), 'expected slide one to remain unchanged')

const phoneMarkup = renderResolvedMarkup({
  chatId: 'chat-a',
  messageId: 'msg-a',
  swipeId: 0,
  requestId: 'phone-1',
  target: 'smartphone.message-image',
  count: 1,
  slots: ['message-image'],
  alt: 'Late-night selfie.',
  time: '02:15',
  originalSceneBrief: 'Phone selfie scene',
  originalNegativePrompt: '',
  originalRequestXml: requests[2].fullMatch,
}, [{
  slot: 'message-image',
  imageId: 'phone-image',
  imageUrl: '/api/v1/image-gen/results/phone-image',
  resolvedPositivePrompt: 'phone prompt',
  resolvedNegativePrompt: '',
  promptMode: 'parsed_custom',
  promptPresetId: null,
  generatedAt: 3,
}])
assert(phoneMarkup.includes('<s_img side="recv" time="02:15"><img src="/api/v1/image-gen/results/phone-image"'), 'expected Smartphone-compatible image markup with mandatory side')
assert(phoneMarkup.includes('data-dgir-request-id="phone-1"'), 'expected Smartphone resolved image to retain Relay ownership metadata')

const kakaoMarkup = renderResolvedMarkup({
  chatId: 'chat-a',
  messageId: 'msg-a',
  swipeId: 0,
  requestId: 'kakao-1',
  target: 'kakao.image',
  count: 1,
  slots: ['image'],
  alt: 'Cafe photo.',
  caption: 'Cafe photo.',
  originalSceneBrief: 'Cafe table scene',
  originalNegativePrompt: '',
  originalRequestXml: requests[3].fullMatch,
}, [{
  slot: 'image',
  imageId: 'kakao-image',
  imageUrl: '/api/v1/image-gen/results/kakao-image',
  resolvedPositivePrompt: 'kakao prompt',
  resolvedNegativePrompt: '',
  promptMode: 'parsed_custom',
  promptPresetId: null,
  generatedAt: 4,
}])
assert(kakaoMarkup.includes('<k_img caption="Cafe photo."><img src="/api/v1/image-gen/results/kakao-image" alt="Cafe photo."></k_img>'), 'expected Kakao-compatible image markup')

const proseMarkup = renderResolvedMarkup({
  chatId: 'chat-a',
  messageId: 'msg-a',
  swipeId: 0,
  requestId: 'prose-1',
  target: 'prose.illustration',
  count: 1,
  slots: ['illustration'],
  alt: 'Hallway illustration',
  caption: 'A quiet hallway',
  originalSceneBrief: 'A quiet hallway after the argument.',
  originalNegativePrompt: '',
  originalRequestXml: requests[4].fullMatch,
}, [{
  slot: 'illustration',
  imageId: 'prose-image',
  imageUrl: '/api/v1/image-gen/results/prose-image',
  resolvedPositivePrompt: 'prose prompt',
  resolvedNegativePrompt: '',
  promptMode: 'parsed_custom',
  promptPresetId: null,
  generatedAt: 5,
}])
assert(
  proseMarkup.includes('target="prose.illustration"')
  && proseMarkup.includes('![reverie-relay](/api/v1/image-gen/results/prose-image)'),
  'expected prose illustration resolved markdown image markup with stable Relay ownership marker',
)

const customMarkup = renderResolvedMarkup({
  chatId: 'chat-a',
  messageId: 'msg-a',
  swipeId: 0,
  requestId: 'custom-1',
  target: 'custom.youtube-thumbnail',
  intent: 'meme',
  count: 1,
  slots: ['thumbnail'],
  alt: 'Thumbnail',
  caption: 'Custom caption',
  originalSceneBrief: 'A dramatic thumbnail fixture.',
  originalNegativePrompt: '',
  originalRequestXml: requests[5].fullMatch,
}, [{
  slot: 'thumbnail',
  imageId: 'custom-image',
  imageUrl: '/api/v1/image-gen/results/custom-image',
  resolvedPositivePrompt: 'custom prompt',
  resolvedNegativePrompt: '',
  promptMode: 'parsed_custom',
  promptPresetId: null,
  generatedAt: 6,
}])
assert(customMarkup.includes('<img src="/api/v1/image-gen/results/custom-image"') && customMarkup.includes('data-dgir-custom-target="custom.youtube-thumbnail"') && customMarkup.includes('slot="thumbnail"'), 'expected plain image custom surface write-back markup')

assert(customMarkup.includes('data-dgir-key="chat-a:msg-a:0:custom-1:thumbnail"') && customMarkup.includes('data-dgir-request-id="custom-1"') && customMarkup.includes('data-dgir-image-id="custom-image"') && customMarkup.includes('data-dgir-image-intent="meme"'), 'expected custom surface write-back to include immediate Relay lookup and intent metadata')

const customSurfaceMatrix = [
  ['custom.album-cover', 'album_cover'],
  ['custom.evidence-photo', 'evidence_photo'],
  ['custom.magazine-cover', 'magazine_cover'],
  ['custom.photo-booth-strip', 'photo_booth_strip'],
  ['custom.polaroid', 'polaroid_frame'],
  ['custom.youtube-thumbnail', 'yt_thumbnail'],
] as const
for (const [target, wrapper] of customSurfaceMatrix) {
  const requestXml = `<${wrapper}><image_request id="matrix-${target}" target="${target}" aspect="16:9">Matrix fixture.</image_request></${wrapper}>`
  const request = parseImageRequests(requestXml)[0]
  assert(request?.target === target && targetApp(request.target) === 'custom', `${target} should classify as the Custom app family`)
  const slot = slotsForRequest(request)[0]
  const markup = renderResolvedMarkup({
    chatId: 'chat-custom', messageId: 'msg-custom', swipeId: 0, requestId: request.id,
    target: request.target, count: 1, slots: [slot], alt: target,
    originalSceneBrief: request.prompt, originalNegativePrompt: '', originalRequestXml: request.fullMatch,
  }, [{
    slot, imageId: `image-${request.id}`, imageUrl: `/api/v1/image-gen/results/image-${request.id}`,
    resolvedPositivePrompt: 'custom matrix prompt', resolvedNegativePrompt: '', promptMode: 'parsed_custom', promptPresetId: null, generatedAt: 7,
  }])
  assert(markup.includes(`<img src="/api/v1/image-gen/results/image-${request.id}"`) && markup.includes(`data-dgir-custom-target="${target}"`), `${target} should resolve to a plain image child while its outer wrapper remains available for Regex styling`)
}


const explicitIllustrationRequests = parseImageRequests(`<reverie-illustration request="generate" slot="prose-beat-1" aspect="4:3" alt="A quiet hallway beat">
A quiet institutional hallway after the hearing, empty chairs, morning light.
</reverie-illustration>`)
assert(explicitIllustrationRequests.length === 1, 'expected one explicit Reverie illustration request')
assert(explicitIllustrationRequests[0].id === 'prose-beat-1' && explicitIllustrationRequests[0].target === 'prose.illustration', 'expected explicit illustration tag to map to a stable prose slot')
assert(parseImageRequests(`<reverie-illustration slot="missing-marker">This must not generate.</reverie-illustration>`).length === 0, 'expected reverie-illustration to require request="generate"')

const artifactRequest = parseImageRequests(`<reverie_artifact_media><image_request id="artifact-frame-1" target="custom.artifact-media" slot="case-photo" aspect="4:3" alt="Evidence photograph"><scene_brief>Empty hearing-room corridor, no people visible.</scene_brief></image_request></reverie_artifact_media>`)[0]
assert(artifactRequest?.target === 'custom.artifact-media', 'expected authored artifact media request to parse')
const artifactMarkup = renderResolvedMarkup({
  chatId: 'chat-artifact', messageId: 'msg-artifact', swipeId: 0, requestId: artifactRequest.id,
  target: artifactRequest.target, count: 1, slots: ['case-photo'], alt: artifactRequest.alt || 'Evidence photograph',
  originalSceneBrief: artifactRequest.prompt, originalNegativePrompt: '', originalRequestXml: artifactRequest.fullMatch,
}, [{
  slot: 'case-photo', imageId: 'artifact-image', imageUrl: '/api/v1/image-gen/results/artifact-image',
  resolvedPositivePrompt: 'empty corridor', resolvedNegativePrompt: 'people', promptMode: 'parsed_custom', promptPresetId: null, generatedAt: 8,
}])
assert(artifactMarkup.includes('data-reverie-artifact-media="true"') && artifactMarkup.includes('loading="lazy"') && artifactMarkup.includes('decoding="async"'), 'expected artifact media write-back to expose stable hydration metadata')

;(globalThis as any).spindle = {
  on: () => undefined,
  onFrontendMessage: () => undefined,
  registerInterceptor: () => undefined,
  registerMacro: () => undefined,
  log: { info: () => undefined, warn: () => undefined, error: () => undefined },
  sendToFrontend: () => undefined,
  permissions: { has: () => false },
}

const quality = await import('../src/backend')
const registrySettings = quality.defaultProseIllustratorSettings()
assert(registrySettings.promptRegistry['sidecar.composer.request'].includes('camera location, height, angle, and shot size') && registrySettings.promptRegistry['sidecar.composer.request'].includes('Direct lens gaze is allowed only when the authoritative scene establishes interaction'), 'expected the runtime Sidecar composer prompt to put concrete Scene-Led composition before appearance detail')
const resolvedStoryPrompt = quality.resolveIllustratorStoryPrompt(registrySettings, [{ role: 'assistant', content: 'Prior response' } as any])
assert(resolvedStoryPrompt.includes('[REVERIE RELAY — MODEL-PLACED ILLUSTRATION PROTOCOL]'), 'expected final Story Model prompt to use the registered Model-Placed workflow')
assert(resolvedStoryPrompt.includes('SCENE SNAPSHOT FRAMING'), 'expected selected framing module in final Story Model prompt')
assert(resolvedStoryPrompt.includes('Resolve the camera first: location, height, distance, angle, and shot size') && resolvedStoryPrompt.includes('where every visible subject stands or sits') && resolvedStoryPrompt.includes('Give every visible face a concrete attention target'), 'expected the final Story Model prompt to receive Scene-Led camera, blocking, and gaze direction')
assert(resolvedStoryPrompt.includes('Show the event, not a promotional portrait') && resolvedStoryPrompt.includes('imperfect posture'), 'expected the final Story Model prompt to require physically legible expressions instead of flat portrait affect')
assert(resolvedStoryPrompt.includes('<reverie_illustrator_runtime>') && resolvedStoryPrompt.includes('<aspect_policy>adaptive</aspect_policy>'), 'expected deterministic Adaptive runtime directive in final Story Model prompt')
const blankAdultSettings = { ...registrySettings, promptRegistry: { ...registrySettings.promptRegistry, 'story.adult-content-fidelity': '' } }
const blankAdultPrompt = quality.resolveIllustratorStoryPrompt(blankAdultSettings, [])
assert(!blankAdultPrompt.includes('SEXUAL CONTENT FIDELITY'), 'expected a blank Adult Content Fidelity registry entry to remain blank without hidden fallback')
const objectJob = {
  chatId: 'chat-quality',
  messageId: 'msg-quality',
  swipeId: 0,
  requestId: 'floor-marker',
  target: 'smartphone.message-image' as const,
  count: 1,
  slots: ['message-image'],
  alt: 'Lighting inspection evidence.',
  caption: 'Production team evidence photo.',
  originalSceneBrief: 'A close-up shot of the studio floor markers where the lighting is failing to catch.',
  originalNegativePrompt: '',
  originalRequestXml: '<image_request />',
}
const classification = quality.classifyImageRequest(objectJob)
assert(classification === 'evidence photo', 'expected floor-marker request to classify as evidence photo')
assert(!quality.requestHasVisibleFace(classification), 'expected no visible-face rule for evidence photo')
assert(quality.targetFramingInstruction(objectJob.target, classification).includes('Direct image attachment'), 'expected evidence photo to get direct attachment instruction')
assert(quality.sanitizeRecentVisualContext('OOC integration test: <image_request>old payload</image_request>') === '', 'expected OOC artifacts to be removed')
assert(!quality.sanitizeVisualPreset('young woman, dark hair. System instructions: emit JSON.').includes('System'), 'expected visual preset sanitizer to remove system prose')
const noHumanFloor = quality.targetHumanPolicy(objectJob, classification)
assert(noHumanFloor.targetClass === 'object' && !noHumanFloor.allowHumanPrompt, 'expected floor marker request to be object/no-human')
assert(quality.detectHumanPromptContamination('floor tape markers, dancer shoes, legs in frame').includes('dancer'), 'expected floor marker contamination detector to catch dancer/shoes/legs')

const contaminatedObjectJob = {
  ...objectJob,
  requestId: 'cracked-phone',
  caption: '', alt: '',
  originalSceneBrief: 'A close-up of a cracked phone on a bedroom floor, screen dark, damaged case visible.',
  composedPositivePrompt: '1boy, solo, smiling in the bedroom, holding a phone',
  prosePromptComposition: { expectedPeopleCount: 1, namedSubjects: ['Character A'], peoplePolicy: 'allowed' as const } as any,
}
assert(quality.classifyImageRequest(contaminatedObjectJob) === 'object photo', 'authoritative object request must ignore inherited person composition')
assert(!quality.targetHumanPolicy(contaminatedObjectJob).allowHumanPrompt, 'object request must suppress character/persona injection even when native context is populated')

const emptyBedroomJob = { ...objectJob, requestId: 'empty-bedroom', caption: '', alt: '', originalSceneBrief: 'An empty bedroom at night, untouched bed, soft lamp, no occupant.' }
const emptyBedroomClass = quality.classifyImageRequest(emptyBedroomJob)
const emptyBedroomPolicy = quality.targetHumanPolicy(emptyBedroomJob, emptyBedroomClass)
assert(emptyBedroomClass === 'location/interior' && !emptyBedroomPolicy.allowHumanPrompt, 'expected empty bedroom to classify as no-human location')
assert(quality.detectHumanPromptContamination('empty bedroom, sleeping occupant visible').includes('occupant'), 'expected empty room contamination detector to catch occupant')


const duoIllustrationJob = {
  ...objectJob,
  requestId: 'duo-bedroom-scene',
  target: 'prose.illustration' as const,
  originalSceneBrief: 'Alpha and Character B in a tender embrace on a bed in their bedroom.',
  composedPositivePrompt: 'Medium-close shot of Alpha and Character B looking at each other with visible relief.',
  prosePromptComposition: {
    expectedPeopleCount: 2,
    namedSubjects: ['Alpha', 'Character B'],
    peoplePolicy: 'allowed' as const,
  } as any,
}
const duoClassification = quality.classifyImageRequest(duoIllustrationJob)
const duoPolicy = quality.targetHumanPolicy(duoIllustrationJob, duoClassification)
assert(duoClassification === 'group photo', 'expected explicit Sidecar people evidence to outrank bedroom/location vocabulary')
assert(duoPolicy.allowHumanPrompt && duoPolicy.allowHumanContext, 'expected a named duo illustration to keep human and appearance context')
const repairedDuoNegative = quality.removeConflictingHumanNegatives('bad anatomy, people, person, human, face, portrait, eyes, expression, hands, body, extra limbs')
assert(repairedDuoNegative.negative.includes('bad anatomy') && repairedDuoNegative.negative.includes('extra limbs'), 'expected anatomy negatives to survive human-conflict repair')
assert(!/\b(?:people|person|human|face|portrait|eyes|expression|hands|body)\b/i.test(repairedDuoNegative.negative), 'expected generic person-removal negatives to be stripped from explicit people scenes')
const widescreenDimensions = quality.dimensionsForAspect('16:9')
assert(widescreenDimensions?.width === 1344 && widescreenDimensions?.height === 768, 'expected Swarm-ready concrete dimensions for 16:9')
assert(quality.aspectRatioEquivalent('16:9', '7:4'), 'expected close provider ratios to validate within tolerance')
assert(!quality.aspectRatioEquivalent('16:9', '1:1'), 'expected square output to be flagged against requested 16:9')

const newsScreenshotJob = { ...objectJob, requestId: 'news-article', originalSceneBrief: 'A screenshot of a news article about the school board decision.' }
const newsPolicy = quality.targetHumanPolicy(newsScreenshotJob, quality.classifyImageRequest(newsScreenshotJob))
assert(newsPolicy.targetClass === 'screenshot/article/ui' && !newsPolicy.allowHumanPrompt, 'expected news article screenshot to be direct no-human UI/article content')
assert(quality.detectHumanPromptContamination('phone mockup, hand holding a phone showing article').includes('phone mockup'), 'expected article screenshot contamination detector to catch phone mockup')

const textConversationJob = { ...objectJob, requestId: 'text-conversation', originalSceneBrief: 'A screenshot of a text conversation with blue and grey chat bubbles.' }
const textPolicy = quality.targetHumanPolicy(textConversationJob, quality.classifyImageRequest(textConversationJob))
assert(textPolicy.targetClass === 'screenshot/article/ui' && !textPolicy.allowHumanPrompt, 'expected text conversation screenshot to be direct no-human UI content')
assert(quality.detectHumanPromptContamination('over-the-shoulder view of someone holding a phone').includes('over-the-shoulder'), 'expected conversation screenshot contamination detector to catch over-the-shoulder composition')

assert(!quality.detectPreservedFramingCues(objectJob).includes('handheld phone-camera perspective'), 'expected smartphone.message-image target alone not to imply handheld framing')
const explicitHandheldJob = { ...objectJob, originalSceneBrief: 'A handheld phone-camera snapshot of the studio floor markers.' }
assert(quality.detectPreservedFramingCues(explicitHandheldJob).includes('handheld phone-camera perspective'), 'expected explicit handheld phone-camera text to preserve handheld framing')

const selfieJob = {
  ...objectJob,
  requestId: 'selfie-no-device',
  target: 'kakao.image' as const,
  caption: 'A casual front-camera selfie in the rehearsal room.',
  alt: 'Selfie attachment',
  originalSceneBrief: 'A casual front-facing camera selfie of Character B smiling softly in the rehearsal room.',
}
const repairedSelfiePrompt = quality.finalizeParsedPositivePrompt(
  'Character B smiling softly in the rehearsal room, she is holding her phone up towards the camera lens, displaying a chat screen, front-facing camera viewpoint',
  'selfie',
  selfieJob,
)
assert(!/holding|phone screen|displaying a chat screen|phone visible|mirror selfie/i.test(repairedSelfiePrompt), 'expected shared selfie finalizer to remove unrequested visible-device contamination')
assert(/front-facing camera viewpoint/i.test(repairedSelfiePrompt), 'expected shared selfie finalizer to preserve front-camera viewpoint')

const mirrorSelfieJob = { ...selfieJob, originalSceneBrief: 'A mirror selfie with her phone clearly visible in frame.' }
const permittedMirrorPrompt = quality.finalizeParsedPositivePrompt('Character B taking a mirror selfie, phone visible in frame', 'selfie', mirrorSelfieJob)
assert(/mirror selfie|phone visible/i.test(permittedMirrorPrompt), 'expected explicitly requested visible hardware to remain in a mirror selfie')

const heldPhoneJob = { ...objectJob, requestId: 'held-phone', originalSceneBrief: "A photograph of a phone being held in someone's hand, screen visible." }
const heldPhonePolicy = quality.targetHumanPolicy(heldPhoneJob, quality.classifyImageRequest(heldPhoneJob))
assert(heldPhonePolicy.allowHumanPrompt, 'expected held-phone request to allow hand/person context in the generated image')

const disciplinedPositive = quality.disciplineParsedPositivePrompt(
  'blue and white floor tape, handheld smartphone evidence photo, clear exposure, face expression tags: none, 4k photography style, professional photography',
  classification,
  objectJob,
)
assert(!/face expression tags/i.test(disciplinedPositive), 'expected non-face expression placeholder to be removed')
assert(!/4k photography style|professional photography/i.test(disciplinedPositive), 'expected unrequested generic photography tags to be removed')
const disciplinedNegative = quality.disciplineParserNegativeAdditions(
  'smile, static pose, shiny surface, cluttered background',
  'polished reflective floor markers, handheld smartphone evidence photo, clear exposure',
  classification,
  '',
  '',
)
assert(!disciplinedNegative.negativeAdditions.includes('smile'), 'expected smile negative to be rejected for object evidence')
assert(!disciplinedNegative.negativeAdditions.includes('static pose'), 'expected pose negative to be rejected for object evidence')
assert(!disciplinedNegative.negativeAdditions.includes('shiny surface'), 'expected reflective-surface contradiction to be rejected')

const loraPlan = quality.resolveNativeLoraPlan({
  activeLoraPresetId: 'sample-style',
  loraStrengthScale: 1,
  loraPresets: [{
    id: 'sample-style',
    base_tags: 'sample style, warm tones',
    loras: [
      { lora_name: 'sample-a.safetensors', weight_model: 0.8, weight_clip: 0.7 },
      { lora_name: 'sample-b.safetensors', weight_model: 0.55, weight_clip: 0.5 },
      { lora_name: 'sample-c.safetensors', weight_model: 0.4, weight_clip: 0.4 },
      { lora_name: 'sample-d.safetensors', weight_model: 0.25, weight_clip: 0.2 },
    ],
  }],
})
assert(loraPlan.effectiveLoras.length === 4, 'expected all active native LoRAs to resolve')
assert(loraPlan.baseTags === 'sample style, warm tones', 'expected native LoRA base tags to resolve')
const swarmParameters: Record<string, unknown> = {}
const swarmLoras = quality.applyLorasToProviderParameters('swarmui', swarmParameters, loraPlan.effectiveLoras, {
  id: 'swarm',
  name: 'Swarm',
  provider: 'swarmui',
})
assert(String(swarmParameters.loras).split(',').length === 4, 'expected four LoRAs in final Swarm parameters')
assert(String(swarmParameters.loraWeights).split(',').length === 4, 'expected four LoRA weights in final Swarm parameters')
assert((swarmLoras.sent as Record<string, string>).loras === swarmParameters.loras, 'expected sent LoRA metadata to match final parameters')
assert(!quality.requiresWorkflow({ provider: 'swarmui', connectionName: 'Swarm', connection: { provider: 'swarmui', name: 'Swarm' } } as any), 'expected SwarmUI not to require a ComfyUI workflow')
assert(quality.requiresWorkflow({ provider: 'comfyui', connectionName: 'Comfy', connection: { provider: 'comfyui', name: 'Comfy' } } as any), 'expected actual ComfyUI provider contract to require a workflow')

const subjectPresets = [
  {
    id: 'preset-account_a',
    name: 'Character B',
    kind: 'persona',
    prompt: '1girl, solo, young teen, very long black hair, wispy parted bangs, brown eyes, large eyes, long eyelashes, delicate face, slim cheeks',
    negativePrompt: 'Round cheeks',
  },
  {
    id: 'preset-subjectA',
    name: 'Character A',
    kind: 'character',
    prompt: 'short auburn hair, green school blazer',
    negative_prompt: 'blue hair',
  },
]
const namedSubjects = quality.resolveNamedVisualSubjects(
  'A grainy, slightly out-of-focus photo of Character B and Character A entering the school gates, taken from a distance.',
  subjectPresets,
)
assert(namedSubjects.length === 2, 'expected multiple named subjects to resolve independently')
assert(namedSubjects[0].name === 'Character B' && namedSubjects[0].kind === 'persona', 'expected persona-kind Character B preset to resolve as depicted identity')
assert(namedSubjects[0].prompt.includes('young teen') && namedSubjects[0].prompt.includes('very long black hair'), 'expected exact Character B age and hair identity')
assert(namedSubjects[0].negativePrompt === 'Round cheeks', 'expected Character B subject negative to resolve')
const subjectMacros = quality.resolveVisualPromptMacros('Identity: {{character_prompt}}', {
  characterValue: namedSubjects.map(subject => `${subject.name}: ${subject.prompt}`).join('\n'),
  personaValue: '',
  characterExpected: true,
  personaExpected: false,
})
assert(subjectMacros.resolvedTemplate.includes('Character B: 1girl') && !subjectMacros.resolvedTemplate.includes('{{character_prompt}}'), 'expected character macro to resolve from named subject preset')
assert(subjectMacros.unresolvedMacros.length === 0, 'expected no unresolved character macro for matched Character B')
assert(quality.resolveSubjectNegativeMacros('bad anatomy, {{character_negative_prompt}}', namedSubjects[0].negativePrompt) === 'bad anatomy, Round cheeks', 'expected subject preset negative to resolve into native macro')
assert(quality.sanitizeRecentVisualContext('<ig_app><image_request id="old">Unrelated cafe test</image_request></ig_app>') === '', 'expected unrelated prior social-app artifact to be excluded')
const identityPrompt = quality.enforceVisualSubjectIdentity('A young woman walking through distant school gates.', [namedSubjects[0]])
assert(identityPrompt.includes('young teen') && !identityPrompt.includes('young woman'), 'expected preset age to override parser generalization')
const statefulIdentity = quality.enforceVisualSubjectIdentity('Character B and Character A crying with eyes closed while trembling.', [
  { ...namedSubjects[0], prompt: `${namedSubjects[0].prompt}, soft smirk, gentle expression, relaxed posture` },
  { ...namedSubjects[1], prompt: `1boy, solo, ${namedSubjects[1].prompt}, smiling` },
])
assert(statefulIdentity.includes('2people') && statefulIdentity.includes('female subject Character B:') && statefulIdentity.includes('male subject Character A:'), 'duo identity should use scene cardinality and subject-scoped identities')
assert(!/\b(?:solo|1girl|1boy|soft smirk|relaxed posture|smiling)\b/i.test(statefulIdentity), 'saved cardinality and temporary scene state must be stripped before identity injection')

const optionalSidecarMacros = await quality.resolveSidecarPromptMessages([
  { role: 'system', content: 'Character={{character_prompt}} Persona={{persona_prompt}}' },
], undefined, undefined, { characterPrompt: '', personaPrompt: '' })
assert(optionalSidecarMacros.unresolvedRequiredMacros.length === 0, 'empty optional character/persona prompt macros must resolve without invalidating parser dispatch')
assert(optionalSidecarMacros.messages[0].content === 'Character= Persona=', 'empty optional prompt macros should resolve to empty strings')

const baseTags = 'semi-realistic, anime realism, manhwa style, painterly, soft shading, realistic proportions, detailed face, detailed eyes, cinematic composition, golden hour, rim lighting, shallow depth of field, highly detailed, masterpiece, best quality'
const filteredTags = quality.filterBaseTagsForTarget(baseTags, {
  originalSceneBrief: 'A grainy, slightly out-of-focus anonymous-phone photo of Character B entering the school gates, taken from a distance.',
  caption: 'Candid evidence photo.',
  alt: '',
  target: 'smartphone.message-image',
}, 'person-focused candid')
assert(filteredTags.effectiveBaseTags.includes('manhwa style'), 'expected style-core manhwa tag to remain')
assert(!filteredTags.effectiveBaseTags.includes('detailed face'), 'expected conflicting detailed-face tag to be omitted')
assert(!filteredTags.effectiveBaseTags.includes('cinematic composition'), 'expected conflicting cinematic tag to be omitted')
assert(filteredTags.omitted.length === 9 && filteredTags.omitted.every(item => item.reason), 'expected every omitted base tag to record a reason')
const instagramTags = quality.filterBaseTagsForTarget(baseTags, {
  originalSceneBrief: 'A polished editorial portrait of Character B for an Instagram post.',
  caption: '',
  alt: '',
  target: 'instagram.single',
}, 'character portrait')
assert(instagramTags.effectiveBaseTags === baseTags && instagramTags.omitted.length === 0, 'expected ordinary Instagram imagery to retain full base tags')

const highResEvidence = quality.filterBaseTagsForTarget(baseTags, {
  originalSceneBrief: 'A grainy anonymous-phone photo of Character B entering through the school gates, taken from a distance and partially hidden by the fence.',
  caption: 'Candid evidence capture.',
  alt: '',
  target: 'smartphone.message-image',
}, 'person-focused candid', true)
assert(highResEvidence.effectiveBaseTags.includes('manhwa style'), 'expected high-res evidence mode to retain style core')
assert(highResEvidence.effectiveBaseTags.includes('best quality'), 'expected high-res evidence mode to retain quality polish')
assert(highResEvidence.effectiveBaseTags.includes('polished rendering'), 'expected high-res evidence mode to add polished rendering')
assert(highResEvidence.effectiveBaseTags.includes('identity-consistent features'), 'expected high-res evidence mode to improve identity consistency')
assert(!highResEvidence.effectiveBaseTags.includes('detailed face'), 'expected distant high-res evidence mode not to force face-detail close-up pressure')
assert(!/studio portrait|glamour|close-up/i.test(highResEvidence.effectiveBaseTags), 'expected high-res tags not to override candid framing')
assert(highResEvidence.retainedForHighRes.includes('highly detailed'), 'expected metadata to identify preset tags retained specifically for high-res')
assert(highResEvidence.preservedFramingCues.includes('subject distance'), 'expected high-res metadata to preserve distance cue')
assert(highResEvidence.preservedFramingCues.includes('visible obstruction'), 'expected high-res metadata to preserve obstruction cue')
assert(highResEvidence.preservedFramingCues.includes('requested grain or focus softness'), 'expected high-res metadata to preserve grain cue')

const normalSelfie = quality.filterBaseTagsForTarget(baseTags, {
  originalSceneBrief: 'A casual handheld smartphone selfie of Character B outside school.',
  caption: '',
  alt: '',
  target: 'smartphone.message-image',
}, 'character portrait', false)
const highResSelfie = quality.filterBaseTagsForTarget(baseTags, {
  originalSceneBrief: 'A casual handheld smartphone selfie of Character B outside school.',
  caption: '',
  alt: '',
  target: 'smartphone.message-image',
}, 'character portrait', true)
assert(normalSelfie.effectiveBaseTags === baseTags, 'expected normal selfie to preserve native quality tags')
assert(highResSelfie.effectiveBaseTags.includes('polished rendering') && highResSelfie.effectiveBaseTags.includes('clean anatomy'), 'expected high-res selfie to receive stronger finish and anatomy cues')
assert(highResSelfie.preservedFramingCues.includes('believable selfie framing'), 'expected high-res selfie to preserve selfie framing')
assert(highResSelfie.preservedFramingCues.includes('handheld phone-camera perspective'), 'expected high-res selfie to preserve phone-camera perspective')

const profileDecision = quality.resolvePromptProfileDecision({
  chatId: 'profile-chat',
  target: 'smartphone.message-image',
  originalSceneBrief: 'A close-up photo of the cracked phone screen on the table.',
  caption: '',
  alt: '',
}, {
  ...qualityTestConfig(),
  defaultGenerationProfile: { ...qualityTestConfig().defaultGenerationProfile, defaultPromptProfileId: 'auto' },
} as any)
assert(profileDecision.selectedProfileId === 'object-prop', 'expected Auto profile to classify object-only request as Object / Prop')
const cleanedProfilePrompt = quality.applyPromptProfileToPositivePrompt('detailed face, detailed eyes, glossy hair, cracked phone screen on table', profileDecision)
assert(!/detailed face|detailed eyes|glossy hair/i.test(cleanedProfilePrompt.prompt), 'expected object profile to remove portrait-positive language')
assert(cleanedProfilePrompt.decision.removedPositiveFragments.length >= 3, 'expected removed portrait fragments to be recorded')
assert(!/no\s+unless explicitly requested/i.test(cleanedProfilePrompt.prompt), 'expected object profile additions not to leave an orphaned negative fragment')

const directSurfaceBaseTags = 'semi-realistic, anime realism, manhwa style, painterly, soft shading, delicate facial features, cinematic composition, warm lighting, golden hour, sunlight, backlighting, rim lighting, soft glow, volumetric lighting, dust particles, depth of field, bokeh, shallow depth of field, detailed hair, glossy hair, natural skin texture, soft blush, highly detailed, masterpiece, best quality'
const screenshotBaseTags = quality.filterBaseTagsForTarget(directSurfaceBaseTags, {
  originalSceneBrief: 'A direct digital screenshot of a KakaoTalk conversation interface with blue and white chat bubbles.',
  caption: 'Flat clean UI.',
  alt: '',
  target: 'kakao.image',
}, 'screenshot/article/ui')
assert(screenshotBaseTags.effectiveBaseTags === '', 'expected screenshot/UI requests to bypass inherited LoRA base tags unless explicitly requested')
assert(screenshotBaseTags.omitted.some(item => item.tag === 'manhwa style') && screenshotBaseTags.omitted.some(item => item.tag === 'delicate facial features'), 'expected screenshot/UI metadata to record omitted style and human-appearance base tags')

const documentBaseTags = quality.filterBaseTagsForTarget(directSurfaceBaseTags, {
  originalSceneBrief: 'A close-up photograph of a handwritten cafe receipt on a dark wooden table.',
  caption: 'Expense documentation.',
  alt: '',
  target: 'smartphone.message-image',
}, 'document')
assert(documentBaseTags.effectiveBaseTags === '', 'expected document requests to bypass unrequested LoRA base-tag styling')
const explicitDocumentStyle = quality.filterBaseTagsForTarget('monochrome, high contrast, painterly', {
  originalSceneBrief: 'A high contrast monochrome document scan.',
  caption: '',
  alt: '',
  target: 'smartphone.message-image',
}, 'document')
assert(explicitDocumentStyle.effectiveBaseTags === 'monochrome, high contrast', 'expected direct-surface requests to preserve only explicitly requested base tags')

const framedScreenshot = quality.enforceDirectSurfaceFraming('flat KakaoTalk screenshot, no unless explicitly requested', 'screenshot/article/ui')
assert(framedScreenshot.includes('direct flat 2D screen capture') && framedScreenshot.includes('edge-to-edge interface content') && !framedScreenshot.includes('no unless explicitly requested'), 'expected screenshot finalizer to enforce flat edge-to-edge UI framing and remove malformed fragments')
const framedDocument = quality.enforceDirectSurfaceFraming('handwritten cafe receipt on a wooden table', 'document')
assert(framedDocument.includes('document fills most of the frame') && framedDocument.includes('top-down or near-top-down close-up') && framedDocument.includes('minimal surrounding surface'), 'expected document finalizer to suppress lifestyle staging with page-centered close framing')
const recoveredMarkers = parseRouterMarkers(`
<!-- dreamglass:image chatId="chat-r" messageId="msg-r" swipeId="1" requestId="tw-r" target="twitter.media" slot="media" -->
<tw_media src="/api/v1/images/twitter-image-id" alt="Recovered post"></tw_media>
<ig_media active="1" total="2">
<!-- dreamglass:image chatId="chat-r" messageId="msg-r" swipeId="1" requestId="ig-r" target="instagram.carousel" slot="slide-1" -->
<ig_slide src="/api/v1/images/slide-one" alt="One"></ig_slide>
<!-- dreamglass:image chatId="chat-r" messageId="msg-r" swipeId="1" requestId="ig-r" target="instagram.carousel" slot="slide-2" -->
<ig_slide src="/api/v1/images/slide-two" alt="Two"></ig_slide>
</ig_media>
<!-- dreamglass:image-error chatId="chat-r" messageId="msg-r" swipeId="1" requestId="failed-r" target="kakao.image" slot="image" -->
<image_request_error id="failed-r" target="kakao.image" slot="image" retryable="true">Provider failed</image_request_error>
<!-- dreamglass:image chatId="chat-r" messageId="msg-r" swipeId="1" requestId="broken-r" target="twitter.media" -->
<tw_media src="/api/v1/images/broken"></tw_media>
<!-- reverie-relay:image chatId="chat-r" messageId="msg-r" swipeId="1" requestId="prose-r" target="prose.illustration" slot="prose-image" -->
![reverie-relay](/api/v1/image-gen/results/prose-image-id)
<!-- reverie-relay:image chatId="chat-r" messageId="msg-r" swipeId="1" requestId="legacy-prose-r" slot="legacy-prose-image" -->
![Legacy prose alt](/api/v1/image-gen/results/legacy-prose-image-id)
<!-- reverie-relay:image chatId="chat-r" messageId="msg-r" swipeId="1" requestId="legacy-artifact-r" slot="legacy-artifact-image" -->
<img src="/api/v1/image-gen/results/legacy-artifact-image-id" alt="Legacy artifact" class="reverie-artifact-media" data-dgir-custom-target="custom.artifact-media">
`)
assert(recoveredMarkers.length === 8, 'expected every Router result/error marker to be inspected')
assert(recoveredMarkers[0].valid && recoveredMarkers[0].imageId === 'twitter-image-id', 'expected resolved Twitter marker URL and image ID recovery')
assert(recoveredMarkers.filter(marker => marker.requestId === 'ig-r' && marker.valid).length === 2, 'expected both Instagram carousel slides to recover independently')
assert(recoveredMarkers[3].kind === 'failed' && recoveredMarkers[3].error === 'Provider failed', 'expected failed marker error recovery')
assert(!recoveredMarkers[4].valid && recoveredMarkers[4].reason?.includes('slot'), 'expected malformed marker to be reported without registration')
assert(recoveredMarkers[5].valid && recoveredMarkers[5].target === 'prose.illustration' && recoveredMarkers[5].imageId === 'prose-image-id', 'expected current prose Markdown result recovery')
assert(recoveredMarkers[6].valid && recoveredMarkers[6].target === 'prose.illustration' && recoveredMarkers[6].alt === 'Legacy prose alt', 'expected unambiguous legacy Markdown result target and alt recovery')
assert(recoveredMarkers[7].valid && recoveredMarkers[7].target === 'custom.artifact-media' && recoveredMarkers[7].imageId === 'legacy-artifact-image-id', 'expected legacy artifact target recovery from its owned result wrapper')
assert(slotKey({ chatId: 'chat-r', messageId: 'msg-r', swipeId: 1, requestId: 'ig-r', slot: 'slide-2' }) === 'chat-r:msg-r:1:ig-r:slide-2', 'expected recovered slots to use stable identity')

const activeOnly = selectRescanSwipeRows({ content: 'fallback', swipe_id: 1, swipes: ['inactive marker', 'active marker'] }, false)
assert(activeOnly.length === 1 && activeOnly[0].swipeId === 1 && !activeOnly[0].inactive, 'expected default rescan to inspect only the active swipe')
const allSwipes = selectRescanSwipeRows({ content: 'fallback', swipe_id: 1, swipes: ['inactive marker', 'active marker'] }, true)
assert(allSwipes.length === 2 && allSwipes[0].inactive && !allSwipes[1].inactive, 'expected advanced rescan to label inactive swipes')

const stable = 'chat-r:msg-r:1:tw-r:media'
const completedDuringScan = { key: stable, status: 'completed', imageUrl: '/new', attempts: 3, updatedAt: 99 }
const latestState: Record<string, typeof completedDuringScan> = { [stable]: completedDuringScan }
const staleDiscovery = { key: stable, status: 'recovered-pending', imageUrl: '', attempts: 0, updatedAt: 1 }
const mergeOne = mergeMissingSlotRecords(latestState, [staleDiscovery])
assert(mergeOne.added.length === 0 && mergeOne.skipped.length === 1, 'expected rescan merge to skip a slot completed during scanning')
assert(latestState[stable] === completedDuringScan && latestState[stable].attempts === 3 && latestState[stable].imageUrl === '/new', 'expected latest completion state to remain byte-for-byte owned by the latest record')
const beforeTimestamp = latestState[stable].updatedAt
const mergeTwo = mergeMissingSlotRecords(latestState, [staleDiscovery])
assert(mergeTwo.added.length === 0 && Object.keys(latestState).length === 1 && latestState[stable].updatedAt === beforeTimestamp, 'expected repeated rescan merge to be idempotent')

const replacementResult = { ...carouselResults[0], imageId: 'image-1-new', imageUrl: '/api/v1/image-gen/results/image-1-new' }
const replacedSlide = replaceResolvedSlotAfterComment(carouselMarkup, carouselJob, replacementResult)
assert(Boolean(replacedSlide), 'expected exact resolved carousel marker replacement')
assert(replacedSlide!.includes('image-1-new'), 'expected selected carousel slide URL to change')
assert(replacedSlide!.includes('/api/v1/image-gen/results/image-2'), 'expected sibling carousel slide URL to remain unchanged')
assert((replacedSlide!.match(/slot="slide-1"/g) || []).length === 1, 'expected replacement not to duplicate the selected marker')

const twitterJob = {
  ...carouselJob,
  requestId: 'tw-wrapper-guard',
  target: 'twitter.media' as const,
  count: 1,
  slots: ['media'],
}
const twitterResult = { ...carouselResults[0], slot: 'media' }
const misplacedTwitterMarker = `${renderResolvedMarkup(twitterJob, [twitterResult]).replace('\n<tw_media', '\n<tw_post><tw_media')}</tw_post>`
const guardedTwitterReplacement = replaceResolvedSlotAfterComment(misplacedTwitterMarker, twitterJob, {
  ...twitterResult,
  imageId: 'twitter-new',
  imageUrl: '/api/v1/image-gen/results/twitter-new',
})
assert(guardedTwitterReplacement === null, 'expected a marker outside the Twitter wrapper not to consume nested media markup')
assert(misplacedTwitterMarker.includes('<tw_post>') && misplacedTwitterMarker.includes('</tw_post>'), 'expected the wrapper-guard fixture to remain structurally complete')

const backendSource = await readFile(new URL('../src/backend.ts', import.meta.url), 'utf8')
const frontendSource = await readFile(new URL('../src/frontend.ts', import.meta.url), 'utf8')
const buildSource = await readFile(new URL('../src/build.ts', import.meta.url), 'utf8')
const protocolsSource = await readFile(new URL('../src/protocols.ts', import.meta.url), 'utf8')
const contractsSource = await readFile(new URL('../src/contracts.ts', import.meta.url), 'utf8')
const r45CatalogSource = await readFile(new URL('../src/r45SurfaceCatalog.ts', import.meta.url), 'utf8')
const r45UtilitySource = await readFile(new URL('../src/r45UtilityContracts.ts', import.meta.url), 'utf8')
const manifest = JSON.parse(await readFile(new URL('../spindle.json', import.meta.url), 'utf8')) as { version?: string; permissions?: string[] }
assert(backendSource.includes('relay_batch_start') && backendSource.includes('relay_replace_selected'), 'expected backend Relay batch message handlers')
assert(backendSource.includes('candidateBatches') && backendSource.includes('replaceResolvedSlotAfterComment'), 'expected persistent candidate state and exact slot replacement')
assert(backendSource.includes('registerInterceptor') && backendSource.includes('sanitizeRelayPromptMessage'), 'expected Relay prompt-history interceptor')
assert(manifest.permissions?.includes('interceptor') && manifest.permissions?.includes('ui_panels') && !manifest.permissions?.includes('app_manipulation'), 'expected minimal Relay permissions without unused host-app control')

const versionMatch = buildSource.match(/EXTENSION_VERSION = '([^']+)'/)
const buildIdMatch = buildSource.match(/BUILD_ID = '([^']+)'/)
assert(versionMatch?.[1] === manifest.version && /^\d{8}-0\.2\.1$/i.test(buildIdMatch?.[1] || ''), 'expected shared current release identity')
assert(backendSource.includes('STATE_SCHEMA_VERSION = 34'), 'expected state schema 34')

assert(frontendSource.includes("type SuiteSection = 'relay' | 'illustrator' | 'surfaces' | 'memory' | 'archive' | 'settings'"), 'expected six-part Surface Suite navigation')
assert(frontendSource.includes('dg-suite-primary') && frontendSource.includes('dg-suite-secondary') && frontendSource.includes('Current Chat Overview'), 'expected clean hierarchical workspace')
assert(frontendSource.includes("['slots', 'Slots']") && frontendSource.includes("['illustrator', 'Illustrations']") && frontendSource.includes("['surface-library', 'Library']") && frontendSource.includes("['surfaces', 'Creator']") && frontendSource.includes("['surface-presets', 'Presets']") && frontendSource.includes("['utility-studio', 'Injection']") && frontendSource.includes("['genetics', 'Appearance Memory']") && frontendSource.includes("['history', 'Images & Versions']") && frontendSource.includes("['settings', 'Configuration']"), 'expected components to live in their intended suite sections')
assert(frontendSource.includes('dg-section-title::before') && frontendSource.includes('dg-section-title::after') && frontendSource.includes('dg-surface-grid'), 'expected LumiBooks-inspired hierarchy without copying its exact UI')

assert(frontendSource.includes("button('Remove From Message'") && frontendSource.includes('confirmRemoveImageFromMessage(record'), 'expected visible remove-image-from-message action in image controls')
assert(frontendSource.includes('const hasOwnedMessageImage = Boolean(') && frontendSource.includes("!actions.some(([label]) => label === 'Remove Image From Message')"), 'expected context-menu removal for every owned image, including model-placed prose illustrations')
assert(contractsSource.includes("record.target === 'prose.illustration'") && contractsSource.includes("tail.match(/^\\s*!\\[reverie-relay\\]"), 'expected exact adjacent prose-image removal without consuming following narrative')
assert(backendSource.includes("if (next === null) throw new Error('Could not find slot markup in message.')"), 'expected empty-message-safe image removal')
assert(frontendSource.includes('Open Surface Library') && frontendSource.includes("id: 'open-reverie-surfaces'"), 'expected Surface Library input action instead of Illustrator')
assert(!frontendSource.includes("if (value === 'image-lab') return 'illustrator'"), 'expected retired direct-lab tab migration to be removed')
assert(!frontendSource.includes('Illustrator was retired in an earlier release'), 'user-facing retired-release wording must stay removed')
assert(!frontendSource.includes("id: 'open-image-lab'"), 'expected no new Illustrator command registration')
assert(!frontendSource.includes('Enable Illustrator Widget'), 'expected Illustrator widget control removed from visible settings')

assert(backendSource.includes('function builtInSurfaceDefinitions') && backendSource.includes('FINAL R4.5 Surface inventory drift'), 'expected protected 46-Surface R4.5 built-in registry')
assert(frontendSource.includes('custom.artifact-media') && frontendSource.includes('Copy Bracket Example'), 'expected authored bracket Surface artifact-media bridge reference')
for (const surfaceId of ['album-cover', 'magazine-cover', 'photo-booth-strip', 'polaroid', 'youtube-thumbnail', 'newspaper']) {
  assert(r45CatalogSource.includes(`id: '${surfaceId}'`) || r45UtilitySource.includes(`'${surfaceId}'`), `expected built-in ${surfaceId} surface`)
}
assert(frontendSource.includes('Surface Presets') && frontendSource.includes('Relay Rendering') && frontendSource.includes('Regex Rendering') && frontendSource.includes('Edit as Preset'), 'expected Surface Presets studio')
assert(contractsSource.includes("export type SurfaceRendererMode = 'relay' | 'legacy-regex' | 'hybrid'") && frontendSource.includes("{ id: 'relay', label: 'Relay Rendered'") && frontendSource.includes("{ id: 'legacy-regex', label: 'Regex Rendered'") && frontendSource.includes("{ id: 'hybrid', label: 'Hybrid'") && !frontendSource.includes("['auto', 'Auto · Native when supported']"), 'expected Relay Rendered, Regex Rendered, and Hybrid renderer buttons')
assert(frontendSource.includes('Surface Library') && frontendSource.includes('Only surfaces switched on here are included') && frontendSource.includes('set_prompt_enabled'), 'expected categorized prompt-surface toggles')
assert(frontendSource.includes('Utility Studio') && frontendSource.includes('Injection Position') && frontendSource.includes('Save Utility Template') && frontendSource.includes('Save Surface Module'), 'expected editable Utility Studio and injection position controls')
assert(backendSource.includes("name: 'reverie_surfaces'") && backendSource.includes('<reverie_surfaces_macro/>') && backendSource.includes("name: 'reverie_illustrator'") && backendSource.includes("name: 'reverie_all'") && backendSource.includes('buildEnabledSurfaceUtility'), 'expected dynamic enabled-surface macro expansion')
assert(backendSource.includes("utilityInjectionPosition: 'after-chat-history'") && backendSource.includes('insertPromptDirective'), 'expected configurable prompt placement with after-history default')
assert(backendSource.includes('registerMessageContentProcessor') && backendSource.includes("context.origin !== 'render'") && backendSource.includes('renderNativeSurfaceMarkup(renderedContent') && backendSource.includes('rendererMode: snapshot.studio.rendererMode') && frontendSource.includes('registerTagInterceptor.call') && frontendSource.includes('removeFromMessage: false') && !frontendSource.includes('messages.renderWidget') && !frontendSource.includes('removeFromMessage: true'), 'expected one render-origin pipeline with non-destructive lifecycle discovery in every renderer mode')
const renderTagDetectorSource = backendSource.slice(backendSource.indexOf('const NATIVE_RENDER_TAG_RE'), backendSource.indexOf('const registerMessageContentProcessor'))
assert(renderTagDetectorSource.includes('(?=[\\\\s>\\\\]])') && !renderTagDetectorSource.includes('\b'), 'render-time root detector must use an escaped tag boundary, never a backspace character')
assert(backendSource.includes('Built-in surface presets are protected') && backendSource.includes('Built-in surface presets cannot be deleted'), 'expected protected built-in presets')
assert(backendSource.includes('customSurfaces') && backendSource.includes('validateCustomSurfaceDefinition') && backendSource.includes('custom_surface_action'), 'expected custom surface validation and actions')

for (const macro of ['reverie_illustration_protocol', 'reverie_artifact_media_protocol', 'reverie_surface_protocol']) {
  assert(backendSource.includes(`name: '${macro}'`), `expected ${macro} macro`)
}
assert(backendSource.includes('REVERIE_ILLUSTRATION_PROTOCOL') && backendSource.includes('buildIllustratorRuntimeDirective'), 'expected macros to expand to full protocols plus runtime configuration')
assert(protocolsSource.includes('<reverie_illustrator_runtime>') && protocolsSource.includes('<target_count>') && backendSource.includes("registryPrompt(settings, 'story.runtime-directives')"), 'expected active Illustrator settings to be injected through the visible Prompt Registry')
assert(backendSource.includes('registerMessageContentProcessor.call') && backendSource.includes('rendererMode: snapshot.studio.rendererMode') && backendSource.includes('renderNativeSurfaceMarkup(renderedContent'), 'expected renderer-mode-aware single message processor')
assert(frontendSource.includes('data-rrn-action') && frontendSource.includes('native_surface_action'), 'expected native request-card actions')
assert(frontendSource.includes('rrnLiveStatus') && frontendSource.includes('Generating image…'), 'expected live inline request status binding')
assert(protocolsSource.includes('reverie_enabled_surface_modules'), 'expected modular enabled-surface utility template')
assert(protocolsSource.includes('MODEL-PLACED ILLUSTRATION PROTOCOL') && protocolsSource.includes('<reverie-illustration') && protocolsSource.includes('<visual_prompt>') && protocolsSource.includes('request="generate"'), 'expected complete model-authored Illustrator protocol')
assert(backendSource.includes('containsRelayRequestMarkup') && backendSource.includes('reverie-illustration'), 'expected scans to accept both surface and prose request protocols')

assert(frontendSource.includes('Prose Illustrator') && frontendSource.includes('prose_illustrator_action') && frontendSource.includes('Copy Preset Prompt'), 'expected Prose Illustrator controls and backend bridge')
assert(backendSource.includes('proseIllustrator') && backendSource.includes('generateProseIllustrationPlan') && backendSource.includes('renderProsePendingMarker'), 'expected independent Illustrator state and generation workflow')
assert(protocolsSource.includes('Sidecar Opportunity Discovery') && backendSource.includes('selectProseOpportunity') && backendSource.includes('composePromptForOpportunity'), 'expected bounded beat analysis and prompt composition through the Prompt Registry')
assert(frontendSource.includes('Relay-Planned') && frontendSource.includes('Model-Placed') && frontendSource.includes('Illustrations per Response'), 'expected clear Illustrator modes and settings')
assert(frontendSource.includes("mode: 'model-placed'") || frontendSource.includes("mode === 'model-placed'"), 'expected Model-Placed Illustrator path')
assert(backendSource.includes('isHandsOffProseMode') && backendSource.includes('runJob(jobFromRecord(autoRecord)'), 'expected Relay-Planned to generate directly')
assert(frontendSource.includes("'Prompt Profile',") && frontendSource.includes('config?.promptProfiles') && !frontendSource.includes("textInput('Prompt Profile', settings.defaultPromptProfileId"), 'expected Illustrator Prompt Profile dropdown')

assert(backendSource.includes('purgeOwnedMessageState') && backendSource.includes('sourceDeletedAt') && backendSource.includes('image retained in Relay History'), 'expected deleted-message cleanup to archive completed images first')
assert(frontendSource.includes("['deleted-message-images', 'Deleted Message Images']"), 'expected deleted-message image archive UI')
assert(backendSource.includes('assetLibrary') && backendSource.includes('versionTrees') && backendSource.includes('reuse_asset_in_slot'), 'expected persistent media archive and version trees')
assert(frontendSource.includes('Slot Version History') && frontendSource.includes('Compare Assets'), 'expected archive reuse and comparison UI')

assert(frontendSource.includes('Appearance Sidecar') && frontendSource.includes('Stable Appearance') && frontendSource.includes('Current Outfit') && !frontendSource.includes('Scan Selected Character'), 'expected automatic editable Appearance Memory controls without manual scanning')
assert(backendSource.includes('continuityVault') && backendSource.includes('selectContinuityForJob') && backendSource.includes('continuity_action'), 'expected backend visual continuity state')
const vaultUrl = new URL('../src/vault.ts', import.meta.url)
const vaultSource = await readFile(vaultUrl, 'utf8')
assert(vaultSource.includes('INVALID_SUBJECTS') && vaultSource.includes('generated-prompt'), 'expected Vault subject validation')

assert(backendSource.includes('Confirmed ImageTable asset') && backendSource.includes('uploadFromDataUrl'), 'expected ImageTable persistence verification and fallback upload')
assert(backendSource.includes('isMeaningfulAutomaticPrompt') && frontendSource.includes('nativeAutoGenerationGuard'), 'expected ghost-generation guards')
assert(backendSource.includes('generateWithOptionalStream') && backendSource.includes('generateStream') && backendSource.includes('image_generation_stream'), 'expected shared streaming generation helper')
assert(frontendSource.includes('onRegexArtifactImageClick') && frontendSource.includes('event.composedPath()'), 'expected update-safe Regex Artifact image click bridge')
assert(frontendSource.includes("const relayImageSelector = 'img[data-dgir-key], img[data-dgir-image-id], img[data-dgir-request-id]'") && frontendSource.includes('recordForImage'), 'expected exact image context-menu lookup')

assert(frontendSource.includes('Slot Workflow') && frontendSource.includes('Preview Prompt') && frontendSource.includes('Preview Image'), 'expected explicit slot workflows')
assert(frontendSource.includes('autoResumeRecoveredSignatures') && backendSource.includes('reparseChatSlots'), 'expected recovery and reparse support')
assert(frontendSource.includes('Concurrent Image Jobs') && backendSource.includes('runWithConcurrency'), 'expected bounded analysis concurrency with serialized provider generation')
assert(frontendSource.includes('Dry Run') && backendSource.includes('dryRunReportFromPlan') && backendSource.includes('explain_no_generation'), 'expected Dry Run and blocker diagnostics')
assert(!frontendSource.includes("button('Beginner Mode'") && !frontendSource.includes("button('Expert Mode'") && frontendSource.includes("panelSection('Core Settings'"), 'expected one unified settings interface without beginner/expert gating')
assert(frontendSource.includes('tutorialModeEnabled') && frontendSource.includes('Quick Start Overview'), 'expected first-run Quick Start Overview')
assert(frontendSource.includes('patchConfig({ tutorialModeEnabled: false, tutorialStep: 0 })') && frontendSource.includes("button('Open Quick Start Overview', openQuickStartOverview"), 'expected one-time Quick Start persistence with an explicit manual reopen action')
assert(frontendSource.includes('.dg-router-panel.dg-help-portal::before { content:none!important; display:none!important; }'), 'expected help portal to suppress the full-panel Velvet Prism decoration')
assert(!frontendSource.includes('Scene Sequence / Storyboard') && !backendSource.includes("type: 'storyboard_action'"), 'expected removed storyboard mode to stay absent')
assert(frontendSource.includes('message.revision < stateRevision'), 'expected stale frontend state rejection')
assert(!frontendSource.includes("ctx.events.on('GENERATION_ENDED'"), 'expected backend-only generation discovery')
assert(frontendSource.includes('dg-thumb-streaming::before') && frontendSource.includes('display: none !important'), 'expected stable streaming preview frame')

console.log('smoke ok')

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function qualityTestConfig(): any {
  return {
    defaultPromptProfileId: 'auto',
    promptProfiles: quality.BUILT_IN_PROMPT_PROFILES,
    chatGenerationProfiles: {},
    defaultGenerationProfile: {
      defaultPromptProfileId: 'auto',
      defaultCandidateCount: 1,
      automationEnabled: true,
      continuityStrength: 'medium',
      preferredSocialImageBehavior: 'native',
      suppressPeopleForObjects: true,
      defaultNegativeAdditions: '',
      defaultAspectPreference: 'request',
    },
  }
}
