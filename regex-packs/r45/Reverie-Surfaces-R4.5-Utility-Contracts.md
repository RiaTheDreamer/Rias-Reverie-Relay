# Reverie Surface Utility Contracts — R3.5 CHARACTER HORIZONTAL MOBILE

Enable exactly one presentation pack: Inline, Collapsible — Sparkling, or Collapsible — Plain.
Utilities author Surface XML only; Regex owns launcher buttons and presentation chrome.

## Removed surfaces
Do not emit: Weverse, Fansite/Photocard, Webtoon, Radio/Emergency Broadcast, Magical/Divination,
Fandom Community, Travel Log/Expedition Journal, Creature/Artifact Scanner.

# Required Reverie image-request contract

Every image-bearing Surface must use a context-specific Reverie request inside the exact media child owned by that Surface.

```xml
<image_request
  id="UNIQUE_ID"
  target="custom.artifact-media"
  slot="UNIQUE_SLOT"
  aspect="ASPECT_MATCHING_THIS_UI_SLOT"
  alt="Short description">
  <scene_brief>WHAT THIS EXACT IN-WORLD IMAGE SHOULD SHOW</scene_brief>
</image_request>
```

Hard rules:
- `target="custom.artifact-media"` for custom-Surface media.
- Unique `id` and `slot` per request.
- `aspect` must match the renderer slot.
- The brief describes the actual image, not a generic aesthetic.
- BAN generic filler such as `cinematic Seoul night scene, polished realistic photography, clear single subject...`
  unless that is literally the authored media.
- Never generate app chrome, labels, timestamps, article text, map labels, captions, or UI inside the image; Regex renders those.
- Preserve correct character/persona/NPC identity and current outfit continuity for identity-bearing images.
- Never place a bare image request in visible prose. Nest it in the Surface's media element.
- Compose for the destination slot: safe headroom, important subject away from edges, correct camera/framing.
- Correct request aspect + renderer fit are a single contract. CSS cannot rescue a completely wrong image brief.

## Required image briefs / aspects

| Surface / media slot | Aspect | Utility must request |
|---|---:|---|
| Instagram post/carousel | `1:1` | Actual authored social photo, identities/outfits/location/action. |
| Twitter/X post media | `16:9` or `4:3` | Exact image attached to that post. |
| X/Twitter DM media | `4:3` | Exact sent attachment. |
| Kakao media | `4:3` | Exact chat attachment. |
| Album artwork | `1:1` | Contextual release artwork matching title/artist/concept. |
| Magazine art | `4:5` | Editorial cover photograph/art; renderer supplies masthead. |
| Photo Booth Strip | `2:5` | One coherent photo-booth session. |
| Polaroid photo | `1:1` | Actual photographed scene; renderer supplies paper frame. |
| YouTube video frame | `16:9` | Frame matching actual video title/content; no YouTube UI/play icon. |
| Newspaper/News/Naver hero | `16:9` | Editorial image of actual story event/place/person. |
| Evidence Photo | `4:3` | Documentary evidentiary view of clue/location/object. |
| Case File evidence | `3:4` or `4:3` | Specific subject/evidence documented by dossier. |
| Google Images result | `4:3` | Plausible result for the search query; vary results. |
| Phone Gallery item | `1:1` | Distinct square-safe saved phone photo. |
| TikTok media | `9:16` | Vertical post still matching caption/action, subject safely framed. |
| Reddit media | `16:9` or `4:3` | Exact attachment for the post. |
| Workspace/Discord media | `4:3` | Actual file/photo being discussed. |
| iMessage media | `4:3` | Exact sent photo. |
| Twitch stream | `16:9` | Actual stream frame/game/camera content. |
| Tinder profile | `3:4` | Centered dating portrait, face + upper body, generous headroom. |
| Music/Listen Now cover | `1:1` | Contextual album/single art, not a random scene portrait. |
| Live Location map | `4:3` | REQUIRED top-down navigation/map image around destination; no portrait/person. |
| Voice Memo avatar | `1:1` | Contact portrait, centered face + headroom. |
| Notes attachment | `4:3` | Exact referenced note attachment. |
| eBay/Marketplace item | `1:1` | Product-only listing photo; neutral seller-style framing. |
| Property gallery | `16:9` | PROPERTY photography only: exterior/interior/room, no random portrait. |
| Medical clinical media | `4:3` | Fictional scene-relevant scan/documentary clinical image; no chart text. |
| Wikipedia infobox | `4:3` | Encyclopedia-appropriate subject/place/object image. |
| Social Profile cover | `3:1` | Platform-appropriate banner, no UI. |
| Social Profile avatar | `1:1` | Centered identity portrait/logo. |
| Social Profile post | `1:1` | Actual post media; exactly three distinct posts. |
| Diary photo | `4:3` | Actual attachment for that diary day if present. |
| CCTV feed | `16:9` | Fixed surveillance angle from exact camera location; no glamour framing. |
| ID card photo | `3:4` | Neutral identification portrait. |

# Google Images

```xml
<google_image_search query="Seoul night architecture">
  <gis_result slot="1" title="..." source="...">
    <image_request id="gis-1" target="custom.artifact-media" slot="gis-1" aspect="4:3" alt="Search result">
      <scene_brief>Wide photograph of illuminated contemporary architecture in Seoul at night, no people dominating frame, no text</scene_brief>
    </image_request>
  </gis_result>
</google_image_search>
```

Every result must answer the query. Do not fill unrelated portrait results unless the query is actually a person.

# Phone Gallery

Use `1:1` requests and describe each saved moment independently. Grid thumbnails may fill their cells; the enlarged state preserves the full image.

# Live Location

`<lc_map>` MUST always contain a map image request.

```xml
<location_share sender="Ari" destination="Cafe Miro" eta="7 min" remaining="1.2 km" updated="now">
  <lc_map>
    <image_request id="loc-map-1" target="custom.artifact-media" slot="loc-map-1" aspect="4:3" alt="Live navigation map">
      <scene_brief>Top-down modern navigation map around Hongdae showing a clear walking route toward Cafe Miro, destination-pin area visible, readable road geometry, no people, no photographic portrait, no generated text labels</scene_brief>
    </image_request>
  </lc_map>
  <lc_note>I'm by the back entrance. Come upstairs.</lc_note>
  <lc_steps><lc_step>Hongdae Station</lc_step><lc_step>Yeonnam Park</lc_step><lc_step>Cafe Miro</lc_step></lc_steps>
</location_share>
```

