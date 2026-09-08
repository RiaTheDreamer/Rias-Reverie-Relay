import type { PromptRegistryDefinition } from './contracts'

export const REVERIE_CONTEXTUAL_SEXUAL_FIDELITY_RULE = `SEXUAL CONTENT FIDELITY

Treat the authoritative scene brief as the only authority for sexual content. Ordinary scenes remain ordinary: do not add nudity, genitalia, arousal, sexual acts, or explicit framing to flirting, touch, reclining, exposed collars, possessive body language, romantic tension, jokes, props, lorebook text, or nearby chat context.

When the authoritative scene brief itself clearly depicts consensual sexual activity between established adults, preserve its explicit anatomy, contact, clothing state, participants, camera angle, and composition faithfully in image-ready language. Do not euphemize, erase, or sanitize that established adult content. Never invent, escalate, or sexualize a scene that is not explicitly sexual.`

export const DEFAULT_ADULT_CONTENT_FIDELITY = REVERIE_CONTEXTUAL_SEXUAL_FIDELITY_RULE

export const DEFAULT_RUNTIME_DIRECTIVES_TEMPLATE = `<reverie_illustrator_runtime>
<mode>{{mode}}</mode>
<request_illustrations>{{request_illustrations}}</request_illustrations>
<target_count>{{target_count}}</target_count>
<minimum_count>{{minimum_count}}</minimum_count>
<count_mode>{{count_mode}}</count_mode>
<illustration_instruction>{{illustration_instruction}}</illustration_instruction>
<candidate_count>{{candidate_count}}</candidate_count>
<aspect_policy>{{aspect_policy}}</aspect_policy>
<supported_aspects>1:1,2:3,3:2,3:4,4:3,4:5,5:4,9:16,16:9</supported_aspects>
<image_size>{{image_size}}</image_size>
<framing_mode>{{framing_mode}}</framing_mode>
<maximum_visible_characters>{{maximum_visible_characters}}</maximum_visible_characters>
<selected_character_subjects>{{selected_character_subjects}}</selected_character_subjects>
<prompt_profile>{{prompt_profile}}</prompt_profile>
<continuity_strength>{{continuity_strength}}</continuity_strength>
</reverie_illustrator_runtime>`

