// Complete local Surface authority and lifecycle smoke. No host/provider calls.
import type { CustomSurfaceDefinition, CustomSurfaceStudioState } from '../src/contracts'
import { characterProfilePortraitHasExactRelayImage, normalizeCharacterProfileContract, renderNativeSurfaceMarkup } from '../src/nativeSurfaces'
import { R45_ACTIVE_ROOTS, containsR45RenderedSurface, r45SurfaceAuthorityPack, renderR45SurfaceAuthority, type R45ColorMode, type R45PresentationMode } from '../src/r45SurfaceAuthority'
import { r45SupplementalSurfaceDefinitions } from '../src/r45SurfaceCatalog'
import { SHIPPED_SURFACE_SPECS, shippedSurfaceDefinitions } from '../src/shippedSurfaceDefinitions'
import { completeSurfaceSpecs } from '../src/surfaceXml'

function assert(value: unknown, reason: string): asserts value { if (!value) throw new Error(reason) }

const shippedDefinitions = [...shippedSurfaceDefinitions(1), ...r45SupplementalSurfaceDefinitions(1)]
const allSpecs = completeSurfaceSpecs(SHIPPED_SURFACE_SPECS)
const missingDefinitions = allSpecs.filter(spec => !shippedDefinitions.some(definition => definition.baseSurfaceId === spec.id)).map(spec => ({
  surfaceId: spec.id, baseSurfaceId: spec.id, presetName: 'R4.5 FINAL', displayName: spec.id, icon: '◇',
  targetId: spec.id === 'smartphone' ? 'smartphone.message-image' : 'custom.artifact-media', canonicalOuterWrapper: spec.wrapper,
  imageSlotSelector: 'image_request', resolvedImageChildFormat: '<img src="{{imageUrl}}" alt="{{alt}}">', supportedAspectRatios: [],
  defaultPromptProfileId: 'auto', peoplePolicy: 'allow', captionSupport: true, altTextSupport: true, defaultCandidateCount: 1,
  compatibleRegenerationIntents: [], declarativeLayoutFields: {}, validationRules: [], sampleXml: spec.sampleXml!,
  deterministicPreviewFixture: {}, builtIn: true, enabled: true, promptEnabled: true, promptCategory: 'custom', promptModule: spec.sampleXml!,
  shellMode: 'plain', defaultOpen: false, launcherLabel: spec.id, density: 'comfortable', maxWidth: '920px', mediaFit: 'contain',
  accentMode: 'theme', customAccent: '', typography: 'mixed', advancedCss: '', hybridOwner: 'regex', updatedAt: 1,
} as CustomSurfaceDefinition))
const definitions = [...shippedDefinitions, ...missingDefinitions]
const studio: CustomSurfaceStudioState = {
  definitions: Object.fromEntries(definitions.map(definition => [definition.surfaceId, definition])),
  activePresetIds: Object.fromEntries(definitions.map(definition => [definition.baseSurfaceId, definition.surfaceId])),
  collectionPresets: {}, rendererMode: 'relay', defaultShellMode: 'plain', colorMode: 'realistic',
  utilityInjectionEnabled: true, utilityInjectionPosition: 'after-chat-history', utilityTemplate: '',
  validationErrors: {}, lastInjectedModuleIds: [], lastInjectionAt: 0, lastInjectionSource: 'none',
  lastInjectionPosition: 'none', lastInjectionSummary: '', updatedAt: 1,
}
const canonical = definitions.map(definition => ({ id: definition.baseSurfaceId, root: definition.canonicalOuterWrapper, sample: definition.sampleXml }))
assert(canonical.length === 46 && new Set(canonical.map(row => row.id)).size === 46, 'R4.5 active Surface inventory must contain 46 unique Surfaces')
for (const retired of ['weverse-post', 'fandom', 'fansite', 'photocard', 'webtoon', 'radio', 'divination', 'travel-log', 'creature-scanner']) {
  assert(!canonical.some(row => row.id === retired), `retired Surface returned: ${retired}`)
}
assert(R45_ACTIVE_ROOTS.length === 46 && new Set(R45_ACTIVE_ROOTS).size === 46, 'R4.5 root inventory must be complete and unique')