# Tinder

Keep the approved three-profile `<tinder>` contract.
Each profile `<photo>` uses a `3:4` request:
- centered identity
- head + upper body fully inside frame
- generous headroom
- no extreme close-up
- current outfit/context

The same portraits are reused by the match state, so they MUST be crop-safe.

# YouTube Video

Compatibility root stays `<yt_thumbnail>`, but the visible Surface is a YouTube video/watch page.

```xml
<yt_thumbnail channel="Creator Archive" title="..." views="184K" age="2 hours ago" subscribers="412K">
  <yt_media>
    <image_request id="yt-frame-1" target="custom.artifact-media" slot="yt-frame-1" aspect="16:9" alt="Video frame">
      <scene_brief>Actual frame from the authored video content, composed as a wide video shot, no YouTube logo, no play icon, no generated interface text</scene_brief>
    </image_request>
  </yt_media>
  <yt_comments>
    <yt_comment user="viewer_one" time="12m ago" likes="482">Natural comment text.</yt_comment>
    <yt_comment user="kai" time="5m ago" likes="219">Another natural comment.</yt_comment>
  </yt_comments>
</yt_thumbnail>
```

Provide 2–5 plausible comments. Regex owns play/pause and actions.

# Workspace / Discord / iMessage

Any media request must stay inside the relevant media child. Never let `<scene_brief>` become visible chat text.

iMessage sides:
- `left` = incoming gray
- `right` = focal/user blue, aligned right

Use `4:3` for sent photos.

# TikTok

`<tt_media>` uses a `9:16` request describing the actual vertical post. Keep subject inside vertical safe frame.

# Twitch

`<live_media>` uses `16:9` and describes the actual stream view. Keep `<live_chat>` and `<live_mods>` populated.

# Music / Listen Now

`<mu_cover>` uses contextual `1:1` cover art for the actual track/release.

# Voice Memo

`<vm_avatar>` uses a `1:1` contact avatar request. Transcript remains textual UI.

# Property

All `<prop_media>` children are `16:9` property photography.

Example brief:
`Wide real-estate photograph of the restored gatehouse apartment exterior in Seongbuk-gu, showing the building and courtyard, no people, no text.`

Never generate a random character portrait in a property slot.

# Medical Chart — R2.4

Canonical Utility output now includes REQUIRED `<med_media>`:

```xml
<medical_record case="..." patient="..." age="..." status="..." doctor="..." admitted="...">
  <med_summary>...</med_summary>
  <med_media>
    <image_request id="medical-1" target="custom.artifact-media" slot="medical-1" aspect="4:3" alt="Clinical record image">
      <scene_brief>Fictional scene-relevant clinical image appropriate to this record, medically plausible documentary framing, no readable chart text</scene_brief>
    </image_request>
  </med_media>
  <med_vitals>
    <med_vital label="Heart Rate">...</med_vital>
  </med_vitals>
  <med_notes>...</med_notes>
</medical_record>
```

Regex accepts missing `<med_media>` only for backwards compatibility. Utility MUST author it.

# Social Profile

Required:
- avatar `1:1`
- cover `3:1`
- exactly three distinct post images `1:1`

Do not reuse one generic prompt across all four slots.

# CCTV

Use exactly three `16:9` camera-specific requests. Each brief names camera location and fixed angle.

# Image-fit acceptance

A Surface only passes when:
- generated media fills its intended slot,
- important content is not accidentally clipped,
- the nested `.reverie-artifact-media` wrapper does not break sizing,
- Google/lightbox enlargement stays inside its owning Surface,
- and the Utility requested the correct content/aspect for that exact slot.


---

# R2.5 REQUIRED CORRECTIONS

## Image requests: semantic content AND framing are mandatory

The renderer now normalizes nested Relay artifact sizing, but the Utility must still request an image whose content and composition fit its destination.

For every request, determine all of the following BEFORE writing `<scene_brief>`:
1. What object/person/place/media is this slot actually supposed to depict?
2. Is the slot portrait, square, landscape, or vertical?
3. Which part of the subject must remain visible after the renderer fills the slot?
4. Does this image need identity continuity?
5. Is this an app attachment, editorial photo, evidence image, map, property photo, cover art, avatar, stream frame, or something else?

Do not reuse a generic scene prompt between unrelated media slots.

### Framing language

Use explicit framing when useful:
- Portrait/avatar: `centered face and shoulders, full hair visible, comfortable headroom, subject away from frame edges`
- Tinder profile: `head and upper torso fully inside frame, generous headroom, centered profile composition`
- Property: `wide architectural composition, complete room/building features visible, no portrait subject`
- CCTV: `wide fixed security-camera angle, environment prioritized over faces`
- Phone Gallery square: `square-safe composition, focal subject inside central 70%`
- TikTok vertical: `vertical full-subject/mobile-video composition, head and key action inside safe frame`
- Evidence: `documentary framing with entire relevant object/area visible`
- YouTube/Twitch: `wide 16:9 composition with key action inside center-safe area`

## Live Location is ALWAYS context-dependent

A Live Location Surface MUST use the location information from the current scene/message. NEVER hardcode any test location.

The following are examples only and must never become defaults:
- Hongdae Station
- Yeonnam Park
- Cafe Miro
- Seoul

`destination`, `eta`, `remaining`, `updated`, `<lc_note>`, and every `<lc_step>` must be authored from current context.

Examples of valid context-dependent routes:
- `<lc_step>Apartment Lobby</lc_step><lc_step>Riverside Path</lc_step><lc_step>North Pier</lc_step>`
- `<lc_step>Terminal 1</lc_step><lc_step>Airport Railroad</lc_step><lc_step>Hotel Entrance</lc_step>`
- `<lc_step>Studio B</lc_step><lc_step>Back Stairwell</lc_step>`

The number of route steps is not fixed. Use 2–5 concise waypoints when useful.

### Live Location map request

`<lc_map>` ALWAYS contains a map/cartographic request, never a portrait or ordinary scene photograph.

The request must derive its geography from the authored destination/route:

```xml
<lc_map>
  <image_request
    id="location-map-UNIQUE"
    target="custom.artifact-media"
    slot="location-map-UNIQUE"
    aspect="4:3"
    alt="Live navigation map">
    <scene_brief>Top-down modern navigation map corresponding to the current route from [CONTEXTUAL START/AREA] toward [CONTEXTUAL DESTINATION], visible route geometry and destination-pin area, no people, no portrait photography, no generated text labels</scene_brief>
  </image_request>
</lc_map>
```

## Crop/fill contract

Utility and Regex share responsibility:
- Utility requests the correct aspect.
- Utility keeps the important subject inside a safe composition.
- Renderer fills the media container.
- Thumbnail/card states may use `cover` when aspect is correct.
- Dedicated enlarged states that are intended to show the whole image use `contain`.
- Do not compensate for a wrong request by asking the renderer to letterbox every image.

## Google Images

Each result is independently relevant to the query and should be composed for `4:3`.
The Regex magnifier owns enlargement. The Utility never relies on Relay's generic image lightbox.

## Tinder

Profile requests remain `3:4` and MUST be match-avatar safe:
`centered face and upper torso, full hair visible, generous headroom, face not cropped by a circular thumbnail`.

## YouTube

The Utility supplies only the actual `16:9` video frame. It does not draw or request play/pause graphics.
Regex owns the centered play/pause control.

## Medical

`<med_media>` remains REQUIRED in new Utility output and must contain a scene-relevant clinical image request.



---

# R2.6 Rendering/Framing Acceptance

The renderer now treats generated media as follows:

- Default: preserve the full generated image (`contain`) so host CSS cannot silently crop it.
- Fixed aspect-controlled media slots (cover art, vertical TikTok, property hero, stream frame, etc.) fill their frame when the Utility requested the correct matching aspect.
- Phone Gallery thumbnails fill square cells; enlarged Gallery images preserve the whole source.
- Google Images results and zoom previews preserve the whole source.
- Tinder full profile cards fill their portrait frame; match-avatar state preserves the whole identity image.
- Documentary/object surfaces such as Evidence, Medical, Wikipedia, Marketplace, Case File, and Reddit preserve the whole source where clipping would remove information.

Therefore the Utility MUST continue to author the slot-specific aspect ratios documented above. Do not use a generic aspect and rely on CSS cropping.

## Live Location R2.6

The popup is a phone-screen overlay, not a page/viewport modal.

The route remains entirely authored by current context:
- Never hardcode a city, station, café, landmark, or waypoint.
- Author 2–5 concise `<lc_step>` values only when useful.
- The Regex renders each authored step separately.
- `<lc_map>` still always contains a context-derived top-down map request.


---

# R2.7 Final Media/Popup Contract

## Media

R2.7 renderers use `object-fit: contain` for Relay-generated image elements so the renderer never silently cuts off part of a generated image.

The Utility MUST therefore request the documented aspect ratio for the destination slot. When the request aspect matches the slot, the image naturally fills it without cropping or letterboxing.

Do not solve framing by generating a random generic image and relying on CSS.

## Live Location

Live Location route labels are rendered directly from the authored `<lc_step>` elements. There is no route-label transformer and there are no renderer-owned place names.

Every value is contextual:
- `sender`
- `destination`
- `eta`
- `remaining`
- `updated`
- `lc_note`
- every `lc_step`
- the geography described by the map `scene_brief`

Never use Hongdae, Yeonnam Park, Cafe Miro, Seoul, or any other test fixture as a default.

The Live Location modal is contained by `.rrloc-screen` and must never become a viewport/page modal.

## Collapsible launcher geometry

Collapsible presentation uses a 40px-high launcher with:
- exactly 5px outer space above
- exactly 5px outer space below
- flex-based vertical text centering
- no stacked parent/summary margin trickery



---

# R2.8 Media Composition Contract

R2.8 no longer uses one blanket `contain` rule for every Surface. Each Surface now owns an intentional media strategy:

- fixed-ratio app media fills its frame,
- document/evidence enlargement preserves the whole source,
- Google Images preserves each result's natural ratio,
- Phone Gallery uses square thumbnails and full-image zoom,
- TikTok is a true 9:16 vertical media surface.

This makes the Utility's requested aspect ratio non-optional.

## Critical: a wrong source aspect cannot be repaired by CSS

A 16:9 generated image cannot become a genuine 9:16 TikTok still without either:
- cropping most of it, or
- leaving large empty bars.

Likewise, a portrait photograph cannot become a map.

Therefore NEVER reuse one generic image request across different Surface media slots in production Utility output.

The old QA fixture prompt:
`cinematic Seoul night scene, polished realistic photography, clear single subject...`
is explicitly a TEST-ONLY artifact and is forbidden in production authoring.

## TikTok

Every `<tt_media>` request MUST be:

```xml
<image_request ... aspect="9:16" ...>
  <scene_brief>Vertical mobile-video still of the actual authored TikTok moment, subject/action composed for a 9:16 frame, important face and action inside central safe area, no app UI, no text</scene_brief>
</image_request>
```

If the authored TikTok is scenery, food, an object, performance, etc., describe THAT content. Do not default to a portrait.

## Google Images

Google results should use image content appropriate to the query and may vary naturally in composition.
Use `4:3` as the normal generation request unless the searched content clearly calls for portrait/square imagery.

The renderer displays results at natural ratio rather than forcing every result into an identical crop.

## Phone Gallery

Gallery requests remain `1:1`.
Compose the important subject inside the central safe area so square thumbnails fill cleanly.
The enlarged state displays the full generated source.

## Tinder

Profile photos MUST be `3:4`.
Brief must include:
`centered face and upper torso, full hair visible, generous headroom, subject centered inside portrait-safe area`.

The same source is reused in the circular match state.

## Live Location

`<lc_map>` is ALWAYS a map/cartographic request. Never emit a person/photo scene in this slot.

Use current context for all geography:

```xml
<lc_map>
  <image_request
    id="loc-map-UNIQUE"
    target="custom.artifact-media"
    slot="loc-map-UNIQUE"
    aspect="4:3"
    alt="Live navigation map">
    <scene_brief>Top-down modern navigation map for the current live-location route from [CONTEXTUAL AREA/START] toward [CONTEXTUAL DESTINATION], route geometry visible, destination pin area visible, no people, no portrait photography, no generated text labels</scene_brief>
  </image_request>
</lc_map>
```

The Utility authors 2–5 contextual `<lc_step>` waypoints. The Regex renders them as a vertical route timeline.

## YouTube

YouTube media remains `16:9`.