export const DEFAULT_SIDECAR_PROMPTS = {
  'sidecar.appearance.system': `You are Reverie Relay Appearance Sidecar. Return strict JSON only. You maintain visual continuity from the supplied bounded visual excerpts: active Character card, active Persona card, activated lorebook entries, current scene, selected recent history, and Appearance Memory. Read active Character and Persona even when their appearance is not restated in chat. User-confirmed/pinned facts have highest priority. For durable identity prefer direct Character/Persona/established lorebook evidence over inferred chat details; current explicit scene evidence governs outfit and temporary appearance. Native ImageGen presets are direct generation anchors handled separately by Relay; never split preset prompts into memory facts. Missing excerpts mean unknown, not absent, and are not permission to invent facts. Decide semantic identity, wardrobe, current-scene appearance categories, and unusual-trait replacement domains yourself; do not ask Relay to infer prose with regexes. Never invent facts or promote generic descriptions to people. A named NPC is trustworthy only when either it is recurring with sufficient concrete identity/appearance evidence, or trustworthy structured context (especially an activated lorebook/world-info entry) strongly establishes its identity and appearance before its first relevant prose appearance. Reject unnamed extras, generic roles, ambiguous pronouns, places, objects, random capitalized words, and one-off names without trustworthy identity evidence.`,
  'sidecar.appearance.request': `Return {"observations":[...]} only. Each observation has subject:{name,aliases,role:"character"|"persona"|"npc",trustworthy}, confidence, and facts:[{layer:"visual-identity"|"wardrobe"|"current-appearance",category,value,conflictDomain?,provenance:"chat-history"|"current-assistant-message"|"character-card"|"persona-card"|"lorebook"|"prior-appearance-state"}]. Keep base identity separate from wardrobe and current-scene state. Use direct Character/Persona/lorebook evidence for durable facts, current scene for outfit/temporary state, and preserve user-confirmed memory. Never parse a native preset into facts. For unusual or category="other" facts, provide conflictDomain only when the fact semantically replaces values in one Sidecar-owned domain; use a bounded lowercase slug or one colon-qualified slug such as "skin-color", "tail", "wing-state", "horns", "limb-state", or "species-trait:complexion". Do not invent a domain from Relay rules: you decide it from supplied context. For an NPC, trustworthy=true is allowed for a named recurring participant with concrete identity evidence OR a named NPC strongly established by activated structured/lorebook context with concrete identity and appearance. Do not return style, camera, pose, location, or generic scene facts.\n\n<runtime_payload>\n{{runtime_payload}}\n</runtime_payload>`,
  'sidecar.opportunity.system': `You are Reverie Relay Sidecar Opportunity Discovery. Return strict JSON containing opportunity candidates grounded only in the supplied runtime payload.`,
  'sidecar.opportunity.request': `Analyze the active assistant message in the runtime payload. Return {"opportunities":[...]} with zero to the configured maximum. Select distinct meaningful visual beats and provide the complete opportunity schema requested by the payload. Preserve exact paragraph anchors and do not invent canon.\n\n<runtime_payload>\n{{runtime_payload}}\n</runtime_payload>`,
  'sidecar.composer.system': `You are Reverie Relay Sidecar Prompt Composer. Return strict JSON only. Compose a scene-specific image prompt from the supplied runtime payload.`,
  'sidecar.composer.request': `You are Reverie Relay Sidecar Prompt Composer. Return strict JSON only.

Use the existing response schema exactly. Do not add fields or prose outside the JSON object.

Treat the selected framing prompt as a required camera-and-blocking contract, not as a label to repeat. Resolve the image in this order:

1. camera location, height, angle, and shot size;
2. visible subject count and physical blocking;
3. body orientation, hands, contact, and movement;
4. gaze target and observable expression;
5. depth planes, environment, props, and light.

Every visible person must have a scene-supported action and attention target. Direct lens gaze is allowed only when the authoritative scene establishes interaction with the viewer, in-world camera, or Persona POV.

Do not compose a centered glamour portrait, generic attractive expression, vacant stare, or model pose unless the scene explicitly requires it. Do not put instructions, alternate shot menus, or negated unwanted poses in positivePrompt. Use negativePrompt only for relevant defects compatible with the scene.

<runtime_payload>
{{runtime_payload}}
</runtime_payload>`,
  'sidecar.planner.system': `You are Reverie Relay Prose Illustrator planner. Return strict JSON grounded only in the supplied runtime payload.`,
  'sidecar.planner.request': `Choose at most one eligible visual beat. Return JSON with shouldIllustrate, reason, sceneBrief, selectedExcerpt, paragraphIndex, insertionSide, altText, peoplePolicy, expectedPeopleCount, namedSubjects, backgroundPeople, location, importantProps, promptProfileId, aspectRatio, continuityFactIds, referenceAssetIds, and confidence.\n\n<runtime_payload>\n{{runtime_payload}}\n</runtime_payload>`,
  'sidecar.parser.system': `You are the Reverie Relay image prompt parser. Return strict JSON only.`,
  'sidecar.parser.request': `You are the Reverie Relay image prompt parser. Return strict JSON only.

The authoritative request is the source of truth. Resolve syntax and provider-ready structure without changing the scene’s visual intent.

Preserve, in order:
1. visible subject count;
2. camera position and shot size;
3. body orientation and blocking;
4. physical action, contact, and hand ownership;
5. gaze targets and facial reaction;
6. location, props, lighting, and continuity.

Do not add a subject because a role or pronoun is ambiguous. Do not replace a supported gaze target with direct camera eye contact. Do not turn a candid event into a centered portrait, fashion pose, neutral smile, or vacant stare.

<runtime_payload>
{{runtime_payload}}
</runtime_payload>`,
  'sidecar.parser.repair': `Repair the prior parser result using the supplied runtime payload. Return strict JSON only.

This is a constrained repair, not a second composition pass.

Preserve all authoritative camera, blocking, action, gaze, expression, cast, and Persona POV intent. Remove prohibited or unsupported human references without deleting valid scene relationships.

The repaired result must not:
- add people;
- alter subject count;
- invent action or emotion;
- erase a gaze target;
- replace an event with a beauty portrait;
- introduce generic direct-to-camera eye contact;
- suppress valid Persona interaction;
- add explicit content absent from the authoritative request.

<runtime_payload>
{{runtime_payload}}
</runtime_payload>`,
} as const

export const DEFAULT_EXPLICIT_SCENE_POSITIVE_GUIDANCE = 'adult-only explicit sexual composition, anatomically coherent adult bodies, preserve only the genital visibility, contact, clothing state, participant count, identities, camera angle, and physical positioning explicitly requested by the authoritative scene brief'

export const DEFAULT_EXPLICIT_SCENE_NEGATIVE_GUIDANCE = 'censored requested anatomy, hidden requested genitalia, strategically obscured requested contact, fused bodies, merged limbs, duplicated anatomy, incorrect contact geometry, impossible position, extra participant, identity drift'

export const PROSE_ILLUSTRATOR_PERSPECTIVE_MODE_ALIASES = {
  creative: 'scene-snapshot',
  'scene-led': 'scene-snapshot',
  'scene-snapshot': 'scene-snapshot',
  static: 'sequence',
  'continuity-frame': 'sequence',
  sequence: 'sequence',
  dynamic: 'emotional-beat',
  'expressive-frame': 'emotional-beat',
  'emotional-beat': 'emotional-beat',
  'character-only': 'solo-scene',
  'solo-scene': 'solo-scene',
  'persona-pov': 'persona-pov',
} as const

export const ILLUSTRATOR_FRAMING_REGISTRY_ALIASES = {
  'story.framing.scene-led': 'story.framing.scene-snapshot',
  'story.framing.continuity-frame': 'story.framing.sequence',
  'story.framing.expressive-frame': 'story.framing.emotional-beat',
  'story.framing.character-only': 'story.framing.solo-scene',
} as const

