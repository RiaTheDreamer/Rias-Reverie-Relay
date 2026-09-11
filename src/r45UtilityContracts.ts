/**
 * Sanitized, model-facing implementation of the supplied FINAL R4.5 Utility
 * Contracts. This is intentionally a runtime source rather than renderer-pack
 * metadata: every approved Surface receives its complete authoring contract.
 */
export const R45_UTILITY_CONTRACT_VERSION = 'R4.5 FINAL'

export const R45_ACTIVE_SURFACE_IDS = [
  'forum-thread', 'email-thread', 'imessage-chat', 'workspace-chat', 'livestream', 'dating-profile',
  'public-bulletin', 'case-file', 'relationship-map', 'instagram-dm', 'x-dm', 'discord-dm',
  'discord-server', 'google-images', 'phone-gallery', 'tiktok-post', 'naver-article', 'newspaper',
  'inline-chat', 'evidence-photo', 'smartphone', 'instagram', 'twitter', 'kakao', 'album-cover',
  'magazine-cover', 'photo-booth-strip', 'polaroid', 'youtube-thumbnail', 'character-profile',
  'music-player', 'location-share', 'voice-memo', 'notes-app', 'market-listing', 'property-listing',
  'letter-dispatch', 'medical-record', 'court-transcript', 'codex-entry', 'diary-app', 'mission-board',
  'cctv-evidence', 'instagram-profile', 'twitter-profile', 'instagram-stories',
] as const

export type R45ActiveSurfaceId = typeof R45_ACTIVE_SURFACE_IDS[number]

const SHARED = `R4.5 FINAL SURFACE UTILITY CONTRACT
Author one bracket-native semantic Surface. Use [root]...[/root] and bracket child fields; opening bracket tags never carry attributes. Relay owns Surface recognition, normalization, validation, canonical rendering, launcher state, interactions, media lifecycle, reinsertion, repair/reparse/rescan UI, and mobile rendering. Do not ask Regex or generic HTML to render the Surface, and do not author launcher chrome or presentation controls. Legacy XML Surface shells are compatibility input only.

Every image request stays inside its exact owning media child, has a unique id and slot, uses the documented aspect, target="custom.artifact-media" for custom Surface media, accessible alt text, and one context-specific <scene_brief>. The brief describes the actual in-world image, preserves established identity/outfit when relevant, composes the important content safely for the target slot, and never asks the image model to draw interface chrome, labels, captions, map labels, timestamps, logos, or readable text. Never place a bare image request in visible prose. Do not reuse one generic request across unrelated media slots.

Use the current scene/message for names, places, timing, route information, text, and visual content. Examples are structural only; never promote demo values into defaults. Keep all bracket fields balanced and preserve the specified child order. Relay renders the approved R4.5 layout; do not emit generic substitute cards, HTML layouts, centered prose blobs, or renderer fallback text.`

const utility = (root: string, body: string) => `${SHARED}\n\nBRACKET ROOT: [${root}]\n${body}`