YouTube comments should be authored as:
```xml
<yt_comment user="viewer_one" time="12m ago" likes="482">Natural comment text.</yt_comment>
```

Do not include a leading `@` in `user`; the renderer supplies it.



---

# R2.9 Image Framing — Non-Negotiable

The Regex can preserve or fit the generated source, but the Utility is responsible for generating the correct source for the slot.

## Do NOT reuse one image request across unrelated surfaces

The generic QA request previously used in the test payload is not valid production Utility behavior.

Examples:
- Property media MUST generate the property, not a person.
- Live Location MUST generate a map.
- TikTok MUST request `9:16`.
- Tinder MUST request `3:4`.
- Phone Gallery MUST request `1:1`.
- YouTube/Twitch MUST request `16:9`.
- Voice Memo avatar MUST request `1:1`.

## Fit rules in R2.9

- Google Images: results keep their natural generated ratio; no side/top/bottom crop. Zoom shows the complete source.
- Phone Gallery: square thumbnail fills the grid; zoom shows complete source within the Gallery Surface.
- Property: hero + thumbnails show the complete source. Production Utility requests all property images at `16:9`, so they fill without crop.
- Tinder: renderer preserves the complete profile source. Production Utility requests `3:4`, so correct outputs naturally fill the portrait slot.
- TikTok: renderer owns a `9:16` frame and expects a `9:16` request. A landscape test image cannot become a correct TikTok without cropping.
- iMessage/Twitch/Music/Social cover-post media: preserve full source where cropping would remove authored content.
- Identity avatars: request the documented identity-safe composition with headroom.

## Avatar initials

When no image avatar exists and the Surface uses initials, author the intended initials only. Do not include spaces, punctuation, emoji, or profile labels inside the initials field/container.



---

# R3.0 Media Contract Clarification

R3.0 separates two concerns:

1. The Regex must never accidentally clip generated media because a wrapper has the wrong size.
2. The Utility must still request media with the correct semantic content and aspect for its destination.

Production Utility requirements remain:

- Voice Memo avatar: `1:1`, centered contact portrait with full hair/face visible.
- Live Location: `4:3`, top-down contextual map only, never a portrait/photo.
- Tinder: `3:4`, portrait-safe identity image with generous headroom.
- Music / Now Playing: `1:1`, contextual release artwork.
- iMessage media: `4:3`, exact sent attachment.
- Character Profile portrait: `3:4`, complete identity portrait with headroom.
- Album artwork: `1:1`, contextual release artwork.
- Social Profile banner: `3:1`, true wide banner composition.
- Social Profile posts: `1:1`, three independently authored post images.
- Google Images: results must match the actual search query; do not reuse unrelated portraits.
- Phone Gallery: `1:1` square-safe saved photos.

The old shared QA prompt is not valid production Utility output.


---

# R3.1 FORCE-COVER Renderer Policy

All image-bearing Regex renderers now use `object-fit: cover` whenever an
object-fit rule is present.

This intentionally prioritizes filling media containers edge-to-edge. If a
generated source aspect ratio does not match its destination slot, cover will
crop the excess. Utilities should therefore continue to request the documented
slot-specific aspect ratio.


---

# R3.2 Surface Media Ownership

R3.2 uses the approved Tinder image ownership pattern for chronic image boxes:

`Surface media slot → image_request / .reverie-artifact-media → img`

Each layer fills the owning box (`width:100%; height:100%`) and the final image uses
`object-fit:cover; object-position:center center`.

Utilities still MUST request the correct destination aspect. `cover` fills the box;
an incorrectly shaped source will crop by definition.

R3.2 also restores the earlier stable Twitter, Instagram, and YouTube visual families.
Live Location remains fully context-dependent: destination, route, timing, note, and map
come from the authored scene/XML and are never hardcoded by the Regex.


---

# R3.3 Addendum

Preserve-lock: Tinder, Phone Gallery, Google Images, and Social Profile.

The successful Tinder media ownership pattern is extended to Wikipedia, TikTok,
Naver News, Property, Marketplace/eBay, and Twitch.

Property:
- hero image request: 16:9
- three gallery images: 16:9
- thumbnails remain visible on mobile

Marketplace:
- dark-mode renderer
- listing media should describe the actual listed item, not a generic portrait

Live Location:
- popup fills the same phone-screen area as the parent surface
- map, destination, timing, note, and route remain fully context-dependent
- never hardcode test locations

Voice Memo:
- play control toggles an animated multi-bar waveform
- no additional XML is needed for waveform animation

Mobile:
- Character Profile collapses to one column
- Relationship Web removes desktop minimum width and scales nodes/side panel


---

# R3.4 Mobile Layout Contract

## Global mobile sizing

All user-facing Surfaces retain their approved visual design but render at a
smaller proportional scale on narrow screens.

- <= 620px: normal Surface scale target is ~90%
- <= 430px: normal Surface scale target is ~84%
- phone-shaped Surfaces use a gentler reduction so they remain readable

This is a scale/fitting pass, not permission to invent alternate mobile layouts.

## Relationship Web

Relationship Web MUST remain horizontal on mobile:

`relationship map | selected-record panel`

Do not stack the side panel below the graph.

The mobile renderer reduces:
- node dimensions
- node typography
- header padding
- side-panel padding
- relationship-label dimensions

but preserves the graph/node geometry and clickable node behavior.

## Social Profile

Social Profile MUST keep its desktop structure on mobile:

- full-width horizontal banner
- overlapping circular avatar
- profile information beneath/along the banner treatment
- horizontal Posts / About / Media tabs
- three-column Posts grid
- two-column Media grid

Do not replace it with a stacked mobile-card redesign.


---

# R3.5 Character Profile Mobile Lock

Character Profile MUST remain horizontal on mobile.

Required composition:

`portrait | character information`

Do not collapse Character Profile to a one-column portrait-above-copy layout at
any mobile breakpoint or container width.

On narrow screens, reduce portrait width, typography, padding, hook spacing, and
trait-chip dimensions while preserving the horizontal two-column composition.

Relationship Web and Social Profile retain their R3.4 horizontal-mobile locks.


---

# R3.7 Refined Surface Contract

## Outer launcher buttons

All Regex-owned outer launcher pills use shades derived from `var(--lumiverse-primary)`.
They remain centered. Glow is intentionally subtle; text is slightly larger than R3.6.