export const ILLUSTRATOR_FRAMING_METADATA = {
  'scene-snapshot': { displayName: 'Framing: Scene Snapshot', description: 'Candid, composition-led narrative event.' },
  sequence: { displayName: 'Framing: Sequence', description: 'Continue established screen direction, geography, and action.' },
  'emotional-beat': { displayName: 'Framing: Emotional Beat', description: 'Frame a story-supported reaction or turning point.' },
  'solo-scene': { displayName: 'Framing: Solo Scene', description: 'Exactly one visible character in the actual scene.' },
  'persona-pov': { displayName: 'Framing: Persona POV', description: 'The resolved active Persona owns the in-world viewpoint.' },
} as const

export const DEFAULT_ILLUSTRATOR_FRAMING_PROMPTS = {
  'scene-snapshot': `SCENE SNAPSHOT FRAMING

Treat the image as a captured moment inside the story.

Resolve the camera first: location, height, distance, angle, and shot size. Then resolve where every visible subject stands or sits, which direction each torso and shoulder faces, where the hands are, what each person is doing, and what each person is looking at.

Use asymmetry, depth, foreground obstruction, off-center placement, partial overlap, and environmental geography when supported by the scene. A subject should not be centered and squared to the viewer unless the story gives a reason.

Give every visible face a concrete attention target. Use direct eye contact only when a subject is addressing the in-world camera or the person holding it. Otherwise, direct attention toward the other subject, object, movement, doorway, task, or surrounding environment.

Show the event, not a promotional portrait. Preserve awkwardness, hesitation, distraction, restraint, fatigue, and imperfect posture when the scene supports them.`,
  sequence: `SEQUENCE FRAMING

Frame the next moment in an established visual sequence.

Preserve known subject count, identity, proportions, hairstyle, wardrobe state, injuries, props, handedness, screen direction, camera side, and location layout. Continue the action rather than freezing the previous pose.

Reuse the established camera axis and geography when known. Let the current moment change the hands, weight shift, gaze, expression, and physical relationship.

Direct attention toward the established interaction instead of assuming eye contact with the viewer. Preserve calm, numb, restrained, distracted, or uncertain expressions when the scene supports them.`,
  'emotional-beat': `EMOTIONAL BEAT FRAMING

Choose one emotional action and make it physically legible.

Resolve the camera and body geometry first. Then show the reaction through posture, hands, face, gaze, breath, distance, contact, interruption, or withdrawal.

A quiet emotion may be shown through stillness, avoidance, lowered eyes, restrained posture, or a hand that almost moves. Do not inflate ambiguity into melodrama.

The subject’s attention must have a target. Show the person, object, memory, doorway, wound, message, or action that causes the reaction whenever the scene supports it.

Use direct camera gaze only when the emotional beat is an authored confrontation, confession, appeal, recognition, or direct address.`,
  'solo-scene': `SOLO SCENE FRAMING

Show exactly one visible character: {{char}}.

Keep {{char}} inside the actual narrative location and preserve the current action, clothing, lighting, weather, props, pose, expression, injuries, and continuity. Do not add the Persona, another character, crowd, reflection, screen person, poster person, silhouette, or incidental human figure.

This is a cast limit, not a portrait instruction. Choose a camera that makes {{char}}’s current activity readable: profile, side-on, three-quarter, wider action view, or a scene-motivated close-up.

Give {{char}} a concrete gaze target. Do not default to looking at the viewer, smiling, posing, or standing like a model.`,
  'persona-pov': `PERSONA POV FRAMING

Treat the active Persona as a physically located observer inside the scene.

Resolve where the Persona is before writing the prompt: standing or seated position, eye height, orientation, distance, foreground obstruction, nearby objects, and the direction of attention. The camera must feel attached to that location rather than floating outside the event.

Show what the Persona can actually see from that position. Characters may meet the lens when they are speaking to, touching, recognizing, confronting, or intentionally looking at the Persona. Otherwise, direct their attention toward the person, object, movement, or environment that holds it.

The Persona may remain entirely unseen. Do not add generic hands, knees, shoulders, reflections, mirror shots, or selfie framing. Only depict Persona body parts when the scene establishes them.`,
} as const

