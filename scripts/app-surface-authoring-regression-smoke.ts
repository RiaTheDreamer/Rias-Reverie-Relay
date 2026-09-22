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
assert(instagram.content.includes('data-rrn-surface-source='), 'Instagram recovery source depends on sanitizer-removable form controls')

const liveInstagramDrift = `[igfeed][title]Instagram[/title][profile]lisa_system[/profile][handle]@lisa.dev[/handle][bio]latency engineer[/bio][stats]4 posts · 12 followers · 0 following[/stats][/igfeed]
[igstory][author]Lisa[/author][handle]@lisa.dev[/handle][time]2h[/time][media_url]none[/media_url][media_alt]Lisa at a cafe[/media_alt][caption]Unhandled exception.[/caption][/igstory]
[igpost][author]Lisa[/author][handle]@lisa.dev[/handle][time]3 hours ago[/time][location]The Glasshouse Conservatory[/location][media_url]none[/media_url][media_alt]Lisa among tropical ferns[/media_alt][caption]Do not tag me.[/caption][likes]3 likes[/likes][comments]song.arin: botanical heiress[/comments][/igpost]`
const liveInstagram = renderNativeSurfaceMarkup(liveInstagramDrift, studio, { chatId: 'live-app-drift', messageId: 'instagram' })
assert(liveInstagram.renderedSurfaceIds.filter(id => id === 'instagram').length === 1, 'live Instagram dialect was not grouped into one owned recovery island')
assert((liveInstagram.content.match(/<aside class="rrn-contract-recovery"/g) || []).length === 1, 'live Instagram dialect produced fragmented recovery cards')
assert(liveInstagram.content.includes('data-rrn-surface-source='), 'live Instagram recovery lacks sanitizer-safe editor source')

const repairedInstagramDrift = `<payload>
[igfeed][title]Instagram[/title][profile]ARIN // reverie_vault[/profile][handle]@arin_reverie[/handle][bio]special edition[/bio][stats]5 posts · 1.2M followers · 0 following[/stats][/igfeed]
[igstory][author]ARIN[/author][handle]@arin_reverie[/handle][time]4m ago[/time][media_url]none[/media_url][media_alt]Lyric book beside a terminal[/media_alt][caption]midnight stem check[/caption][/igstory]
[igstory][author]ARIN[/author][handle]@arin_reverie[/handle][time]22m ago[/time][media_url]none[/media_url][media_alt]Rehearsal cables[/media_alt][caption]half-time drop[/caption][/igstory]
[igstory][author]ARIN[/author][handle]@arin_reverie[/handle][time]1h ago[/time][media_url]none[/media_url][media_alt]Elevator mirror selfie[/media_alt][caption]locked in[/caption][/igstory]
[igpost][author]ARIN[/author][handle]@arin_reverie[/handle][time]12 MINUTES AGO[/time][location]Terminal 02[/location][media_url]none[/media_url][media_alt]Mixing console[/media_alt][caption]Raw take without compression.[/caption][likes]284,119 likes[/likes][comments]lisa_sys: preserve the diff[/comments][/igpost]
</payload>`
const repairedInstagram = renderNativeSurfaceMarkup(repairedInstagramDrift, studio, { chatId: 'live-app-drift', messageId: 'instagram-repaired' })
assert(repairedInstagram.renderedSurfaceIds.includes('instagram-profile') && repairedInstagram.renderedSurfaceIds.includes('instagram-stories'), 'complete live Instagram family did not migrate to registered Profile and Stories Surfaces')
assert(!repairedInstagram.content.includes('rrn-contract-recovery') && !repairedInstagram.content.includes('<payload>'), 'repairable Instagram family failed closed or leaked its retired payload wrapper')
assert(repairedInstagram.content.includes('ARIN // reverie_vault') && repairedInstagram.content.includes('Raw take without compression.'), 'Instagram family repair dropped authored profile or post content')
assert(!/\[(?:igfeed|igstory|igpost)\]/i.test(repairedInstagram.content), 'Instagram family repair leaked retired bracket roots')

const liveTwitterDrift = `[tw_profile][handle]@null_lisa[/handle][name]lisa | thread executioner[/name][bio]building memory leaks[/bio][following]14[/following][followers]1,892[/followers][/tw_profile]
[tw_post][author]lisa | thread executioner[/author][handle]@null_lisa[/handle][time]42m[/time][text]people think you need confidence to walk outside in velvet.[/text][media_url]none[/media_url][media_alt]Lisa in a Victorian gown[/media_alt][stats]41 replies · 312 reposts · 1.4k likes[/stats][/tw_post]`
const liveTwitter = renderNativeSurfaceMarkup(liveTwitterDrift, studio, { chatId: 'live-app-drift', messageId: 'twitter' })
assert(liveTwitter.renderedSurfaceIds.filter(id => id === 'twitter').length === 1, 'live loose Twitter dialect was not grouped into one owned recovery island')
assert((liveTwitter.content.match(/<aside class="rrn-contract-recovery"/g) || []).length === 1, 'live loose Twitter dialect produced fragmented recovery cards')

const liveRedditDrift = `[reddit_thread][subreddit]r/synthwave_underground[/subreddit][title]Who is this new resident DJ?[/title][op]u/patch_cable_junkie[/op][time]5 hours ago[/time][text]Track ID anyone?[/text][score]2.8k[/score][comments_count]342[/comments_count][/reddit_thread]
[reddit_comment][author]u/arins_vault[/author][score]418[/score][text]let her cook.[/text][/reddit_comment]`
const liveReddit = renderNativeSurfaceMarkup(liveRedditDrift, studio, { chatId: 'live-app-drift', messageId: 'reddit' })
assert(liveReddit.renderedSurfaceIds.includes('forum-thread'), 'live Reddit dialect bypassed Forum Surface ownership')
assert((liveReddit.content.match(/<aside class="rrn-contract-recovery"/g) || []).length === 1, 'live Reddit dialect did not fail closed as one editable block')

const liveDiscordDrift = `[discord_server][server_name]Latency Control Room[/server_name][channel]#general-logs[/channel][/discord_server]
[discord_message][author]Lisa[/author][role]root[/role][time]Today at 4:18 AM[/time][text]attempted sourdough compilation.[/text][/discord_message]`
const liveDiscord = renderNativeSurfaceMarkup(liveDiscordDrift, studio, { chatId: 'live-app-drift', messageId: 'discord' })
assert(liveDiscord.renderedSurfaceIds.includes('discord-server'), 'live malformed Discord root bypassed Discord Surface ownership')
assert((liveDiscord.content.match(/<aside class="rrn-contract-recovery"/g) || []).length === 1, 'live malformed Discord shape was falsely reported as rendered or fragmented')
assert(liveDiscord.content.includes('data-rrn-surface-source='), 'live Discord recovery lacks sanitizer-safe editor source')

const frontendSource = await (globalThis as any).Bun.file(new URL('../src/frontend.ts', import.meta.url)).text()
assert(frontendSource.includes('host?.dataset.rrnSurfaceSource') && frontendSource.includes('host?.dataset.rrnSurfaceOriginal'), 'Inspect / Fix does not read sanitizer-safe preserved source')
assert(frontendSource.includes('host?.dataset.rrnMessageId') && frontendSource.includes('host?.dataset.rrnRootTag'), 'Surface recovery actions do not inherit owning message context')
assert(instagram.content.includes('data-rrn-message-id="instagram-drift"') && instagram.content.includes('data-rrn-action="rescan"'), 'Surface recovery buttons do not carry sanitizer-safe action context')

console.log('app Surface authoring regression smoke passed')