## Regular vs Primary-All packs

Regular R3.7 keeps recognizable app/surface-specific colors *inside* the surfaces.
Primary-All R3.7 keeps the same layouts but replaces app-specific accent colors with
`var(--lumiverse-primary)`-derived accents. Neutral dark/light backgrounds are preserved.

## Letter

`<letter_dispatch>` is a compact, darker real-letter surface. Body copy is rendered with a
handwritten-style font stack. Utilities should author real paragraph breaks. The Regex also
normalizes a legacy literal `\\n\\n` pair inside `<ld_body>` for compatibility.

Letter media uses the same media-ownership rule as the approved Tinder fix:
`media slot -> image_request/.reverie-artifact-media -> img`, with full width/height,
`object-fit:cover`, and centered positioning.

## Court Transcript

Court Transcript is a dark legal-record surface, not a bright paper sheet. Maintain clear
speaker/time/body columns and readable legal hierarchy.

## Twitter comments

The comments drawer must wrap beneath the engagement row at full post width. Nested comment
and reply transformers must not apply their own mobile zoom; the parent Twitter surface owns
responsive scaling.

## Smartphone image ownership

For clarity, Utilities should author a side on image messages:

- `<s_img side="sent" time="...">...</s_img>` for the user/right side
- `<s_img side="recv" time="...">...</s_img>` for the character/left side

Accepted sent aliases: `sent`, `right`, `user`.
Accepted received aliases: `recv`, `received`, `left`, `char`.
Legacy `<s_img>` without a side remains received for compatibility.

## Social Profile platforms

The renderer accepts arbitrary `platform="..."` strings. Dedicated Regular-pack brand accents
are provided for: Instagram, X/Twitter, TikTok, YouTube, Spotify, Naver, Discord, LinkedIn,
Reddit, and Generic. Primary-All intentionally gives all of them the Lumiverse primary accent.


---

# R3.8 Naming + Variant Contract

## Pack variants

**REALISTIC**
- Uses real-app / real-service dark-mode UI colors where the Surface represents an actual app.
- Examples: Twitter/X blue, Facebook blue, LinkedIn blue, Instagram's native pink/red gradient family.
- `var(--lumiverse-primary)` is not allowed to replace an app's identity color merely for theme consistency.

**PRIMARY**
- Uses `var(--lumiverse-primary)` and Lumiverse-derived shades as the accent authority.
- Layout and app identity remain recognizable, but interactive accents follow the active Lumiverse theme.

## Social Profile

Canonical root:

```xml
<social_profile
  platform="instagram|twitter|facebook|linkedin"
  handle="..."
  name="..."
  verified="true|false">
  <profile_avatar>...</profile_avatar>
  <profile_cover>...</profile_cover>
  <profile_bio>...</profile_bio>
  <profile_stats followers="..." following="..." posts="..." />
  <profile_media>
    <profile_post>...</profile_post>
    <profile_post>...</profile_post>
    <profile_post>...</profile_post>
  </profile_media>
</social_profile>
```

Renderer compatibility MUST accept either:

```xml
<profile_stats followers="..." following="..." posts="..." />
```

or:

```xml
<profile_stats followers="..." following="..." posts="..."></profile_stats>
```

Requested platform variations:
- Instagram
- Twitter / X
- Facebook
- LinkedIn

## Instagram Stories — proposed Surface contract

```xml
<instagram_stories>
  <story owner="@handle" name="Display name" time="12m">
    <avatar>...</avatar>
    <story_media>
      <image_request
        id="..."
        target="custom.artifact-media"
        slot="instagram_story_1"
        aspect="9:16"
        alt="Story image">
        <scene_brief>Context-specific vertical story image. No Instagram UI or generated text.</scene_brief>
      </image_request>
    </story_media>
    <story_caption>Optional short caption</story_caption>
  </story>
</instagram_stories>
```

Story media is always vertical `9:16`. Generated imagery contains scene content only;
the Regex owns Instagram chrome, progress bars, avatar/name/time, reply UI, and controls.


---

# R4.0 FINAL — Profile & Stories Contracts

## Pack definitions

### REALISTIC
Actual app/service dark-mode color identity is authoritative.
- Instagram: black / #121212 / #262626 with native Instagram pink-red-orange gradient accents.
- Twitter/X: black / #2f3336 / #71767b with #1d9bf0 interaction accents.
- Outer Relay-style opener buttons still use `var(--lumiverse-primary)` so Regex launchers visually match Relay.

### PRIMARY
The same layouts are preserved, but surface accents use `var(--lumiverse-primary)` and Lumiverse-derived shades.

The old generic multi-platform `<social_profile>` Surface is removed from R4.0.
Facebook and LinkedIn profile variants are removed.

## Instagram Profile

```xml
<instagram_profile
  handle="@ria_qa"
  name="Ria"
  verified="true"
  bio="Singer · songwriter · Seoul."
  followers="2.8M"
  following="312"
  posts="486">
  <igp_avatar>
    <image_request ... aspect="1:1">...</image_request>
  </igp_avatar>

  <igp_posts>
    <igp_post id="igp1" likes="12.8K" time="2h">
      <igp_media>
        <image_request ... aspect="1:1">...</image_request>
      </igp_media>
      <igp_caption>...</igp_caption>
      <igp_comments>
        <igp_comment user="@viewer_one" time="12m" likes="482">...</igp_comment>
      </igp_comments>
    </igp_post>
  </igp_posts>

  <igp_about>Profile/about copy.</igp_about>

  <igp_media_grid>
    <igp_media_item><image_request ... aspect="1:1">...</image_request></igp_media_item>
  </igp_media_grid>
</instagram_profile>
```

Tabs are rendered by Regex and are clickable: Posts / About / Media.

Instagram Profile requests:
- avatar: 1:1
- every Post image: 1:1
- Media-grid images: 1:1
- no Instagram chrome/text inside generated images

## Twitter / X Profile