export const R45_UTILITY_CONTRACTS: Record<R45ActiveSurfaceId, string> = {
  'forum-thread': utility('forum_thread', 'Author topic metadata, ordered posts, nested replies, and any post media inside its post/media child. Keep the thread discussion contextual; use 16:9 or 4:3 only for an actual authored attachment.'),
  'email-thread': utility('email_thread', 'Author ordered <email_item> rows with slot, from, subject, preview, time, <email_body>, and optional <email_attachment>. Attachment media belongs inside the attachment and is 4:3 when visual.'),
  'imessage-chat': utility('imessage_chat', 'Author ordered message rows. Incoming media is left; focal/user media is right. Every sent photo belongs to its exact message attachment and uses 4:3.'),
  'workspace-chat': utility('workspace_chat', 'Author an actual work conversation with ordered channels/messages. Media or files stay inside the message/file child that discusses them and use 4:3.'),
  livestream: utility('livestream', 'Author <live_media>, <live_chat>, and <live_mods> in that order. Stream media is an actual 16:9 stream frame; chat and moderation stay textual.'),
  'dating-profile': utility('tinder', 'Author exactly three <profile slot="…" prev="…" next="…"> records. Each <photo> owns one 3:4 identity image: centered face and upper torso, full hair visible, generous headroom, current outfit/context, no extreme close-up. The same source is reused in match states, so it must be crop-safe.'),
  'public-bulletin': utility('public_bulletin', 'Author authority, level, headline, timestamp, district, <pb_media>, <pb_body>, and <pb_instructions> in order. <pb_media> owns one 16:9 documentary image of the exact event/place; all readable bulletin text remains XML.'),
  'case-file': utility('case_file', 'Author the dossier tabs/sheets/evidence/timeline in the approved order. Evidence media stays in its specific evidence field and uses 3:4 or 4:3 documentary framing with the entire clue/object/area visible.'),
  'relationship-map': utility('relationship_map', 'Author the approved named character nodes, relationship connections, and insight fields only. Preserve the R4.5 inner relationship-map structure; do not substitute a different graph or generic media card.'),
  'instagram-dm': utility('instagram_dm', 'Author a coherent ordered direct-message exchange. Any media belongs in its exact chat-media child and uses 4:3; do not let scene_brief appear as chat text.'),
  'x-dm': utility('x_dm', 'Author a coherent ordered direct-message exchange. Any attachment belongs in its exact message media child and uses 4:3.'),
  'discord-dm': utility('discord_dm', 'Author an ordered Discord direct-message exchange with participant identity and contextual content. Media/files remain in the exact discussed message child and use 4:3.'),
  'discord-server': utility('discord_server', 'Author <discord_server server="…" topic="…" members="…" online="…">. members and online are optional for legacy XML but must be authored when current context supplies them; never invent counts. Author four contextual <server_channel slot="…" name="…" description="…"> sections. Every recurring participant with sufficient visual identity, including the local participant when applicable, uses <server_avatar_msg> with one stable reusable 1:1 image_request id/slot throughout this Surface; use <server_msg> only when sufficient visual identity is unavailable. Discussed media uses <server_media> with one target="custom.artifact-media" aspect="4:3" request and remains inside its exact message/file child.'),
  'google-images': utility('google_image_search', 'Author query plus independent <gis_result slot="…" title="…" source="…"> rows. Each result owns a 4:3 image relevant to the query; vary results naturally. Never insert unrelated portraits unless the query is a person. Renderer owns zoom/lightbox behavior.'),
  'phone-gallery': utility('phone_gallery', 'Author one <gallery_item slot="…" title="…" time="…" location="…" size="…"> per saved photo. Each owns a distinct 1:1 square-safe image with focal content inside the central safe area. Thumbnails fill their cells; enlarged Gallery state preserves the complete source.'),
  'tiktok-post': utility('tiktok_post', 'Author <tt_media> with one 9:16 request for the actual vertical post moment. Compose face/action inside the vertical safe area; no app UI or text. Keep username, caption, comments, and controls textual.'),
  'naver-article': utility('naver_news', 'Author <nv_media>, one <nv_body>, then <nv_comments>. Hero media is a 16:9 editorial image of the exact story event/place/person; article and comment text remain XML.'),
  newspaper: utility('newspaper', 'Author publication/article fields and one 16:9 editorial image of the exact reported event, place, or person. Keep masthead/headline/body text outside the generated image.'),
  'inline-chat': utility('inline_chat', 'Author a complete compact ordered private exchange with correct left/right message semantics. Use a request only inside its owning message/attachment region.'),
  'evidence-photo': utility('evidence_photo', 'Author case, label, timestamp, source, <photo>, caption, and note. <photo> owns one 4:3 documentary evidence image of the exact clue/location/object; labels stay textual.'),
  smartphone: utility('smart_phone', `Author explicitly closed [sender], [initial], [time], [day], and [battery] fields, followed by optional [notifications], optional [contact], required [messages], then optional [info]. Contact and info are text-only. Preserve message order. Never put XML-style attributes in bracket opening tags and never emit unclosed scalar fields or [battery]value].

Canonical text rows:
[s_recv][time]HH:MM[/time]Received message.[/s_recv]
[s_sent][time]HH:MM[/time]Sent message.[/s_sent]

All [s_recv], [s_sent], and [s_img] rows remain inside [messages]. Every image message is [s_img][side]sent|recv[/side][time]HH:MM[/time][media]<image_request id="…" target="smartphone.message-image" slot="…" aspect="4:3" alt="…"><scene_brief>Exact contextual attachment only; no phone UI or readable text.</scene_brief></image_request>[/media][/s_img]. sent is user/right; recv is contact/left. Images are allowed only inside a message row; never place media in contact or info.`),
  instagram: utility('ig_app', 'Author user, location, likes, verification, one direct 1:1 post/carosel media request, caption, and comments in the approved order. Single target is instagram.single; a carousel is one instagram.carousel request with count 2–4. Never use instagram.slide or resolved media markup.'),
  twitter: utility('twitter_app', 'Author <for_you> first, then optional <following>, <thread>, and <trends>. Each <tw_post> keeps its required attribute order, text, optional one direct 16:9 or contextual 4:3 twitter.media request, and nested comments. Never author resolved <tw_media src> markup.'),
  kakao: utility('kakao_chat', 'Child order: <participants> then <messages>. Preserve message order and use exact k_part/k_msg/k_reply/k_react/k_file/k_system/k_typing attributes. An image belongs at its exact conversation position inside a <k_img> media wrapper and contains one target="kakao.image" request with aspect="4:3"; describe the actual chat attachment only. Never use an alternate media aspect or resolved image markup.'),
  'album-cover': utility('album_cover', `Child order is <title>, <artist>, <release>, <artwork>. A real album/release title is required for new output; use an established release title from context or deliberately author one when the Surface itself establishes a fictional release. <artwork> owns one 1:1 contextual release-art request matching title/artist/concept; do not generate readable cover text or player UI. Legacy art-only records are repair-only and do not receive an invented title.

Canonical structure:
<album_cover>
<title>...</title>
<artist>...</artist>
<release>...</release>
<artwork>
<image_request id="album-cover-UNIQUE-ID" target="custom.artifact-media" slot="album-cover-UNIQUE-ID" aspect="1:1" alt="Album cover artwork">
<scene_brief>...</scene_brief>
</image_request>
</artwork>
</album_cover>`),
  'magazine-cover': utility('magazine_cover', 'Child order: masthead, issue, kicker, headline, subhead, then cover image. The image request is 4:5 editorial art with headline-safe space; renderer supplies masthead and typography.'),
  'photo-booth-strip': utility('photo_booth_strip', 'Author the exact four <booth_frame> children followed by caption. Each frame owns a unique 2:5 request from one coherent booth session with stable identities, wardrobe, booth, and lighting.'),
  polaroid: utility('polaroid_frame', 'Child order: <photo> then <caption>. <photo> owns one 1:1 actual square instant photograph tied to the current story beat; renderer supplies paper frame.'),
  'youtube-thumbnail': utility('yt_thumbnail', 'Author channel, title, views, age, subscribers, <yt_media>, and 2–5 <yt_comment> rows. <yt_media> owns one 16:9 actual video frame matching title/content; no YouTube logo, play icon, generated UI, or readable text.'),
  'character-profile': utility('character_profile', `First child is the mandatory <portrait> region; never use <media>. The Relay <image_request> lives inside <portrait>, uses target="custom.artifact-media", and portrait aspect is 3:4. Keep generated media inside that same portrait region through pending, live preview, completed, retry, reparse, and reload states. After portrait author <name>, <role>, <hook>, <trait> in that order, using only viewpoint-safe established information.

Canonical structure:
<character_profile>
<portrait>
<image_request
  id="character-profile-UNIQUE-ID"
  target="custom.artifact-media"
  slot="character-profile-UNIQUE-ID"
  aspect="3:4"
  alt="Portrait of Character"
>
<scene_brief>...</scene_brief>
</image_request>
</portrait>
<name>...</name>
<role>...</role>
<hook>...</hook>
<trait>...</trait>
</character_profile>`),
  'music-player': utility('music_player', 'Author actual track/release fields and <mu_cover>. Cover art is one contextual 1:1 release image, not a random portrait; player chrome and lyrics remain textual.'),
  'location-share': utility('location_share', 'Author sender, destination, eta, remaining, updated, <lc_map>, <lc_note>, and 2–5 useful contextual <lc_step> waypoints. Every value derives from the current scene/message; never default to a fixture place, landmark, city, route, or note. <lc_map> ALWAYS owns one 4:3 target="custom.artifact-media" top-down navigation/map request corresponding to the authored route and destination, with visible route geometry/destination-pin area, no people, portrait photography, generated labels, or UI.'),
  'voice-memo': utility('voice_memo', 'Author sender/time/duration/status plus <vm_avatar>, transcript, and call history. Avatar is one reusable 1:1 centered face-and-shoulders contact portrait with headroom; transcript remains textual.'),
  'notes-app': utility('notes_app', 'Author the notes list and note content from current context. Any note attachment remains in its exact attachment child and uses 4:3; do not fabricate a generic image.'),
  'market-listing': utility('market_listing', 'Author title, price, condition, seller, time, <mk_media>, description, bids, and actions. <mk_media> owns a 1:1 product-only listing photograph with the item fully visible and no readable listing text.'),
  'property-listing': utility('property_listing', 'Author listing metadata, <prop_gallery>, description, amenities, and history. Each gallery <prop_media> owns a separate 16:9 property photograph of actual exterior/interior/room content; no random portrait subject.'),
  'letter-dispatch': utility('letter_dispatch', 'Author from, to, date, subject, body paragraph breaks, signature, and optional <ld_media>. Any attachment is 4:3 and stays inside <ld_media>; letter content remains text.'),
  'medical-record': utility('medical_record', 'Author case/patient/status fields, <med_summary>, REQUIRED <med_media>, vitals, and notes. <med_media> owns one 4:3 scene-relevant fictional clinical/documentary image with no readable chart text.'),
  'court-transcript': utility('court_transcript', 'Author case/court/status/time/judge, ordered <ct_lines>, objection, and exhibit. Preserve clear speaker/time/body semantics; do not turn the transcript into a generic image Surface.'),
  'codex-entry': utility('codex_entry', 'Author title/type/region/status/era, <codex_media>, body, facts, and related references. Media is a 4:3 encyclopedia-appropriate subject/place/object image.'),
  'diary-app': utility('diary_app', 'Author owner/title and ordered diary entries. A photo is optional only when the authored diary day has an actual attachment; it uses 4:3 and remains in that entry.'),
  'mission-board': utility('mission_board', 'Author mission metadata, ordered mission items, and a context-specific note. Keep task state textual and do not invent unrelated media.'),
  'cctv-evidence': utility('cctv_evidence', 'Author exactly three <cv_feed> records for the specified camera locations/angles, followed by note. Each feed owns one 16:9 fixed surveillance view of its exact camera position; no glamour framing or generated timestamp text.'),
  'instagram-profile': utility('instagram_profile', 'Author avatar, exactly three distinct posts, and tagged grid. Use only Posts and Tagged semantics. Avatar and per-post avatar are 1:1 reusable identity media; each post/tagged image is a distinct 1:1 scene-relevant image. Grid contains imagery only; renderer owns detail view, actions, captions, comments, and tabs.'),
  'twitter-profile': utility('twitter_profile', 'Author profile attributes, <twip_avatar>, <twip_cover>, <twip_posts>, and <twip_media_grid>. Avatar is reusable 1:1; cover is 3:1; post avatars are reusable 1:1; tweet media is 16:9 unless context requires 4:3; media-grid items are 1:1. Keep post child order avatar, text, media, comments, thread. Tabs are Posts and Media only.'),
  'instagram-stories': utility('instagram_stories', 'Author exactly three <story> records. Each has owner/name/time, reusable 1:1 avatar, a 9:16 <story_media> request, and caption. Story media fills the actual vertical story frame and contains scene content only; renderer owns Instagram chrome, navigation, reply UI, and progress bars.'),
}

export function r45UtilityContract(surfaceId: string): string {
  return R45_UTILITY_CONTRACTS[surfaceId as R45ActiveSurfaceId] || ''
}

export function hasR45UtilityContract(surfaceId: string): boolean {
  return Boolean(r45UtilityContract(surfaceId))
}
