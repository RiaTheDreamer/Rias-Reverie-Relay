// Deterministic regression coverage for app-schema drift observed in live Story Model output.
import type { CustomSurfaceStudioState } from '../src/contracts'
import { renderNativeSurfaceMarkup } from '../src/nativeSurfaces'
import { r45SupplementalSurfaceDefinitions } from '../src/r45SurfaceCatalog'
import { shippedSurfaceDefinitions } from '../src/shippedSurfaceDefinitions'

function assert(value: unknown, reason: string): asserts value { if (!value) throw new Error(reason) }

const definitions = [...shippedSurfaceDefinitions(1), ...r45SupplementalSurfaceDefinitions(1)]
const studio: CustomSurfaceStudioState = {
  definitions: Object.fromEntries(definitions.map(definition => [definition.surfaceId, definition])),
  activePresetIds: Object.fromEntries(definitions.map(definition => [definition.baseSurfaceId, definition.surfaceId])),
  collectionPresets: {}, rendererMode: 'relay', defaultShellMode: 'sparkling', colorMode: 'realistic',
  utilityInjectionEnabled: true, utilityInjectionPosition: 'after-chat-history', utilityTemplate: '',
  validationErrors: {}, lastInjectedModuleIds: [], lastInjectionAt: 0, lastInjectionSource: 'none',
  lastInjectionPosition: 'none', lastInjectionSummary: '', updatedAt: 1,
}

const twitterDrift = `[TWEET:FEED]
[profile][display_name]ARIN[/display_name][handle]@arin_archive[/handle][badge]verified_locked[/badge][/profile]
[tweet][id]tw-001[/id][time]14m[/time][content]breath noise stays in the track.[/content][metrics][replies]1[/replies][retweets]2[/retweets][likes]3[/likes][/metrics][/tweet]
[reply][to]tw-001[/to][handle]@lisa_sys[/handle][time]11m[/time][content]engineering decision.[/content][/reply]
[/TWEET:FEED]`
const twitter = renderNativeSurfaceMarkup(twitterDrift, studio, { chatId: 'app-drift', messageId: 'twitter-drift' })
assert(twitter.renderedSurfaceIds.includes('twitter'), 'deterministic [TWEET:FEED] drift was not claimed by Twitter')
assert(twitter.content.includes('rr22-twitter'), 'repaired Twitter dialect did not use the authorized presentation')
assert(twitter.content.includes('breath noise stays in the track.') && twitter.content.includes('engineering decision.'), 'Twitter repair dropped authored content')
assert(!twitter.content.includes('[TWEET:FEED]') && !twitter.content.includes('Format error'), 'repairable Twitter dialect leaked raw or failed closed')

const incompleteTwitterDrift = `[TWEET:FEED]
[profile][handle]@arin_archive[/handle][/profile]
[tweet][id]tw-001[/id][time]14m[/time][content]breath noise stays in the track.[/content][/tweet]
[/TWEET:FEED]`
const incompleteTwitter = renderNativeSurfaceMarkup(incompleteTwitterDrift, studio, { chatId: 'app-drift', messageId: 'twitter-incomplete' })
assert(incompleteTwitter.renderedSurfaceIds.includes('twitter'), 'identity-incomplete Twitter dialect bypassed Surface ownership')
assert(incompleteTwitter.content.includes('rrn-contract-recovery'), 'identity-incomplete Twitter dialect did not fail closed')
assert(!incompleteTwitter.content.includes('>Author<') && !incompleteTwitter.content.includes('@handle') && !incompleteTwitter.content.includes('@reader'), 'Twitter repair invented a fallback identity')

const instagramDrift = '[igfeed][igpost][media_url]none[/media_url][media_alt]portrait[/media_alt][/igpost][/igfeed]'
const instagram = renderNativeSurfaceMarkup(instagramDrift, studio, { chatId: 'app-drift', messageId: 'instagram-drift' })
assert(instagram.renderedSurfaceIds.includes('instagram'), 'unsupported Instagram dialect bypassed Surface ownership')
assert(instagram.content.includes('rrn-contract-recovery'), 'unsupported Instagram dialect did not fail closed into repair UI')
assert(instagram.content.includes('Use the enabled [ig_app] contract.'), 'Instagram recovery did not name the canonical contract')
assert(instagram.content.includes('rrn-surface-source'), 'Instagram recovery did not preserve editable source')

console.log('app Surface authoring regression smoke passed')