const presentations: R45PresentationMode[] = ['inline', 'plain', 'sparkling']
const colors: R45ColorMode[] = ['realistic', 'primary']
let matrixCases = 0
for (const presentation of presentations) for (const color of colors) {
  const pack = r45SurfaceAuthorityPack(presentation, color)
  assert(pack.version === '2.2.1' && pack.relay_product_version === '0.2.0', `${presentation}/${color}: authority identity`)
  assert(pack.scripts.length === 138 && pack.scripts.every(script => script.disabled !== true), `${presentation}/${color}: all 138 scripts enabled`)
  assert(new Set(pack.scripts.map(script => script.script_id)).size === 138, `${presentation}/${color}: unique script IDs`)
  for (const surface of canonical) {
    const rendered = renderR45SurfaceAuthority(surface.sample, presentation, color, `fixture-${surface.id}`)
    assert(!rendered.includes(`<${surface.root}`), `${surface.id}/${presentation}/${color}: raw canonical root remained`)
    assert(containsR45RenderedSurface(rendered), `${surface.id}/${presentation}/${color}: R4.5 owner did not render`)
    const outerLaunchers = rendered.match(/<details\b[^>]*class="[^"]*(?:(?:rr22|rr23)(?:-spark)?-collapse|r43-launch)[^"]*"/gi) || []
    if (presentation === 'inline') assert(outerLaunchers.length === 0, `${surface.id}/${color}: Inline gained an outer launcher`)
    else {
      assert(outerLaunchers.length === 1, `${surface.id}/${presentation}/${color}: expected exactly one outer launcher`)
      assert(!/\sopen(?:\s|=|>)/i.test(outerLaunchers[0]), `${surface.id}/${presentation}/${color}: launcher must start closed`)
    }
    matrixCases += 1
  }
}

let ownershipCases = 0
for (const rendererMode of ['relay', 'legacy-regex', 'hybrid'] as const) for (const presentation of presentations) for (const colorMode of colors) {
  const matrixStudio = { ...studio, rendererMode, defaultShellMode: presentation, colorMode }
  for (const definition of definitions) {
    const rendered = renderNativeSurfaceMarkup(definition.sampleXml, matrixStudio, { chatId: 'native', messageId: `message-${definition.surfaceId}` })
    assert(rendered.renderedCount === 1 && rendered.renderedSurfaceIds.includes(definition.baseSurfaceId), `${definition.surfaceId}/${rendererMode}/${presentation}/${colorMode}: did not claim exactly one Surface`)
    assert(!rendered.content.includes(`<${definition.canonicalOuterWrapper}`), `${definition.surfaceId}/${rendererMode}/${presentation}/${colorMode}: raw XML remained`)
    if (rendererMode === 'legacy-regex') {
      assert(containsR45RenderedSurface(rendered.content), `${definition.surfaceId}/${rendererMode}/${presentation}/${colorMode}: R4.5 visual owner missing`)
    } else {
      assert(rendered.content.includes('data-rrn-editable-surface'), `${definition.surfaceId}/${rendererMode}/${presentation}/${colorMode}: Relay-native visual owner missing`)
    }
    assert(!rendered.content.includes('Relay Surface needs repair'), `${definition.surfaceId}/${rendererMode}/${presentation}/${colorMode}: valid XML fell into repair UI`)
    ownershipCases += 1
  }
}