```xml
<twitter_profile
  handle="@ria_archive"
  name="Ria Archive"
  verified="true"
  bio="..."
  location="Seoul"
  joined="May 2024"
  followers="812K"
  following="204"
  posts="18.2K">

  <twip_avatar><image_request ... aspect="1:1">...</image_request></twip_avatar>
  <twip_cover><image_request ... aspect="3:1">...</image_request></twip_cover>

  <twip_posts>
    <twip_post id="tw1" time="19m" replies="22" reposts="18" likes="344" views="12.8K">
      <twip_text>Tweet text.</twip_text>
      <twip_media>
        <image_request ... aspect="16:9">...</image_request>
      </twip_media>
      <twip_comments>
        <twip_comment user="Viewer One" handle="@viewer_one" time="12m" likes="82">...</twip_comment>
      </twip_comments>
    </twip_post>

    <!-- Text-only tweet: leave twip_media empty. -->
    <twip_post ...>
      <twip_text>Text-only tweet.</twip_text>
      <twip_media></twip_media>
      <twip_comments>...</twip_comments>
    </twip_post>
  </twip_posts>

  <twip_about>About copy.</twip_about>

  <twip_media_grid>
    <twip_media_item><image_request ... aspect="1:1">...</image_request></twip_media_item>
  </twip_media_grid>
</twitter_profile>
```

Tabs are rendered by Regex and are clickable: Posts / About / Media.

Twitter Profile requests:
- avatar: 1:1
- cover: 3:1
- tweet attachments: 16:9 unless scene context clearly requires 4:3
- Media grid: 1:1

## Instagram Stories

R4.0 production renderer uses exactly three story entries per Stories Surface.

```xml
<instagram_stories>
  <story owner="@ria_qa" name="Ria" time="2h">
    <avatar><image_request ... aspect="1:1">...</image_request></avatar>
    <story_media><image_request ... aspect="9:16">...</image_request></story_media>
    <story_caption>late night Seoul 🌙</story_caption>
  </story>
  ... exactly 3 story entries total ...
</instagram_stories>
```

Regex owns:
- progress bars
- Instagram chrome
- corrected circular avatar/ring
- visible left/right navigation arrows
- caption placement
- reply field / heart / send affordances

Utility owns:
- who posted
- time
- story visual
- caption

Story media MUST be requested as 9:16 and must not contain generated Instagram UI/text.


---

R4.0 regenerated file set. These files were physically created and verified before linking.


---

# R4.1 FINAL — Corrected Profile, Stories, Phone Image, and Launcher Contracts

## Collapsible launcher authority

The **Sparkling** pack uses moving, glowing Lumiverse-primary particles in every user-facing opener. Particles drift independently across the button rather than remaining static dots. The Plain pack uses the same Lumiverse-primary-derived button palette without particles.

## REALISTIC vs PRIMARY

**REALISTIC** uses hardcoded real app dark-mode colors inside real-app Surfaces. The outer Regex opener button still uses Lumiverse primary so it matches Relay.

- Instagram: black / #121212 / #262626, white tab indicators, #0095f6 blue for native action/verification accents, native multicolor story/avatar ring.
- Twitter/X: black / #2f3336 / #71767b with #1d9bf0 interaction accents.

**PRIMARY** preserves the same layouts but replaces app interaction accents with `var(--lumiverse-primary)`-derived shades.

## Instagram Profile

Canonical profile is grid-first, like an actual Instagram profile. There is no About tab; profile information belongs in `bio`.

```xml
<instagram_profile handle="@ria_qa" name="Ria" verified="true"
  bio="Singer · songwriter · Seoul." followers="2.8M" following="312" posts="486">
  <igp_avatar>
    <image_request ... aspect="1:1">...</image_request>
  </igp_avatar>
  <igp_posts>
    <igp_post id="ig1" owner="@ria_qa" likes="12.8K" time="2h">
      <igp_media><image_request ... aspect="1:1">...</image_request></igp_media>
      <igp_caption>Caption.</igp_caption>
      <igp_comments>
        <igp_comment user="@viewer_one" time="12m" likes="482">Comment.</igp_comment>
      </igp_comments>
    </igp_post>
  </igp_posts>
  <igp_media_grid>
    <igp_media_item><image_request ... aspect="1:1">...</image_request></igp_media_item>
  </igp_media_grid>
</instagram_profile>
```

Clickable tabs: **Posts / Media**. Posts renders a 3-column photo grid. Clicking a post thumbnail opens that full post *inside the profile Surface* using the regular Instagram post visual language: header, image, actions, likes, caption, and comments.

## Twitter / X Profile

There is no About tab. Bio/location/join date/stats stay in the profile header.

```xml
<twitter_profile handle="@ria_archive" name="Ria Archive" verified="true"
  bio="Coffee, blueprints, and a deeply unreasonable deadline."
  location="Seoul" joined="May 2024" followers="812K" following="204" posts="18.2K">
  <twip_avatar><image_request ... aspect="1:1">...</image_request></twip_avatar>
  <twip_cover><image_request ... aspect="3:1">...</image_request></twip_cover>
  <twip_posts>
    <twip_post id="tw1" name="Ria Archive" handle="@ria_archive" time="19m"
      replies="22" reposts="18" likes="344" views="12.8K">
      <twip_text>Tweet text.</twip_text>
      <twip_media><image_request ... aspect="16:9">...</image_request></twip_media>
      <twip_comments>
        <twip_comment user="Viewer One" handle="@viewer_one" time="12m" likes="82">Reply.</twip_comment>
      </twip_comments>
    </twip_post>
  </twip_posts>
  <twip_media_grid>
    <twip_media_item><image_request ... aspect="1:1">...</image_request></twip_media_item>
  </twip_media_grid>
</twitter_profile>
```

Clickable tabs: **Posts / Media**. `twip_media` may be empty for a text-only tweet.

## Instagram Stories

Exactly three story records in the current production renderer. Story media is `9:16`; avatar is `1:1`. Regex owns the progress bars, top safe area, circular ring/avatar, visible left/right navigation controls, reply field, heart, and send control.

## Smartphone image direction — REQUIRED

Image-message direction uses the exact same semantic alignment as text messages/iMessage:

- `side="sent"` = **user/focal party sent the image** = RIGHT aligned, no receiver avatar.
- `side="recv"` = **contact/character sent the image** = LEFT aligned, receiver avatar shown.

Aliases remain accepted by Regex: sent/right/user and recv/received/left/char.

**Production Utility MUST always author `side`. Do not emit a standalone image request directly under `<messages>`, and do not emit canonical `<s_img>` without `side`.**

