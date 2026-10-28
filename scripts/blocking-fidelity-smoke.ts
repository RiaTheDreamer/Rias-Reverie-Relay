// @ts-nocheck -- Bun test harness, no host or provider calls.
import assert from 'node:assert/strict'
import { compileRelayPlannedPrompt, validateRelayPlannedDirectorResult, RELAY_PLANNED_V2, type RelayPlannedContext, type RelayPlannedIllustration } from '../src/relayPlannedV2'
import { DEFAULT_ILLUSTRATOR_FRAMING_PROMPTS, PROSE_ILLUSTRATOR_PERSPECTIVE_MODE_ALIASES } from '../src/protocols'
import { blockingFidelityDetail, blockingFidelityDetailPresent, restoreBlockingFidelityParagraphs } from '../src/blockingFidelity'

assert.equal(blockingFidelityDetail('knee_length_hair'), 'knee length hair')
assert(blockingFidelityDetailPresent('He sits upright on a dining chair.', 'sitting upright on a dining chair'))
assert(blockingFidelityDetailPresent("She rests her left palm on Nolan's left shoulder.", "her left palm resting on Nolan's left shoulder"))
assert(!blockingFidelityDetailPresent("She rests her right palm on Nolan's right shoulder.", "her left palm resting on Nolan's left shoulder"), 'anatomical sides are not interchangeable')
assert(!blockingFidelityDetailPresent("She rests her left palm on Mira's left shoulder.", "her left palm resting on Nolan's left shoulder"), 'contact targets are not interchangeable')
assert(!blockingFidelityDetailPresent('He is not sitting upright on a dining chair.', 'sitting upright on a dining chair'), 'negative posture cannot satisfy a positive requirement')
assert(!blockingFidelityDetailPresent('He is visiting the room.', 'sitting'), 'substring overlap cannot satisfy a posture')

assert.equal(restoreBlockingFidelityParagraphs('Mira seated. Nolan standing.', 'Mira seated.\n\nNolan standing.'), 'Mira seated.\n\nNolan standing.')
assert.equal(restoreBlockingFidelityParagraphs('Mira seated. Nolan outside.', 'Mira seated.\n\nNolan standing.'), 'Mira seated. Nolan outside.', 'never undo a parser or safety correction')