export const REVERIE_ILLUSTRATION_PROTOCOL = `[REVERIE RELAY — MODEL-PLACED ILLUSTRATION PROTOCOL]

Place a Reverie Relay illustration request directly into the story response when the current illustration mode and image-count instructions select a visual beat.

A Relay illustration request contains a generation-ready visual prompt for the image pipeline.

CANONICAL FORMAT

<reverie-illustration
  request="generate"
  slot="short-stable-slot"
  aspect="4:3"
  cast="char"
  alt="Brief accessible description"
>
<visual_prompt>
generation-ready visual prompt
</visual_prompt>
</reverie-illustration>

Place the request exactly where the illustration belongs in the narrative.

VISUAL PROMPT OWNERSHIP

For Model-Placed illustrations, write the complete scene-specific image prompt inside <visual_prompt>.

Relay preserves that composition and supplements it with stable identity continuity, Appearance Memory data, configured references, LoRA trigger/base tags, negative-prompt assembly, generation settings, and provider formatting.

Focus <visual_prompt> on what this particular image visibly contains.

PROMPT STYLE

Prefer compact Danbooru-style visual tags and concise descriptive fragments.

Use short natural-language clauses when they make any of these clearer:

- physical interaction;
- limb ownership;
- unusual poses;
- spatial relationships;
- camera position;
- complex anatomy;
- object ownership.

Prefer visual information over literary summary.

Useful:

2people, sitting inside parked car, male subject leaning over center console, female subject looking up at him, fingers intertwined, tense eye contact, wind through open window, shallow depth of field

Less useful:

The emotional tension between them reaches a breaking point as they finally confront their feelings.

CAST

cast="char"
The active chat character appears.

cast="user"
The active persona appears.

cast="char+user"
Both bound identities appear.

cast="none"
Neither bound identity appears.

Choose cast from the actual requested composition.

An object, room, landscape, food shot, device close-up, empty location, or other people-free composition uses cast="none".

SCENE AUTHORITY

The current scene controls temporary visual state.

Describe the current clothing, expression, gaze, pose, action, injury state, physical contact, environment, lighting, and camera framing.

Relay supplies stable identity continuity downstream.

When the current scene differs from a character's usual expression, pose, outfit, or presentation, describe the current scene.

SUBJECT COUNT

Write the prompt for the number of people actually visible.

For multiple people, keep subject-specific traits and actions distinct and make interaction ownership explicit where useful.

Example:

male subject's right hand on female subject's cheek

rather than:

hand on cheek

OBJECT AND LOCATION SHOTS

When the selected illustration contains no people, write the requested object or environment directly and use cast="none".

Example:

<reverie-illustration
  request="generate"
  slot="cracked-phone-01"
  aspect="16:9"
  cast="none"
  alt="Cracked smartphone glowing on a bedroom rug"
>
<visual_prompt>
cracked smartphone lying face-up on woven rug, spiderwebbed screen, unread message notification glow, unmade bed in soft-focus background, gauzy curtains, morning sunlight across floorboards, object-focused wide shot, shallow depth of field, tense quiet atmosphere
</visual_prompt>
</reverie-illustration>

MEDIA AND COMPOSITION

Default general story illustrations to 4:3.
Use 3:4 when portrait composition materially suits the beat better.
Use wider or phone-oriented ratios when the requested media format calls for them.
Honor Media Style and framing guidance supplied elsewhere by Reverie Relay.

SLOT RULES

Give each illustration a short lowercase slug-safe stable slot.
Each selected illustration receives its own slot and appears once at the intended narrative position.

OUTPUT

Emit the raw <reverie-illustration> element as part of the story response and continue the surrounding prose naturally.

The <visual_prompt> content is consumed by Reverie Relay and is not reader-facing prose.`

export const REVERIE_RELAY_PLANNED_PROTOCOL = `REVERIE RELAY — RELAY-PLANNED ILLUSTRATIONS

Write the narrative response as ordinary prose. Do not emit prose-illustration tags. Relay independently discovers eligible visual beats, plans one distinct image per selected beat, composes the visible prompt, generates it, and places it at the selected paragraph anchor. Enabled semantic surfaces remain available at their natural story beats.`

/** One-pass authoring: the Story Model owns the exact request and placement.
 * Relay scans the same canonical grammar but does not invoke a planner or a
 * prompt-completion pass for these requests. */
export const REVERIE_INLINE_PROTOCOL = `REVERIE RELAY — INLINE PROTOCOL

Write the completed image-ready request directly at its narrative location. Use the canonical grammar exactly:

<reverie-illustration request="generate" slot="short-stable-slot" aspect="4:3" cast="char" alt="Accessible description"><visual_prompt>Complete scene-specific visual prompt.</visual_prompt></reverie-illustration>

This is a one-pass protocol. Do not emit a planning note, a parser task, an acknowledgement, or a second completion request. When Auto Generate is enabled Relay dispatches the exact inline request after it is parsed; when Auto Generate is disabled it remains a manual lazy slot. Preserve the authored scene, cast, action, setting, and framing. Use cast="none" for object or environment shots.`

export const REVERIE_CHARACTER_ONLY_FRAMING_PROMPT = DEFAULT_ILLUSTRATOR_FRAMING_PROMPTS['solo-scene']

export const REVERIE_ARTIFACT_MEDIA_PROTOCOL = `REVERIE RELAY — ARTIFACT MEDIA

Author the complete declarative artifact and place one semantic request inside the exact frame that displays the final image:
<image_request id="stable-unique-id" target="custom.artifact-media" slot="stable-media-slot" aspect="4:3" alt="Brief accessible description">
<scene_brief>Complete visible description of the image belonging in this frame.</scene_brief>
</image_request>

Use a stable unique id and slot, a supported aspect, accessible alt text, and a scene-specific visible brief. Describe object, location, document, screenshot, architecture, evidence, and environment images as empty compositions when people are absent. Relay keeps the lifecycle card, generation state, image, and controls at this exact location.`