```xml
<messages>
  <s_recv time="12:04">Ready?</s_recv>
  <s_img side="recv" time="12:05">
    <image_request id="phone-recv-1" target="smartphone.message-image" slot="phone_recv_1" aspect="4:3" alt="Photo sent by Contact">
      <scene_brief>Context-specific photo the contact sends in the conversation. Image content only; no phone UI.</scene_brief>
    </image_request>
  </s_img>
  <s_sent time="12:06">Yep.</s_sent>
  <s_img side="sent" time="12:06">
    <image_request id="phone-sent-1" target="smartphone.message-image" slot="phone_sent_1" aspect="4:3" alt="Photo sent by the user">
      <scene_brief>Context-specific photo the user sends in the conversation. Image content only; no phone UI.</scene_brief>
    </image_request>
  </s_img>
</messages>
```

The legacy no-side renderer exists only for old saved chats and falls back to received/left. It is not valid production Utility output.


---

# R4.2 FINAL — AUTHORITATIVE PROFILE / STORIES / SMARTPHONE MEDIA CONTRACTS

This section supersedes earlier profile/stories/phone-image examples in this file.

## Instagram Profile

The old permanent mini-post grid is forbidden.

Canonical XML:

```xml
<instagram_profile
  handle="@ria_qa"
  name="Ria"
  verified="true"
  bio="Singer · songwriter · chronic night owl. Seoul."
  followers="2.8M"
  following="312"
  posts="486">

  <igp_avatar>
    <image_request ... aspect="1:1">...</image_request>
  </igp_avatar>

  <igp_posts>
    <igp_post id="ig1" owner="@ria_qa" likes="12.8K" time="2h">
      <igp_post_avatar>
        <image_request ... aspect="1:1">...</image_request>
      </igp_post_avatar>
      <igp_media>
        <image_request ... aspect="1:1">...</image_request>
      </igp_media>
      <igp_caption>...</igp_caption>
      <igp_comments>
        <igp_comment user="@viewer_one" time="12m" likes="482">...</igp_comment>
      </igp_comments>
    </igp_post>
  </igp_posts>

  <igp_tagged>
    <igp_tagged_item>
      <image_request ... aspect="1:1">...</image_request>
    </igp_tagged_item>
  </igp_tagged>
</instagram_profile>
```

Renderer behavior:
- Profile is compact.
- Bio is left-aligned.
- Tabs are only `Posts` and `Tagged`.
- `Posts` is a clean 3-column square image grid.
- Captions/comments/likes/times are NOT visible in the grid.
- Clicking a Post tile opens its full Instagram-style post modal.
- The modal contains avatar, owner, full image, actions, likes, caption, comments, and time.
- `Tagged` is a separate 3-column square grid.

Image contracts:
- profile avatar 1:1
- per-post avatar 1:1
- post image 1:1
- tagged image 1:1

All rendered image boxes use cover + centered object position.

## Twitter / X Profile

Canonical XML:

```xml
<twitter_profile
  handle="@ria_archive"
  name="Ria Archive"
  verified="true"
  bio="Coffee, blueprints, and a deeply unreasonable deadline."
  location="Seoul"
  joined="May 2024"
  followers="812K"
  following="204"
  posts="18.2K">

  <twip_avatar><image_request ... aspect="1:1">...</image_request></twip_avatar>
  <twip_cover><image_request ... aspect="3:1">...</image_request></twip_cover>

  <twip_posts>
    <twip_post
      id="tw1"
      author="Ria Archive"
      handle="@ria_archive"
      verified="true"
      time="19m"
      replies="22"
      reposts="18"
      likes="344"
      views="12.8K">

      <twip_post_avatar>
        <image_request ... aspect="1:1">...</image_request>
      </twip_post_avatar>

      <twip_text>Tweet text.</twip_text>

      <twip_media>
        <image_request ... aspect="16:9">...</image_request>
      </twip_media>

      <twip_comments>
        <twip_comment user="Viewer One" handle="@viewer_one" time="12m" likes="82">...</twip_comment>
      </twip_comments>
    </twip_post>
  </twip_posts>

  <twip_media_grid>
    <twip_media_item>
      <image_request ... aspect="1:1">...</image_request>
    </twip_media_item>
  </twip_media_grid>
</twitter_profile>
```

Renderer behavior:
- compact profile width
- bio ALWAYS left-aligned
- tabs only `Posts` and `Media`
- tweets use proper avatar/name/handle/time hierarchy
- comments are nested cleanly under each tweet
- empty `<twip_media></twip_media>` means text-only tweet
- Media tab is a square 3-column covered grid

## Instagram Stories

Exactly three stories for this renderer.

```xml
<instagram_stories>
  <story owner="@ria_qa" name="ria_qa" time="2h">
    <avatar><image_request ... aspect="1:1">...</image_request></avatar>
    <story_media><image_request ... aspect="9:16">...</image_request></story_media>
    <story_caption>...</story_caption>
  </story>
  ... exactly 3 total ...
</instagram_stories>
```

Rules:
- story media MUST fill the entire story frame from top edge to bottom edge
- no blank/gap area above media
- story avatar is a centered covered 1:1 circle
- visible left/right navigation arrows are rendered by Regex
- opener button uses Lumiverse primary color in Plain and Sparkling
- Sparkling opener MUST contain moving glowing particles
- Realistic story UI keeps actual Instagram dark-mode styling
- Primary story UI uses Lumiverse accent variables

## Smartphone Image Messages

Direction is semantic and mandatory.

Canonical:

```xml
<s_img side="sent" time="12:05">
  <image_request
    id="..."
    target="smartphone.message-image"
    slot="..."
    aspect="4:3"
    alt="...">
    <scene_brief>...</scene_brief>
  </image_request>
</s_img>
```

or:

```xml
<s_img side="recv" time="12:04">
  <image_request ... aspect="4:3">...</image_request>
</s_img>
```

Direction:
- `side="sent"` / `side="right"` / `side="user"` = RIGHT aligned
- `side="recv"` / `side="received"` / `side="left"` / `side="char"` = LEFT aligned

The image bubble uses a 4:3 visual box with `object-fit:cover; object-position:center`.
The sent image gets the sent/right bubble corner treatment.
The received image gets the received/left bubble corner treatment plus receiver avatar.
The Utility MUST NOT omit `side` for newly authored smartphone image messages.


---

# R4.3 AUTHORITATIVE CORRECTION

This section supersedes earlier R4.2 examples for Instagram Profile, Twitter Profile,
Instagram Stories, and smartphone image rendering.

## Instagram Profile