const phoneGallery = canonical.find(row => row.id === 'phone-gallery')!
for (const presentation of presentations) {
  const rendered = renderR45SurfaceAuthority(phoneGallery.sample, presentation, 'realistic', 'gallery')
  assert(/object-fit\s*:\s*(?:cover|contain)/i.test(rendered) && /object-position\s*:\s*center/i.test(rendered), `Phone Gallery ${presentation}: centered media-fit contract missing`)
}
const google = canonical.find(row => row.id === 'google-images')!
assert(/object-fit\s*:\s*(?:cover|contain)/i.test(renderR45SurfaceAuthority(google.sample, 'inline', 'realistic', 'google')), 'Google Images media-fit contract missing')
const tikTok = canonical.find(row => row.id === 'tiktok-post')!
const tikTokRendered = renderR45SurfaceAuthority(tikTok.sample, 'inline', 'realistic', 'tiktok')
assert(containsR45RenderedSurface(tikTokRendered) && !tikTokRendered.includes('Relay Surface needs repair'), 'valid TikTok must use its rich renderer')
const discord = canonical.find(row => row.id === 'discord-server')!
const legacyDiscord = discord.sample.replace(/\s+members="[^"]*"\s+online="[^"]*"/, '')
const renderedLegacyDiscord = renderR45SurfaceAuthority(legacyDiscord, 'inline', 'realistic', 'discord-legacy')
assert(containsR45RenderedSurface(renderedLegacyDiscord) && !renderedLegacyDiscord.includes('<discord_server'), 'historical Discord XML without optional counts must still render')
assert(renderR45SurfaceAuthority(discord.sample, 'inline', 'realistic', 'discord-current').includes('1,284'), 'provided Discord member count must be rendered instead of replaced')

const profileXml = '<character_profile><portrait><image_request id="profile-a" target="custom.artifact-media" slot="profile-a" aspect="3:4" alt="Portrait of Character A"><scene_brief>Current portrait of Character A.</scene_brief></image_request></portrait><name>Character A</name><role>Witness</role><hook>Knows the missing detail.</hook><trait>Silver glasses.</trait></character_profile>'
for (const [status, label] of [['queued', 'Queued'], ['parsing', 'Parsing'], ['generating', 'Generating'], ['placement-pending', 'Inserting'], ['failed', 'Failed']] as const) {
  const result = renderNativeSurfaceMarkup(profileXml, studio, { chatId: 'profile-chat', messageId: 'profile-message', records: [{ requestId: 'profile-a', messageId: 'profile-message', slot: 'profile-a', target: 'custom.artifact-media', requestAspect: '3:4', status, error: status === 'failed' ? 'Mock failure' : undefined }] })
  assert(result.content.includes(`data-rrn-live-status="${status}"`) && result.content.includes(label), `Character Profile ${status}: visible lifecycle state missing`)
  assert(result.content.lastIndexOf('cp-portrait') < result.content.lastIndexOf(`data-rrn-live-status="${status}"`), `Character Profile ${status}: lifecycle escaped portrait`)
}
const completed = '<character_profile><media><!-- reverie-relay:image chatId="profile-chat" messageId="profile-message" swipeId="0" requestId="profile-a" target="custom.artifact-media" slot="profile-a" --><img src="/mock/profile.png" alt="Portrait" data-reverie-artifact-media="true" data-dgir-key="profile-chat:profile-message:0:profile-a:profile-a" data-dgir-request-id="profile-a" data-dgir-slot="profile-a" data-dgir-image-id="profile-image" data-dgir-message-id="profile-message" data-dgir-swipe-id="0" data-dgir-custom-target="custom.artifact-media"></media><name>Character A</name><role>Witness</role><hook>Knows the missing detail.</hook><trait>Silver glasses.</trait></character_profile>'
const repaired = normalizeCharacterProfileContract(completed)
assert(repaired.includes('<portrait>') && !repaired.includes('<media>'), 'legacy Character Profile media wrapper was not repaired')
assert(characterProfilePortraitHasExactRelayImage(repaired, { chatId: 'profile-chat', messageId: 'profile-message', swipeId: 0, requestId: 'profile-a', slot: 'profile-a', imageUrl: '/mock/profile.png' }), 'repaired portrait lost exact slot ownership')
const repairedRendered = renderNativeSurfaceMarkup(completed, studio, { chatId: 'profile-chat', messageId: 'profile-message' })
assert(repairedRendered.content.includes('/mock/profile.png') && !repairedRendered.content.includes('Portrait request unavailable'), 'completed repaired portrait did not display')

console.log(`native surfaces smoke ok: ${canonical.length} active Surfaces, ${matrixCases} direct R4.5 cases, ${ownershipCases} Relay/Regex/Hybrid ownership cases, lifecycle preserved`)