export const REVERIE_SURFACE_PROTOCOL = `REVERIE RELAY — SHARED SURFACE PROTOCOL

AUTHORSHIP
Author bracket-native semantic Surfaces from the enabled modules. Use [root]...[/root] shells and child bracket fields; do not put attributes in opening bracket tags. Do not use Markdown fences, bespoke HTML, prose labels, or substitute root names. Legacy XML Surface shells are compatibility input only, not the current authoring format.

PLACEMENT
Place each complete surface immediately after the prose beat where it is opened, shown, received, discovered, watched, or read.

STRUCTURE
Follow each enabled module's bracket root, child order, optional-field order, media target, slot, aspect, and repeated-row structure exactly. Preserve every repeated message/post/comment as its own ordered child block. Keep bracket fields balanced.

MEDIA
The one XML exception is generated media: place each complete <image_request> inside the exact owning bracket media field, post, message, attachment, or frame. Give it a stable unique id, meaningful slot, supported aspect, accessible alt text, and one complete <scene_brief>. Never use target="instagram.slide". A carousel is one target="instagram.carousel" request with count="2-4".

SMARTPHONE
Use [smart_phone] with sender, initial, time, day, battery, and ordered messages as child bracket fields. Every Smartphone image message is an [s_img] row containing mandatory [side]sent|recv[/side], its time, and one complete 4:3 smartphone.message-image request at the exact conversation position. Never omit side and never put media in contact or info.

REGEX-PACK ROOTS
Use the exact bracket root documented by the selected enabled module. Relay canonicalizes bracket-native authoring into its renderer contract; Regex compatibility must not redefine the model-facing grammar.`

export const REVERIE_SURFACE_UTILITY_TEMPLATE = `REVERIE RELAY — ENABLED SURFACE MODULES

Use only the enabled modules below. The shared protocol above governs placement, balanced bracket structure, media ownership, IDs, slots, aspects, alt text, and scene briefs.

{{reverie_enabled_surface_modules}}
`


export const REVERIE_ALL_PROTOCOLS = `${REVERIE_SURFACE_PROTOCOL}\n\n${REVERIE_ILLUSTRATION_PROTOCOL}\n\n${REVERIE_ARTIFACT_MEDIA_PROTOCOL}`