Tabs: `Posts` and `Tagged` only.

Posts grid:
- 3 columns.
- square 1:1 tiles.
- grid itself contains imagery only.
- likes/caption/comments/time MUST NOT be permanently rendered beneath grid tiles.
- clicking a Post tile opens the post detail INSIDE the Instagram Profile surface.
- the post detail MUST NOT use a viewport/fixed modal.

Post detail:
- owner avatar + handle header
- full 1:1 covered post image
- Instagram actions
- likes
- caption
- comments in compact rows
- timestamp
- close control
- contained and scrollable if needed

Canonical post:

```xml
<igp_post id="ig1" owner="@ria_qa" likes="12.8K" time="2h">
  <igp_post_avatar>
    <image_request ... aspect="1:1">...</image_request>
  </igp_post_avatar>
  <igp_media>
    <image_request ... aspect="1:1">...</image_request>
  </igp_media>
  <igp_caption>Late-night walk before the rain.</igp_caption>
  <igp_comments>
    <igp_comment user="@viewer_one" time="12m" likes="482">the lighting??? hello???</igp_comment>
  </igp_comments>
</igp_post>
```

Tagged:
```xml
<igp_tagged>
  <igp_tagged_item><image_request ... aspect="1:1">...</image_request></igp_tagged_item>
</igp_tagged>
```

Every grid/post/avatar box is renderer-owned and uses centered `cover`.

## Twitter / X Profile

Tabs: `Posts` and `Media`.

Replies are collapsed by default.
Each tweet renders a `View replies · N` control.
Comments/replies become visible only after that control is clicked.

Tweets MAY be:

1. Media tweet:
```xml
<twip_media><image_request ... aspect="16:9">...</image_request></twip_media>
```

2. Text-only tweet:
```xml
<twip_media></twip_media>
```

3. Thread:
```xml
<twip_thread>
  <twip_thread_item author="Ria Archive" handle="@ria_archive" time="18m" likes="91">
    second tweet in the thread
  </twip_thread_item>
  <twip_thread_item author="Ria Archive" handle="@ria_archive" time="17m" likes="74">
    third tweet in the thread
  </twip_thread_item>
</twip_thread>
```

For non-thread posts, author:
```xml
<twip_thread></twip_thread>
```

Complete post child order is:

```xml
<twip_post_avatar>...</twip_post_avatar>
<twip_text>...</twip_text>
<twip_media>...</twip_media>
<twip_comments>...</twip_comments>
<twip_thread>...</twip_thread>
```

Media tab:
- strict 3-column square grid
- every item is exactly 1:1
- every child image fills the square using centered cover
- no intrinsic-image-height rows

## Instagram Stories

The production renderer is ordered before the old standalone Stories prototype so stale
test Regexes cannot consume `<instagram_stories>` first.

Rules:
- exactly 3 stories
- 9:16 full-bleed story image from the absolute top edge to bottom edge
- no top media gap
- avatar is a true 1:1 covered circle inside the Instagram ring
- visible left/right navigation arrow controls
- Plain and Sparkling use the same Lumiverse-primary opener geometry as Instagram/Twitter Profile
- Sparkling opener contains moving glowing particles, not static decoration

## Smartphone message images

Existing sent/received directional semantics remain authoritative.

Both sent and received image bubbles:
- use a renderer-owned 4:3 box
- child media is absolutely pinned to all four edges
- `object-fit:cover`
- centered object position

Direction:
- sent = right
- recv = left


---

# R4.4 Typography + Twitter Avatar Correction

## Typography

All Surface layouts retain their existing width, height, grid, image-box, and mobile sizing.

The renderer increases explicit Surface typography by approximately 10% for readability.
This is a font-size correction only and MUST NOT be interpreted as permission to enlarge
the Surface containers.

## Twitter / X Profile avatar

The Twitter/X profile avatar follows the same media ownership strategy used successfully
for Instagram:

- circular outer avatar box
- child media inset inside the circle
- renderer owns width and height
- generated image fills that owned inner circle
- `object-fit: cover`
- `object-position: center center`
- no intrinsic image dimensions may reposition or shrink the avatar

Tweet-row avatars also use centered circular cover.


---

# R4.5 FINAL PRESENTATION / COLOR CONTRACT

This section defines the final six-pack product model.

## One XML contract, six renderer packs

Utilities author the same semantic XML regardless of presentation or color mode.
Presentation and color are renderer choices only.

### Presentation mode

1. `inline`
   - Surface renders directly in the assistant message.
   - No outer open/close launcher.

2. `plain_button`
   - Surface is hidden behind a compact centered pill launcher.
   - Launcher expands/collapses the Surface.
   - No animated particles.

3. `sparkle_button`
   - Same expand/collapse presentation behavior and geometry as Plain Button.
   - Launcher contains moving glowing particles.
   - Particles belong ONLY to the OUTER Surface launcher.
   - Internal UI controls such as Twitter repost, comments, likes, tabs, Follow,
     Reply, or media controls MUST NOT sparkle.

### Color mode

1. `realistic`
   - Actual branded app/service Surfaces use their real dark-mode UI identity.
   - Examples: Twitter/X blue, Instagram native dark styling and Instagram
     accent family, Twitch purple, YouTube red where appropriate.
   - Do not recolor the entire app shell to Lumiverse primary.
   - Outer Relay-style launchers may still use Lumiverse primary so launchers
     visually match Relay.

2. `primary`
   - Same HTML/layout/interaction contracts.
   - Surface accent colors use `var(--lumiverse-primary)` and derived
     `color-mix()` shades.
   - This is the themed/Lumiverse-color option.

## Final six combinations

- Inline + Realistic
- Plain Button + Realistic
- Sparkle Button + Realistic
- Inline + Primary
- Plain Button + Primary
- Sparkle Button + Primary

Only ONE combination should be active for a rendered Surface at a time.

## Alignment polish

R4.5 explicitly left-aligns content text for:
- regular Twitter/X and Twitter Profile
- TikTok username/caption/comments/add-comment
- Google Images query/result captions
- Discord messages
- Newspaper article text
- Property listing text
- Notes
- Live Location chat/tracker copy
- Twitch
- Email
- Reddit
- YouTube title/comments

Tabs, centered app mastheads, icon buttons, and deliberately centered launcher labels
remain centered where appropriate.

Email inbox list rows are slightly taller so sender, subject, and preview copy remain visible.
