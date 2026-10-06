// @ts-nocheck -- Bun smoke harness exercises bundled prompts and renderer output.
import assert from 'node:assert/strict'
import { buildNarrativeUtilityPrompt } from '../src/narrativeDlcRuntime'
import { NARRATIVE_REGEX_VARIANTS, containsNarrativeRegexMarkup, renderNarrativeRegex } from '../src/narrativeRegexAssets'
import { parseImageRequests } from '../src/contracts'
import { PERSONA_WARDROBE_UTILITY_PROMPT } from '../src/personaWardrobe'
import { surfaceIconMarkup } from '../src/surfaceIcons'

const requests = Array.from({ length: 5 }, (_, index) => `<image_request id="wardrobe-test-${index + 1}" target="custom.artifact-media" slot="wardrobe-test-${index + 1}" aspect="3:4" alt="Look ${index + 1}"><scene_brief>Full fashion outfit on a mannequin. No text or interface.</scene_brief></image_request>`)
const option = (index: number, media = requests[index]) => `[outfit_option][id]look-${index + 1}[/id][name]Look ${index + 1}[/name][style_tags]elegant, distinct, polished[/style_tags][occasion_fit]Event ${index + 1}[/occasion_fit][color_story]rose and black[/color_story][summary]A distinct coordinated look ${index + 1}.[/summary][pieces][top]Silk top ${index + 1}[/top][shoes]Leather heels[/shoes][/pieces][wear_text]{{user}} is wearing silk top ${index + 1} and leather heels.[/wear_text][media]${media}[/media][/outfit_option]`
const payload = (media: string[] = requests) => `[persona_wardrobe][title]Persona Wardrobe[/title][subtitle]Five looks for tonight[/subtitle][wardrobe_context][character]{{user}}[/character][occasion]Dinner[/occasion][season]Autumn[/season][location]Seoul[/location][style_note]Distinct, grounded options[/style_note][/wardrobe_context]${media.map((value, index) => option(index, value)).join('')}[/persona_wardrobe]`

assert(containsNarrativeRegexMarkup(payload()), 'Wardrobe owner must enter the Narrative rendering path')
assert.equal(parseImageRequests(payload()).length, 5, 'Five native image requests must remain parseable')
assert(PERSONA_WARDROBE_UTILITY_PROMPT.includes('exactly five') && PERSONA_WARDROBE_UTILITY_PROMPT.includes('target="custom.artifact-media"') && PERSONA_WARDROBE_UTILITY_PROMPT.includes('aspect="3:4"'), 'Story Model contract lost five-look or media ownership rules')
assert(!PERSONA_WARDROBE_UTILITY_PROMPT.includes('[buttons]') || PERSONA_WARDROBE_UTILITY_PROMPT.includes('Do not emit [buttons]'), 'Renderer-only controls entered the authored example')

for (const variant of NARRATIVE_REGEX_VARIANTS) {
  const rendered = renderNarrativeRegex(payload(), variant, `wardrobe-${variant}`)
  assert(!rendered.includes('[persona_wardrobe]'), `${variant}: owner stayed raw`)
  assert.equal((rendered.match(/class="pw-panel pw-panel-/g) || []).length, 5, `${variant}: five-look rail lost a panel`)
  assert.equal((rendered.match(/data-rrn-action="wardrobe-wear"/g) || []).length, 5, `${variant}: Wear button missing or duplicated`)
  assert.equal((rendered.match(/class="pw-radio"[^>]*checked/g) || []).length, 1, `${variant}: active look is not unique`)
  assert(rendered.includes(`data-pw-variant="${variant}"`), `${variant}: presentation selection did not reach the wardrobe`)
  assert(rendered.includes('<!-- UI_START -->') && rendered.includes('<!-- UI_END -->') && rendered.indexOf('<style data-reverie-persona-wardrobe') > rendered.indexOf('<!-- UI_START -->'), `${variant}: CSS escaped UI ownership`)
  assert(rendered.includes('data-rr-surface-icon="narrative:Persona Wardrobe"'), `${variant}: wardrobe SVG missing`)
  assert(rendered.includes('Silk top 5') && rendered.includes('Leather heels'), `${variant}: garment details or final wear_text lost`)
  assert.equal((rendered.match(/<image_request\b/g) || []).length, 5, `${variant}: raw media was not kept opaque`)
  assert.equal(/<details class="pw-wardrobe[^"]*rr-surface-presentation-inline"/.test(rendered), variant === 'inline', `${variant}: inline shell authority drifted`)
}

for (const [state, media] of [
  ['preparing', '<div class="rm-card"><span>Preparing image</span></div>'],
  ['completed', '<img src="/api/v1/image-gen/results/test" alt="Completed look">'],
  ['failed', '<image_request_error>Provider failed</image_request_error>'],
] as const) {
  const rendered = renderNarrativeRegex(payload([media, ...requests.slice(1)]), 'plain-button', `wardrobe-${state}`)
  assert(rendered.includes(media) && !rendered.includes('[persona_wardrobe]'), `${state}: transformed media broke five-look rendering`)
}

for (const variant of NARRATIVE_REGEX_VARIANTS) {
  const textOnly = renderNarrativeRegex(payload(Array(5).fill('')), variant, `wardrobe-text-${variant}`)
  assert(!textOnly.includes('[persona_wardrobe]') && !/<(?:image_request|reverie-illustration)\b/i.test(textOnly), `${variant}: text-only wardrobe failed to consume its owner or leaked a Relay image request`)
  assert.equal((textOnly.match(/pw-look-text-only/g) || []).length, 6, `${variant}: text-only wardrobe must not paint five empty image frames`)
  assert(!textOnly.includes('class="pw-mirror"'), `${variant}: text-only wardrobe kept an empty media frame`)
}
const imagesOff = buildNarrativeUtilityPrompt(['Persona Wardrobe', 'Relationship Map', 'Cast Sheet'], {}, { 'Persona Wardrobe': false, 'Relationship Map': false, 'Cast Sheet': false })
assert.equal(imagesOff.utilityNames.length, 3)
assert(!imagesOff.content.includes('<image_request'), 'Text-only migrated/new Utility prompt leaked image requests')
assert(imagesOff.content.includes('<relationship_map>') && imagesOff.content.includes('<character_profile>') && imagesOff.content.includes('<persona_wardrobe>'), 'Moved/new XML Utility grammar missing from text-only injection')
  assert(surfaceIconMarkup('narrative', 'Relationship Map').includes('currentColor'), 'Relationship Map SVG must inherit the Narrative Utility accent color')
assert(PERSONA_WARDROBE_UTILITY_PROMPT.includes('person in every <wear_text> must be exactly the person named'), 'Image-mode prompt must keep Wear text aligned with the selected subject')
const wrongSubject = payload(Array(5).fill(''))
  .replace('[character]{{user}}[/character]', '[character]Ria[/character]')
  .replace('{{user}} is wearing silk top 1', 'Cerys is wearing silk top 1')
const repairedSubject = renderNarrativeRegex(wrongSubject, 'plain-button', 'wardrobe-subject')
assert(repairedSubject.includes('Ria is wearing silk top 1') && !repairedSubject.includes('Cerys is wearing silk top 1'), 'Wear draft disagrees with the explicit styled subject')

const partial = payload().replace(option(4), '')
assert(renderNarrativeRegex(partial, 'glass', 'wardrobe-partial').includes('<persona_wardrobe>'), 'Partial owner was silently rendered as a successful five-look wardrobe')
  console.log('Persona Wardrobe smoke passed: five presentations, five look actions, raw/preparing/completed/failed/text-only media, migrated prompts, accent-colored icon')