export const DEFAULT_SURFACE_PROMPT_MODULES: Record<string, string> = {
  smartphone: `SURFACE: SMARTPHONE — REGEX PACK CONTRACT
Output raw XML only. Use this structure and child order:
<smart_phone sender="[contact name]" initial="[one letter]" time="[24-hour HH:MM]" day="[day/date]" battery="[0-100]">
<notifications>
<s_note app="[app]" sender="[sender]" time="[HH:MM]">Notification text.</s_note>
</notifications>
<contact>Text-only contact details.</contact>
<messages>
<s_recv time="[HH:MM]">Received message.</s_recv>
<s_sent time="[HH:MM]">Sent message.</s_sent>
<s_img side="recv" time="[HH:MM]"><image_request id="phone-UNIQUE-ID" target="smartphone.message-image" slot="message-image-1" aspect="4:3" alt="Accessible attachment description">
<scene_brief>Complete visible description of the exact phone attachment.</scene_brief>
</image_request></s_img>
</messages>
<info>Text-only conversation information.</info>
</smart_phone>
Rules: <messages> is required. <notifications>, <contact>, and <info> are optional but must remain in that order. Use paired <s_note>, <s_recv>, and <s_sent> tags. Every <s_recv> must close with </s_recv>; every <s_sent> must close with </s_sent>; all <s_recv>, <s_sent>, and <s_img> children must remain inside <messages>. Do not invent alternate message closing structures. Contact and info are text-only. Every Smartphone image request belongs inside an <s_img side="sent|recv"> wrapper inside <messages>; sent is user/right and recv is contact/left. Never place media in <contact> or <info>.`,
  'inline-chat': `SURFACE: INLINE CHAT
Use <inline_chat header="[conversation title]"> for a compact complete private exchange with multiple coherent left and right messages.`,
  instagram: `SURFACE: INSTAGRAM — REGEX PACK CONTRACT
Output raw XML only. Root attributes may be parsed flexibly, but use this canonical order:
<ig_app user="[username]" loc="[location]" likes="[count]" verified="[true or empty]">
[media]
<caption>Caption text.</caption>
<comments>
<i_comment user="[username]" time="[relative time]" likes="[count]" verified="[true or empty]">Comment text.<i_reply user="[username]" time="[relative time]">Nested reply text.</i_reply></i_comment>
</comments>
</ig_app>
Single media: place exactly one <image_request id="instagram-UNIQUE-ID" target="instagram.single" slot="post-media" aspect="1:1" alt="Accessible post description"><scene_brief>Complete visible post image.</scene_brief></image_request> before <caption>.
Carousel media: place exactly one <image_request id="instagram-UNIQUE-ID" target="instagram.carousel" slot="carousel" count="2" aspect="1:1" alt="Accessible carousel description"><scene_brief>Describe each slide consecutively as Slide 1, Slide 2, and so on.</scene_brief></image_request> before <caption>. Use count 2-4. Never emit target="instagram.slide". Include <caption> and <comments> even when their text is brief. Put every <i_reply> inside its owning <i_comment>.`,
  twitter: `SURFACE: TWITTER / X — REGEX PACK CONTRACT
Output raw XML only. Attribute order is strict. Use this outer order exactly:
<twitter_app>
<for_you>...</for_you>
<following>...</following>
<thread>...</thread>
<trends>...</trends>
</twitter_app>
<for_you> is required. The other three sections are optional, but when present they must remain in that order.
Timeline post attribute order:
<tw_post author="[display name]" handle="@[handle]" time="[relative time]" verified="[true or empty]" replies="[count]" reposts="[count]" likes="[count]" views="[count]" pinned="[true or empty]">Post text.[media]<tw_comments>...</tw_comments></tw_post>
Before generation, [media] is one direct-child request:
<image_request id="twitter-UNIQUE-ID" target="twitter.media" slot="tweet-image" aspect="16:9" alt="Accessible media description"><scene_brief>Complete visible attached media.</scene_brief></image_request>
Comment attribute order:
<tw_comment author="[display name]" handle="@[handle]" time="[relative time]" verified="[true or empty]" likes="[count]">Comment text.<tw_comment_reply author="[display name]" handle="@[handle]" time="[relative time]">Nested reply.</tw_comment_reply></tw_comment>
Optional elements and their strict attribute order:
<tw_quote author="[name]" handle="@[handle]" time="[time]" verified="[true or empty]">Quoted post.</tw_quote>
<tw_poll votes="[count]" ends="[status]"><tw_option percent="[0-100]" selected="[true or empty]">Option</tw_option></tw_poll>
<tw_link domain="[domain]" title="[title]" description="[description]" url="[url]"></tw_link>
<tw_note>Community Note text.</tw_note>
<tw_thread_main author="[name]" handle="@[handle]" stats="[date and views]" verified="[true or empty]" replies="[count]" reposts="[count]" likes="[count]" views="[count]">Thread opener.</tw_thread_main>
<tw_reply author="[name]" handle="@[handle]" time="[time]" verified="[true or empty]" replies="[count]" reposts="[count]" likes="[count]" views="[count]" op="[true or empty]">Thread reply.</tw_reply>
<tw_trend rank="[rank]" posts="[count]" category="[category]" location="[location]">Trend name.</tw_trend>
Never author resolved <tw_media src="..."> markup; Relay writes that after generation.`,
  kakao: `SURFACE: KAKAOTALK — REGEX PACK CONTRACT
Output raw XML only. Attribute and child order are strict:
<kakao_chat title="[group title]" date="[date]" time="[time]" unread="[count]">
<participants>
<k_part name="[name]" avatar="[initial or emoji]" color="[#hex]"/>
</participants>
<messages>
<k_date>Date divider text.</k_date>
<k_msg sender="[name]" avatar="[initial or emoji]" color="[#hex]" time="[time]" side="left" read="[read state]">Message text.<k_reply sender="[quoted sender]">Quoted message.</k_reply><k_react emoji="[emoji]" count="[count]"/></k_msg>
<k_msg sender="[name]" avatar="[initial or emoji]" color="[#hex]" time="[time]" side="right" read="[read state]">Reply text.</k_msg>
<k_img side="left" time="[time]"><image_request id="kakao-UNIQUE-ID" target="kakao.image" slot="chat-image-1" aspect="4:3" alt="Accessible chat attachment"><scene_brief>Complete visible image attachment.</scene_brief></image_request></k_img>
<k_file type="[FILE|AUDIO|VIDEO|DOC]" name="[filename]" size="[size]">Optional file note.</k_file>
<k_system type="[join|leave|notice|pinned]">System event.</k_system>
<k_unread>Unread messages</k_unread>
<k_typing names="[name or names]" avatar="[initial or emoji]" color="[#hex]"/>
</messages>
</kakao_chat>
Place <participants> before <messages>. Use exact k_part, k_msg, k_reply, k_react, k_file, k_system, and k_typing attribute order. Put each 4:3 image request inside its authored <k_img> at the exact message position; never use stale 4:5 media.`,
  'album-cover': `SURFACE: ALBUM COVER — ART-FIRST REGEX PACK CONTRACT
Output raw XML only. A real album/release title is required for newly authored output: use the established title, or deliberately name the fictional release when the scene creates it. Never substitute a generic label or player state. Artist and release context are optional.
<album_cover>
<title>Actual album or release title</title>
<artist>Actual artist name when known</artist>
<release>Optional authored release context</release>
<artwork><image_request id="album-cover-UNIQUE-ID" target="custom.artifact-media" slot="album-art" aspect="1:1" alt="Accessible album-cover description"><scene_brief>Complete square album artwork tied to the actual authored title, artist, and release concept; do not generate interface chrome or readable text.</scene_brief></image_request></artwork>
</album_cover>
Verify balanced tags and the shown child order before emitting. Keep lifecycle media inside the album wrapper. Legacy entries with no title remain art-only; do not invent a title during repair.`,
  'evidence-photo': `SURFACE: EVIDENCE PHOTO — REGEX PACK CONTRACT
Output one balanced R4.5 evidence record. Keep all labels outside the generated image:
<evidence_photo case="EV-UNIQUE" label="Evidence label" timestamp="Observed time" source="Evidence source"><photo><image_request id="evidence-photo-UNIQUE-ID" target="custom.artifact-media" slot="evidence-image" aspect="4:3" alt="Accessible evidence-photo description"><scene_brief>Complete documentary evidence photograph with the exact visible subject matter.</scene_brief></image_request></photo><caption>Concise evidence caption.</caption><note>Scene-relevant observation.</note></evidence_photo>`,
  'magazine-cover': `SURFACE: MAGAZINE COVER — REGEX PACK CONTRACT
Output exactly this balanced child order; Regex supplies typography and chrome:
<magazine_cover><masthead>Publication masthead</masthead><issue>Issue label</issue><kicker>Short kicker</kicker><headline>Actual headline</headline><subhead>Supporting line</subhead><image_request id="magazine-cover-UNIQUE-ID" target="custom.artifact-media" slot="cover-image" aspect="4:5" alt="Accessible magazine-cover description"><scene_brief>Complete editorial cover image with headline-safe space. Keep readable headlines in the surrounding Regex design rather than inside the generated image.</scene_brief></image_request></magazine_cover>`,
  'photo-booth-strip': `SURFACE: PHOTO BOOTH STRIP — REGEX PACK CONTRACT
Use the exact four-frame R4.5 wrapper. Every request has a unique id/slot and belongs to the same coherent session:
<photo_booth_strip title="Session title" date="Scene date"><booth_frame><image_request id="photo-booth-1" target="custom.artifact-media" slot="photo-booth-1" aspect="2:5" alt="First pose"><scene_brief>First pose in one coherent vertical photo-booth session with stable identities, wardrobe, booth, and lighting.</scene_brief></image_request></booth_frame><booth_frame><image_request id="photo-booth-2" target="custom.artifact-media" slot="photo-booth-2" aspect="2:5" alt="Second pose"><scene_brief>Second pose in that same photo-booth session.</scene_brief></image_request></booth_frame><booth_frame><image_request id="photo-booth-3" target="custom.artifact-media" slot="photo-booth-3" aspect="2:5" alt="Third pose"><scene_brief>Third pose in that same photo-booth session.</scene_brief></image_request></booth_frame><booth_frame><image_request id="photo-booth-4" target="custom.artifact-media" slot="photo-booth-4" aspect="2:5" alt="Fourth pose"><scene_brief>Fourth pose in that same photo-booth session.</scene_brief></image_request></booth_frame><caption>Short caption.</caption></photo_booth_strip>`,
  polaroid: `SURFACE: POLAROID — REGEX PACK CONTRACT
Output the exact R4.5 photo/caption structure:
<polaroid_frame date="Scene date" location="Scene location"><photo><image_request id="polaroid-UNIQUE-ID" target="custom.artifact-media" slot="polaroid-image" aspect="1:1" alt="Accessible polaroid description"><scene_brief>Complete square instant photograph tied to the current story beat; the renderer supplies the paper frame.</scene_brief></image_request></photo><caption>Short handwritten-style caption text.</caption></polaroid_frame>`,
  'youtube-thumbnail': `SURFACE: YOUTUBE THUMBNAIL — REGEX PACK CONTRACT
Author a YouTube watch-page Surface, not a bare thumbnail:
<yt_thumbnail channel="Actual channel" title="Actual video title" views="View count" age="Upload age" subscribers="Subscriber count"><yt_media><image_request id="youtube-thumbnail-UNIQUE-ID" target="custom.artifact-media" slot="thumbnail-image" aspect="16:9" alt="Accessible video-frame description"><scene_brief>Wide frame matching the actual video title and content, with key action center-safe, no YouTube chrome, logo, generated play icon, or readable text.</scene_brief></image_request></yt_media><yt_comments><yt_comment user="Viewer" time="Comment age" likes="Like count">Scene-relevant comment.</yt_comment></yt_comments></yt_thumbnail>`,
  newspaper: `SURFACE: NEWSPAPER IMAGE
Use <newspaper> with one target="custom.artifact-media" aspect="16:9" image request depicting the actual story event, place, or person. Keep publication text in the renderer-owned surface.`,
  'artifact-media': REVERIE_ARTIFACT_MEDIA_PROTOCOL,
  'character-profile': `<character_profile_utility>
[CAST SHEET — REVERIE RELAY UTILITY]

A Cast Sheet is a compact visual introduction card for a named character.

[character_profile] is the canonical wrapper. Its first child is the mandatory [portrait] region. The Relay XML <image_request> lives inside that bracket region; never substitute [media] for it.

Use one when a named character receives a meaningful first entrance, identity reveal, memorable return, or scene-relevant role clarification.

Use it when it improves orientation rather than for routine appearances, background figures, or unnamed extras.

The portrait is mandatory.

Keep all information safe to the current focal viewpoint. Use only visible or already established information.

IMAGE RULES

- Use exactly one Reverie Relay <image_request>.
- Place it inside [portrait].
- Use target="custom.artifact-media".
- Use aspect="3:4".
- Use a unique lowercase slug-safe id and matching slot beginning with character-profile-.
- Describe visible appearance, clothing, expression, posture, meaningful props, environment, lighting, and portrait composition.
- Request a polished story-appropriate manga/manhwa/illustrated character-profile composition.
- Keep readable text, labels, logos, captions, watermarks, and speech bubbles out of the generated portrait.
- Keep the generated image inside this same [portrait] region through pending, live preview, completed, retry, reparse, and reload states.
- After [/portrait], output [name], [role], [hook], and [trait] in that order.

TEXT FIELDS

[name]
The character's currently known name.

[role]
A short scene-relevant role.

[hook]
One memorable viewpoint-safe hook, maximum 16 words.

[trait]
One concrete visible or already established trait.

OUTPUT FORMAT — EXACT

[character_profile]
[portrait]
<image_request
  id="character-profile-UNIQUE-ID"
  target="custom.artifact-media"
  slot="character-profile-UNIQUE-ID"
  aspect="3:4"
  alt="Portrait of Character"
>
<scene_brief>Complete scene-specific portrait description using visible or established information. Polished manga, manhwa, or story-appropriate character-profile composition, no readable text.</scene_brief>
</image_request>
[/portrait]
[name]Character name[/name]
[role]Short scene-relevant role[/role]
[hook]One memorable hook, maximum 16 words[/hook]
[trait]One concrete visible or established trait[/trait]
[/character_profile]

Output the bracket Surface adjacent to the relevant character entrance. Keep only the nested image_request block in XML.
</character_profile_utility>`,
}