assert.equal(PROSE_ILLUSTRATOR_PERSPECTIVE_MODE_ALIASES['blocking-fidelity'], 'blocking-fidelity')
assert.match(DEFAULT_ILLUSTRATOR_FRAMING_PROMPTS['blocking-fidelity'], /preserve.*contact|preserve.*gaps/is)
let cases = 0
for (const count of [1, 2, 3]) for (const tags of [false, true]) {
  const subjects = ['Mira', 'Nolan', 'Sora'].slice(0, count)
  const positions = ['Screen-left', count === 2 ? 'Behind' : 'Screen-right', 'Background']
  const identities = ['long black hair', 'short brown hair', 'silver hair']
  const clothes = ['blue cardigan', 'green jacket', 'yellow sweater']
  const poses = ['seated on a chair with both hands on her own thighs', 'standing behind the chair with his right palm on Mira\'s right shoulder', 'standing by the doorway with both hands lowered']
  const context: RelayPlannedContext = {
    version: RELAY_PLANNED_V2, chatId: 'local', messageId: 'source', swipeId: 0,
    maximumIllustrations: 1, maximumCharacters: count, maximumPromptCharacters: 6000,
    perspectiveMode: 'blocking-fidelity', promptFormat: tags ? 'danbooru-tags' : 'natural-language',
    defaultAspectRatio: '4:3', promptStyle: '', adultMode: false,
    paragraphs: [{ index: 0, text: subjects.map((name, i) => `${name} is ${poses[i]}.`).join(' ') }],
    subjects: subjects.map((name, i) => ({ name, identity: [identities[i]], current: [clothes[i]], pinned: [], superseded: [] })),
    referenceAssetIds: [], locationReferenceAssetIds: [], priorIllustrations: [], globalNegativeRequirements: [],
  }
  const shot: RelayPlannedIllustration = {
    rank: 1, title: 'Ownership test', reason: 'Source-grounded still',
    anchor: { paragraphIndex: 0, insertionSide: 'after', anchorExcerpt: context.paragraphs[0].text },
    aspectRatio: '4:3', expectedPeopleCount: count, namedSubjects: subjects, omittedSubjects: [],
    subjectDirectives: subjects.map((name, i) => ({ name, role: 'character', appearanceOverrides: [], attireOverrides: [], temporaryTraits: [],
      expression: '', pose: poses[i], action: '', gaze: '', contact: '', blocking: positions[i],
      booruTags: [i === 1 ? '1boy' : '1girl', identities[i].replaceAll(' ', '_'), clothes[i].replaceAll(' ', '_'), i ? 'standing' : 'sitting'],
    })),
    composition: { shotType: 'medium view', cameraAngle: 'eye level', framing: '', blocking: '', foreground: '', background: '', location: 'quiet room', timeOfDay: '', lighting: 'daylight', mood: '', importantProps: [], backgroundPeople: '' },
    promptCore: subjects.map((name, i) => `${positions[i]}, ${name}: ${poses[i]}.`).join('\n\n'),
    booruTags: ['indoors', 'daylight'], negativeCore: '', referenceAssetIds: [], locationReferenceAssetIds: [],
  }
  const prompt = compileRelayPlannedPrompt(shot, context, { tagMode: tags }).positivePrompt
  if (!tags && count === 2) {
    const relativeHeading = compileRelayPlannedPrompt({ ...shot, promptCore: shot.promptCore.replace('Behind, Nolan:', 'Behind her, Nolan:') }, context, { tagMode: false }).positivePrompt
    assert.equal(relativeHeading.split('Nolan:').length - 1, 1, 'bounded relative depth heading must not create a second owner tail')
    assert(!relativeHeading.includes('Spatial blocking:'), 'all recognized owner blocks suppress the detached layout retelling')
    assert(!relativeHeading.includes('black_hair'), 'fallback details remain readable Natural Language')
  }
  const normalized = validateRelayPlannedDirectorResult(JSON.stringify({ shouldIllustrate: true, reason: 'fixture', illustrations: [shot] }), context).illustrations[0]
  assert(!normalized.rejected, 'ordinary one/two/three-subject plans remain eligible')
  if (!tags && count > 1) assert(normalized.illustration.promptCore.includes('\n\n'), 'Director-result normalization preserves owner paragraphs too')
  if (!tags) {
    for (const [i, name] of subjects.entries()) {
      assert.equal(prompt.split(`${name}:`).length - 1, 1, `one enriched owner paragraph per ${name}, not a second detached tail`)
      const block = prompt.slice(prompt.indexOf(`${positions[i]}, ${name}:`), i + 1 < count ? prompt.indexOf(`${positions[i + 1]}, ${subjects[i + 1]}:`) : undefined)
      for (const detail of [identities[i], clothes[i], poses[i]]) assert(block.includes(detail), `${name} owns ${detail}`)
      for (const [other, outfit] of clothes.entries()) if (other !== i) assert(!block.includes(outfit), 'another owner outfit cannot migrate')
    }
    if (count > 1) assert(prompt.includes('\n\n'), 'paragraph boundaries survive compiler enrichment')
    assert(!prompt.includes('Spatial blocking:'), 'complete owner blocks are not followed by a second actor-layout retelling')
  } else {
    const list = prompt.split(/,\s*/)
    assert.equal(list.filter(tag => tag === '1girl').length, count === 3 ? 2 : 1, 'same-gender owner markers survive')
    assert(!prompt.includes('Screen-left, Mira:'), 'prose owner headings stay out of tag output')
  }
  if (!tags && count === 2) {
    const inflected = structuredClone(shot)
    inflected.promptCore = inflected.promptCore.replace('standing behind', 'stands behind')
    inflected.subjectDirectives[1].pose = "standing behind the chair with his right palm on Mira's right shoulder"
    const result = compileRelayPlannedPrompt(inflected, context).positivePrompt
    assert.equal(result.match(/behind the chair with his right palm/g)?.length, 1, 'verb inflection must not repeat an already owned pose')
    context.subjects[1].identity.push('broad_shoulders')
    const readable = compileRelayPlannedPrompt(inflected, context).positivePrompt
    assert(readable.includes('broad shoulders') && !readable.includes('broad_shoulders'), 'stored visual tags are readable only at the Natural Language boundary')
  }
  assert(!prompt.includes('BLOCKING FIDELITY'), 'planning contract is not painted into the provider prompt')
  cases++
}
console.log(`Blocking Fidelity passed: ${cases} one/two/three-subject compiler cases, owned appearance/outfits/posture, paragraph and tag-marker preservation. No provider calls.`)