export const PROMPT_REGISTRY_DEFINITIONS: PromptRegistryDefinition[] = [
  { id: 'story.model-placed', displayName: 'Model-Placed Illustrator', description: 'Canonical Story Model illustration contract.', category: 'story-model', defaultTemplate: REVERIE_ILLUSTRATION_PROTOCOL, version: 2, requiredTokens: ['<reverie-illustration', '<visual_prompt>', 'cast="none"'] },
  { id: 'story.inline-protocol', displayName: 'Inline Protocol Illustrator', description: 'One-pass Story Model request and placement contract.', category: 'story-model', defaultTemplate: REVERIE_INLINE_PROTOCOL, version: 1, requiredTokens: ['<reverie-illustration', 'request="generate"', '<visual_prompt>'] },
  { id: 'story.relay-planned', displayName: 'Relay-Planned Illustrator', description: 'Story Model behavior while Relay plans visual beats.', category: 'story-model', defaultTemplate: REVERIE_RELAY_PLANNED_PROTOCOL, version: 2 },
  { id: 'story.surface-protocol', displayName: 'Shared Surface Protocol', description: 'Shared semantic surface authorship rules.', category: 'story-model', defaultTemplate: REVERIE_SURFACE_PROTOCOL, version: 3, requiredTokens: ['AUTHORSHIP', '<image_request>'] },
  { id: 'story.artifact-media', displayName: 'Artifact Media', description: 'Inline artifact image request contract.', category: 'story-model', defaultTemplate: REVERIE_ARTIFACT_MEDIA_PROTOCOL, version: 2, requiredTokens: ['target="custom.artifact-media"'] },
  { id: 'story.runtime-directives', displayName: 'Illustrator Runtime Directives', description: 'Deterministic runtime values injected into the Story Model prompt.', category: 'story-model', defaultTemplate: DEFAULT_RUNTIME_DIRECTIVES_TEMPLATE, version: 4, requiredTokens: ['{{target_count}}', '{{minimum_count}}', '{{count_mode}}', '{{illustration_instruction}}'] },
  { id: 'story.adult-content-fidelity', displayName: 'Adult Content Fidelity', description: 'Optional scene-fidelity policy. Blank disables it without hidden fallback.', category: 'story-model', defaultTemplate: DEFAULT_ADULT_CONTENT_FIDELITY, version: 1 },
  ...Object.entries(DEFAULT_ILLUSTRATOR_FRAMING_PROMPTS).map(([id, defaultTemplate]) => ({
    id: `story.framing.${id}`,
    displayName: ILLUSTRATOR_FRAMING_METADATA[id as keyof typeof ILLUSTRATOR_FRAMING_METADATA].displayName,
    description: ILLUSTRATOR_FRAMING_METADATA[id as keyof typeof ILLUSTRATOR_FRAMING_METADATA].description,
    category: 'story-model' as const,
    defaultTemplate,
    version: 4,
    status: 'stable' as const,
  })),
  ...Object.entries(DEFAULT_SIDECAR_PROMPTS).map(([id, defaultTemplate]) => ({
    id,
    displayName: id.split('.').slice(1).join(' / '),
    description: 'Editable Sidecar workflow prompt.',
    category: 'sidecars' as const,
    defaultTemplate,
    version: id === 'sidecar.composer.request' ? 4 : id === 'sidecar.parser.request' ? 3 : id === 'sidecar.parser.repair' ? 2 : id.startsWith('sidecar.appearance.') ? 2 : 1,
  })),
]

export const DEFAULT_PROMPT_REGISTRY: Record<string, string> = Object.fromEntries(
  PROMPT_REGISTRY_DEFINITIONS.map(definition => [definition.id, definition.defaultTemplate]),
)

export const DEFAULT_PROMPT_REGISTRY_VERSIONS: Record<string, number> = Object.fromEntries(
  PROMPT_REGISTRY_DEFINITIONS.map(definition => [definition.id, definition.version]),
)
