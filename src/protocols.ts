import type { PromptRegistryDefinition } from './contracts'
import { xmlAuthoringInstructions } from './xmlSurfaceFormat'
import {
  APPEARANCE_SIDECAR_REQUEST_TEMPLATE,
  APPEARANCE_SIDECAR_SYSTEM_PROMPT,
  RELAY_PLANNED_DIRECTOR_REQUEST_TEMPLATE,
  RELAY_PLANNED_DIRECTOR_SYSTEM_PROMPT,
  RELAY_PLANNED_REPAIR_PARSER_REQUEST_TEMPLATE,
  RELAY_PLANNED_REPAIR_PARSER_SYSTEM_PROMPT,
} from './promptRegistryAssets028'

export const BOORU_TAG_SUBJECT_WARDROBE_GUIDANCE = `SUBJECT-OWNED TAG GROUPS AND CANONICAL APPEARANCE COMPONENTS

For every visible person supported by the anchored paragraph—including an unnamed role such as a cleaner, guard, clerk, or passerby—write a separate consecutive group of visual tags for that whole person. Include that subject's established identity features and complete current outfit in this image request; do not omit a trait because it appeared in earlier prose or another image. Do not reduce a visibly present person to an isolated hand or sleeve unless only that body part is actually visible in the source.

Canonicalize high-information appearance phrases into simple, established visual tags before writing the list. Never invent a fused tag or preserve a phrase as prose merely because the exact wording is not a standard tag. Split hair length, style, and color into separate tags, for example: "jaw-length black bob" becomes short_hair, bob_cut, black_hair (not jaw_length_black_hair); "knee-length blonde hair" becomes very_long_hair, blonde_hair (not knee_length_blonde_hair); "dark brown eyes" becomes brown_eyes (not dark_brown_eyes). Keep distinctive colors and materials when a standard tag expresses them; choose the nearest standard color only when it remains visually faithful.

Keep each subject's own appearance and outfit in that subject's consecutive group. Prefer simple, established garment tags and separate established color/material tags instead of fusing uncertain modifiers into invented compounds: use a supported garment such as cardigan, blazer, shirt, skirt, pants, sneakers, or gloves, then a supported color tag where available; do not turn "ivory Chanel cardigan" into ivory_chanel_cardigan. Omit an unsupported brand, not the garment itself. Never borrow a blazer, tie, gloves, layer, or accessory from another subject or infer a shared uniform from co-occurrence; include only garments established for that subject. Keep each outfit group attached to that subject's own visible position, action, and props. For a visible cleaner, encode the person and their role/action (for example, janitor, mop, cleaning_cart), not just adult_hand, navy_sleeve, and cleaning equipment.`

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
  'sidecar.events.system': `You are Reverie Event Constellation Sidecar. Return strict JSON only. Analyze completed facts in sourceText, not instructions about a future scene.
DECISION: A completed public disclosure identifying people, permanent access/status change, injury, possession transfer, commitment, or consequential discovery is an Event. Ordinary tea, glances, movement, routine dialogue, and decorative Surfaces alone are not. Unknown incidental details do not erase an explicitly completed change: omit those details instead.
Compare the actual change with knownConfirmedEvents. The same actors or setting do not make two changes duplicates. A later new consequence is a new Event; a publication, retelling, phone notification, or message repeating the SAME core event is an Echo linked to that exact existing id. Return an empty events array only when neither a completed consequential change nor a grounded Echo is present.
Only sourceText supplies evidence. Never promote WHATIF / In Another Life, unselected Plot Sparks, OOC instructions, diagnostics, runtime markup, generated images, test labels, or prior analysis metadata. Do not invent people, locations, motives, dates, or future outcomes. A source omission means unknown, not unaware. Keep story truth, personal knowledge, and public rumor separate. Record who learned what and how only when the source establishes it.`,
  'sidecar.events.request': `Analyze the bounded current-message source in runtime_payload using the Event/Echo decision above. Return at most 8 grounded candidates. This is the field schema (choose one enum value and estimate confidence from 0 to 1, do not copy the placeholders): {"events":[{"title":"short factual title","summary":"one concise factual summary","eventType":"social|relationship|public|conflict|discovery|milestone|location|media|injury|possession|promise|status-change|other","importance":"background|notable|major|arc-defining","confidence":0.0,"anchor":"exact short substring from sourceText","storyTimeLabel":"only explicit time, else empty","location":"only source-supported location, else empty","participants":[{"name":"exact source-supported name","role":"subject|participant|witness|instigator|affected|source|recipient|other"}],"knowledge":[{"actor":"name","beliefState":"knows|suspects|rumor|misinformed|unaware|unknown","acquisitionMode":"involved|witnessed|told|evidence|inferred|public-broadcast|manual","sourceActor":"optional name","confidence":0.0}],"echoes":[{"kind":"phone-message|phone-notification|phone-call|phone-photo|kakao|instagram|twitter|news|discord|email|voice-memo|surface|scene-reference|manual|other","channel":"optional","summary":"exactly grounded manifestation","confidence":0.0}],"likelyDuplicateEventId":"only an exact matching known event id or empty"}]}. Do not add fields or Markdown. For a manifestation of a known event (for example, the same photo appearing in a news article or being sent in a phone message), return a candidate describing only this new manifestation and set likelyDuplicateEventId to the exact matching knownConfirmedEvents id. Do not create a second Event Node for the repeated core event. Put each manifestation in echoes with the correct channel/type and a summary quoted or closely paraphrased from sourceText. The anchor must be an exact short source substring that proves the manifestation. For Character Phone content, use explicit cp_* text as evidence; the mere presence of a phone block is not an Event or Echo. Only include participants actually named in sourceText. Knowledge array must be empty unless the source clearly establishes who learned what and how. Predictions, intentions, hypotheticals, and imagined futures are not completed Events.\n\n<runtime_payload>\n{{runtime_payload}}\n</runtime_payload>`,
  'sidecar.appearance.system': `You are Reverie Relay Appearance Sidecar. Return strict JSON only. You maintain visual continuity from the supplied bounded visual excerpts: active Character card, active Persona card, activated lorebook entries, current scene, selected recent history, and Appearance Memory. Read active Character and Persona even when their appearance is not restated in chat. User-confirmed/pinned facts have highest priority. For durable identity prefer direct Character/Persona/established lorebook evidence over inferred chat details; current explicit scene evidence governs outfit and temporary appearance. Native ImageGen presets are direct generation anchors handled separately by Relay; never split preset prompts into memory facts. Missing excerpts mean unknown, not absent, and are not permission to invent facts. Decide semantic identity, wardrobe, current-scene appearance categories, and unusual-trait replacement domains yourself; do not ask Relay to infer prose with regexes. Never invent facts or promote generic descriptions to people. A named NPC is trustworthy only when either it is recurring with sufficient concrete identity/appearance evidence, or trustworthy structured context (especially an activated lorebook/world-info entry) strongly establishes its identity and appearance before its first relevant prose appearance. Reject unnamed extras, generic roles, ambiguous pronouns, places, objects, random capitalized words, and one-off names without trustworthy identity evidence.`,
  'sidecar.appearance.request': `Return {"observations":[...]} only. Each observation has subject:{name,aliases,role:"character"|"persona"|"npc",trustworthy}, confidence, and facts:[{layer:"visual-identity"|"wardrobe"|"current-appearance",category,value,conflictDomain?,provenance:"chat-history"|"current-assistant-message"|"character-card"|"persona-card"|"lorebook"|"prior-appearance-state"}]. Keep base identity separate from wardrobe and current-scene state. Use direct Character/Persona/lorebook evidence for durable facts, current scene for outfit/temporary state, and preserve user-confirmed memory. Never parse a native preset into facts. For unusual or category="other" facts, provide conflictDomain only when the fact semantically replaces values in one Sidecar-owned domain; use a bounded lowercase slug or one colon-qualified slug such as "skin-color", "tail", "wing-state", "horns", "limb-state", or "species-trait:complexion". Do not invent a domain from Relay rules: you decide it from supplied context. For an NPC, trustworthy=true is allowed for a named recurring participant with concrete identity evidence OR a named NPC strongly established by activated structured/lorebook context with concrete identity and appearance. Do not return style, camera, pose, location, or generic scene facts.\n\n<runtime_payload>\n{{runtime_payload}}\n</runtime_payload>`,
  'sidecar.appearance.field-refresh': `Refresh only the requested Appearance Memory field for focusCharacter. Return {"fieldResult":{"subject":"exact focusCharacter name","field":"stable-appearance"|"current-outfit"|"negative-identity-tags","status":"known"|"unknown","tags":["tag or concise visual fragment",...]}} only.

For stable-appearance, include durable hair, eye color, face, body, and permanent identifying features; exclude open/closed eye state, gaze direction, expression, pose, action, camera, composition, and scene details. For current-outfit, include only clothing and worn accessories established for the current/latest scene; use status="unknown" when the current outfit is not established. For negative-identity-tags, derive concise image-negative tags that prevent contradictions with the subject's established stable identity; never negate the desired identity itself, clothing, pose, style, quality, or scene. Use status="unknown" rather than inventing unsupported identity. Treat this as an explicit user-requested refresh of one field and do not return or modify either of the other fields.

<runtime_payload>
{{runtime_payload}}
</runtime_payload>`,
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

Keep anatomical sides internally consistent. If a subject's LEFT hand is mechanical, do not later call the RIGHT hand's fingers mechanical or move the mechanical hand to the opposite side. Name the owner and side again when describing a hand's action; resolve contradictory side descriptions before returning positivePrompt.

Appearance Memory is a reference library, not a checklist. Select only identity facts that are visible and compositionally useful in the current frame. Do not force invisible traits into positivePrompt. When the scene states or strongly implies sleeping, closed eyes, a hidden face, or back-turned framing, preserve that state and omit eye-emphasis details that would contradict it.

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
  storyboard: 'storyboard',
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
  'solo-scene': { displayName: 'Framing: Char only', description: 'Exactly one visible character in the actual scene.' },
  'persona-pov': { displayName: 'Framing: Persona POV', description: 'The resolved active Persona owns the in-world viewpoint.' },
  storyboard: { displayName: 'Framing: Storyboard', description: 'Depict the exact anchored story action, not just its characters.' },
} as const

export const STORYBOARD_VIEW_GUIDANCE = `FRAMING VOCABULARY: Describe the view, angle and crop (for example, "low-angle view" or "view from above"), not imaging equipment. Use "View:" rather than "Camera:" in the image prompt; this overrides generic camera-position wording elsewhere. Keep schema keys such as cameraAngle unchanged, but put view wording in their values. In Booru mode use established viewpoint tags such as from_above, from_below or from_side, without prose labels or invented camera_angle tags. Mention a physical camera only when it is an actual, source-established object in the depicted scene.`

export const STORYBOARD_SCENE_GUIDANCE = `STORYBOARD — ONE ANCHORED, ACTION-FAITHFUL STILL

${STORYBOARD_VIEW_GUIDANCE}

SOURCE: Select the concrete paragraph showing the active visible action or change, not a nearby explanation, dialogue-only reaction, atmosphere or internal reasoning. Place the request immediately after that paragraph. Depict that exact instant: no earlier/later entrances, completed next stages or invented causes. If no physical beat is available, omit the image. An actor manipulating the central prop belongs in the action shot; an autonomous effect may be object-only. An unknown mechanism stays unknown, rather than becoming a pen, machine or magical emission.

POSITIVE PROMPT SHAPE: Use a concise visual description in this order: configured model-supported quality/rating cues when supplied; exact visible cast and central actor/action/target; each subject's appearance, current outfit, pose, expression and attention; shared physical relations; setting and important objects; view/crop; established lighting and style; supplied trigger words. This is an organizing guide, not literal field labels or bracket headings to paint into the image. Natural Language uses visual clauses; Booru uses real comma-separated tags. Keep the action prominent, not buried under an outfit inventory. Do not invent quality tags, ratings, style, LoRA names or trigger words. Reverie owns configured quality/style/LoRA and negative settings; do not copy control instructions into the positive description. Author positive visible facts, not a negative list, and do not add numeric prompt weights.

SUBJECTS: Each independent request repeats every visible subject's own confirmed identifying features, distinctive permanent traits and complete current outfit, including supported colors/materials. Use the resolved character and Persona references for their respective owners, never interchange them. Current explicit clothing changes override baseline clothing; otherwise carry forward the last confirmed outfit, using preset clothing only when no newer state is established. Bind that subject's action, hands, held items, body orientation, facial expression and gaze target to the same subject. An expression should match the visible beat; restrained or neutral is valid when emotion is uncertain. A profile, turned back or task-directed gaze may be correct; nobody must face the viewer. Keep named subjects distinct and the visible count exact; a named observer is not an additional anonymous person.

PHYSICALITY: Resolve who is where, facing which direction, doing what, using which hand and contacting which target. Infer only the minimal physically plausible staging needed to depict established actions; do not invent contact, numeric distances, hidden anatomy or new story facts. In sexual scenes, specify genitalia, position, and expression. Keep separate actions and clothing with their owners. State the count of shared objects so one jointly held object remains one object. Choose a view wide enough to show all story-critical actors, hands and relations. For near-contact, describe separate endpoints and a readable open gap, not a bare 'hovering' or negative alone; preserve a stated hairline gap without jumping to closure.

OBJECTS AND SETTING: Include enough environment/depth to locate the beat. Preserve important items' position, condition, material and ownership. Nearby idle tools are not actively used. A tool making marks on an alignment aid touches that aid; the separate reference object and its existing marks remain unchanged. Color/material is not emitted light. When a source-established reflective surface is visible, its reflection must match the same instant, cast, clothing and objects from the physically reflected view; retain only what that angle can show. Mirror imagery reverses the view, not real anatomical ownership. Glass has subdued/translucent reflections according to material and light; do not create extra actors or add a mirror merely to show everyone.`

export const STORYBOARD_TAG_GUIDANCE = `BOORU EXPRESSION: Put count/view and the central action plus its plain target/object tags early, then keep each subject's distinctive appearance, complete outfit, expression, pose/action and owned prop tags consecutive. Finish with necessary setting/light tags. Use established Danbooru-style concepts, no headings, name: labels, disguised underscore sentences or invented relationship compounds. Every comma item is a concise visual concept of at most four underscore-separated words. Ordinary character names are not trained character tags unless an exact supported tag was supplied. A vague standing or looking_at_object tag alone does not depict a specific event. Express an unsupported relation with separate short action, body-position and object tags; do not invent contact tags to fill a gap. Preserve the same source facts as Natural Language, without pretending a flat tag list guarantees actor binding.`

export const DEFAULT_ILLUSTRATOR_FRAMING_PROMPTS = {
  'scene-snapshot': `SCENE SNAPSHOT FRAMING

Treat the image as a captured moment inside the story.

Resolve the camera first: location, height, distance, angle, and shot size. Then resolve where every visible subject stands or sits, which direction each torso and shoulder faces, where the hands are, what each person is doing, and what each person is looking at.

Use asymmetry, depth, foreground obstruction, off-center placement, partial overlap, and environmental geography when supported by the scene. A subject should not be centered and squared to the viewer unless the story gives a reason.

Give every visible face a concrete attention target. Use direct eye contact only when a subject is addressing the in-world camera or the person holding it. Otherwise, direct attention toward the other subject, object, movement, doorway, task, or surrounding environment.

Show the event, not a promotional portrait. Preserve awkwardness, hesitation, distraction, restraint, fatigue, and imperfect posture when the scene supports them.`,
  sequence: `SEQUENCE FRAMING

Frame the next moment as the immediately following shot in an established visual sequence. Treat the latest completed frame as a hard visual continuity reference, not just story context.

Carry forward every established visible subject and preserve the exact subject count, identity, proportions, left/right order, screen position, facing, and distance. Never silently omit, merge, duplicate, hide, or crop out an established person; widen the camera when needed to keep every established subject clearly visible.

Keep the previous camera axis, height, distance, angle, shot size, subject blocking, room geography, lighting, hairstyle, wardrobe state, injuries, props, and handedness unless the current paragraph explicitly changes them. Continue the action rather than freezing or restaging the previous pose. Change only the action, gesture, gaze, expression, or physical relationship that the paragraph advances.

Direct attention toward the established interaction instead of assuming eye contact with the viewer. Preserve calm, numb, restrained, distracted, or uncertain expressions when the scene supports them.`,
  'emotional-beat': `EMOTIONAL BEAT FRAMING

Choose one emotional action and make it physically legible.

Resolve the camera and body geometry first. Then show the reaction through posture, hands, face, gaze, breath, distance, contact, interruption, or withdrawal.

A quiet emotion may be shown through stillness, avoidance, lowered eyes, restrained posture, or a hand that almost moves. Do not inflate ambiguity into melodrama.

The subject’s attention must have a target. Show the person, object, memory, doorway, wound, message, or action that causes the reaction whenever the scene supports it.

Use direct camera gaze only when the emotional beat is an authored confrontation, confession, appeal, recognition, or direct address.`,
  'solo-scene': `CHAR ONLY FRAMING

Show exactly one visible character: {{char}}.

Keep {{char}} inside the actual narrative location and preserve the current action, clothing, lighting, weather, props, pose, expression, injuries, and continuity. Do not add the Persona, another character, crowd, reflection, screen person, poster person, silhouette, or incidental human figure.

This is a cast limit, not a portrait instruction. Choose a camera that makes {{char}}’s current activity readable: profile, side-on, three-quarter, wider action view, or a scene-motivated close-up.

Give {{char}} a concrete gaze target. Do not default to looking at the viewer, smiling, posing, or standing like a model.`,
  'persona-pov': `PERSONA POV FRAMING

The active Persona is the camera/viewpoint only. The final image is what that Persona sees from their eyes; the active Persona is never visible and is never part of the depicted cast.

Resolve the Persona's eye position, height, orientation, distance, foreground obstruction, nearby objects, and direction of attention. Attach the camera to that exact location rather than floating outside the event.

Show only what the Persona can see from that position. Never depict any part of the Persona's body—not hands, arms, legs, shoulders, or torso—and never show the Persona in a mirror, reflection, screen, photograph, video, portrait, avatar, poster, silhouette, or shadow. The Persona must not appear as imagery on a monitor, phone, display, photograph, video, or other object anywhere in frame. Unless the paragraph explicitly requires a scene-critical display, keep screens and framed material blank, dark, or abstract; do not invent a person, face, portrait, avatar, or photograph there. Never show the camera-holder's likeness. Do not include the Persona's appearance or identity in visible-character descriptions, subject counts, or cast lists.

Other visible characters may meet the lens only when the scene establishes that they are speaking to, recognizing, confronting, or intentionally addressing the Persona. Otherwise, their gaze must follow the person, object, movement, or environment that holds their attention. Never turn this first-person view into a selfie or an outside-observer shot.`,
  storyboard: STORYBOARD_SCENE_GUIDANCE + '\n\n' + STORYBOARD_TAG_GUIDANCE,
} as const

export const STORYBOARD_DIRECTOR_GUIDANCE = STORYBOARD_SCENE_GUIDANCE + `\n\nPLANNER CONTRACT: Preserve expectedPeopleCount, namedSubjects and each actor's own action/contact/prop in the existing plan schema. Use names for cast and blocking, not a second anonymous observer. Keep the required negativeCore field empty; Reverie assembles configured provider negatives separately. Select an action-faithful source anchor or omit the shot.`

export const STORYBOARD_PARSER_GUIDANCE = STORYBOARD_SCENE_GUIDANCE + `\n\nPARSER CONTRACT: The supplied anchor is authoritative. Preserve its actors, actions, objects and relations while expressing them in concise positive visual clauses. Do not re-anchor or creatively rewrite the moment.`

export const STORYBOARD_BOORU_PARSER_GUIDANCE = STORYBOARD_SCENE_GUIDANCE + '\n\n' + STORYBOARD_TAG_GUIDANCE

const ILLUSTRATION_SCENE_FIDELITY_GUIDANCE = `SCENE FIDELITY AND SPATIAL CHOREOGRAPHY

Write enough specific, unambiguous visual detail for an image model to reproduce the actual event, not a rough thematic equivalent. Establish the exact visible count and camera first; assign blocking, orientation, action, hands, and props to each individual subject; then describe their shared interaction and the environment. Keep the central action and relationships readable in the chosen crop.

When bodies overlap or contact is central, spell out the physical arrangement: who is behind, in front, above, or below; which way each person faces; how torsos and legs align; whose arm or hand is where; and the exact point of contact. A spooning beat must say who is behind whom, their facing/orientation, and where the arm rests. "Two people cuddling in bed" is too vague when the prose specifies more. Preserve the established action and intimacy level; use source-supported details only, and never invent or escalate contact.`

export const ILLUSTRATION_VISUAL_PROMPT_CHANNEL_GUIDANCE = xmlAuthoringInstructions(`IMAGE-PROMPT CHANNEL SEPARATION

<visual_prompt> is the image description only. Translate the paragraph directly above into a concrete, image-ready description of that exact visible moment. Each request is a standalone image prompt: for every visible named subject, repeat the supported stable appearance, distinctive permanent traits (including visible android or prosthetic parts), and complete current outfit in this <visual_prompt>, even if another request in the same response already described them. Do not use "same as above", omit a trait because it appeared in earlier prose or an earlier request, or invent details that have not been established. Organize it in this order: (1) exact visible subject count, including who is outside the frame; (2) camera position, shot size, angle, and crop; (3) each visible subject separately, named when known, with that subject's own position, orientation, pose, appearance, clothing, expression, and owned hands or props; (4) the shared action or interaction, including who touches whom and where; (5) the environment, depth anchors, and scene-supported lighting. Use concise visual clauses, not headings or a copied paragraph. A detail belongs to one subject or to the shared scene—never leave limb, prop, or contact ownership ambiguous. Keep established left/right anatomy consistent throughout: a mechanical LEFT hand cannot become mechanical RIGHT fingers later in the same prompt.

Do not copy the narrative paragraph, narration, or dialogue into <visual_prompt>. Do not put Relay instructions, framing-mode rules, XML/slot/placement directions, caption intent, or notes about where the request belongs in the story into it. Write declarative visual content, not a note to the Story Model, Relay, or image model. Do not invent speech bubbles, subtitles, captions, or decorative text; include readable text only when the paragraph explicitly makes a physical text-bearing object part of the image, and describe that object rather than pasting narrative dialogue.`)

export const BOORU_TAG_MODE_VISUAL_PROMPT_GUIDANCE = xmlAuthoringInstructions(`IMAGE-PROMPT CHANNEL SEPARATION — DANBOORU TAG MODE

The <visual_prompt> value is a standalone image prompt written as comma-separated Danbooru-style visual tags. Tag the visible contents of the selected still: subject count, physical traits, current clothing, expression, pose, action, important objects, setting, and light. Prefer established descriptive tags. Each comma item is one visual concept, not a sentence with its spaces replaced by underscores. Use lowercase tag names and underscores only inside an actual multiword tag. Do not write sentences, natural-language clauses, headings, labels, explanations, or instructions. The XML wrapper and alt attribute remain normal structured metadata; this restriction applies to the <visual_prompt> value.

Example for a woman inspecting a damaged card under a workshop lamp: 1girl, solo, short_hair, black_hair, blue_eyes, sleeveless_shirt, black_shirt, holding, card, cracked_card, looking_at_object, workshop, indoors, desk_lamp. Do not output tags such as woman_is_examining_a_cracked_card_under_the_lamp. For details with no standard tag, use one short object or attribute tag rather than a disguised clause.

Use the current story paragraph as the visual source of truth and build a readable scene-led composition around the character or characters: depict the exact moment, action, blocking, contact, gaze, expression, important props, and setting rather than defaulting to a generic portrait. Include only supported visible details. In every independent request, repeat each visible character's stable appearance, distinctive permanent features (including visible android or prosthetic traits), and complete current outfit as tags; never rely on an earlier request or a downstream identity supplement.

Order tags from composition and visible count, then group each subject's identity, appearance, full outfit, pose/action/gaze, and owned prop together before the next subject; finish with shared interaction and props, then environment, depth, lighting, and mood. Do not insert pseudo-labels such as "han_yejin:" into the tag list; use a supported character tag if one is established, otherwise distinguish characters through their grouped appearance and outfit tags. Do not emit a story character's ordinary name or alias as a Danbooru character tag unless that exact tag is known to be supported by the selected model; do not place multiple untrained character names together before the appearance groups. Keep every subject's distinctive hair, eyes, complete outfit, position, and action tags consecutive; never transfer a trait or prop to another subject. Preserve subject/side ownership with separate established tags when ambiguity is possible. For the central action and every story-critical object, include separate, recognizable action and object tags; the prompt must identify who performs the action and what they act on. Generic standing or looking_at_object tags and setting nouns do not count alone. Never bury the event only inside an invented relation compound. Do not coin multiword relation tags to imitate Danbooru vocabulary. If the exact relation has no known tag, retain its supported components as separate tags (subject/action, hand or body position, object, setting) and omit only the unexpressible nuance. Ordinary marks, clothing, skin, and equipment are not luminous: do not add glow, emission, sparks, magic, or energy tags unless the anchored text explicitly establishes that visible effect. For an established single mechanical eye, include single_mechanical_eye; a made-up compound such as cybernetic_right_eye cannot replace it. Do not invent traits to fill a tag list.

Treat action stage and non-contact as visible composition, not optional nuance. If the paragraph says a subject looks at an object without touching it, tag where the subject's hands actually rest and where the separate object rests; do not collapse the beat into looking_down plus object tags, which leaves the image model free to put a hand on it. For example, a card lying apart from hands braced on a bench can use hand_on_table, card, card_on_table, looking_at_object, with a short scene-supported separation qualifier only if needed. If contact is established, tag the actual holder and contact instead. Never tag holding for a merely nearby, offered, or untouched prop.

Do not copy story prose or dialogue into the tag list. Keep Relay instructions, framing rules, XML/slot/placement directions, captions, and notes about request location outside <visual_prompt>. Do not invent speech bubbles, subtitles, captions, or decorative text.`)

export const BOORU_TAG_MODE_PARSER_GUIDANCE = `DANBOORU TAG MODE — PROVIDER PROMPT CONTRACT

Return the normal strict JSON schema, but positivePrompt must be a comma-separated list of distinct Danbooru-style visual concepts, not rewritten prose. Choose tags for visible count, appearance, current outfit, expression, pose/action, objects, interaction, setting, and lighting from the current authoritative scene. Prefer established tags. For every story-critical prop, include a separate plain object tag; for the central event, include separate action/activity and object tags. Do not hide either only inside a coined multiword relation tag. Use lowercase tag names and underscores only within a genuine established multiword tag. Example: 1girl, solo, short_hair, black_hair, blue_eyes, sleeveless_shirt, black_shirt, holding, card, cracked_card, looking_at_object, workshop, indoors, desk_lamp. Never output a clause such as woman_is_examining_a_cracked_card_under_the_lamp, even though it contains underscores. If a subject has one mechanical eye, include single_mechanical_eye rather than relying only on a custom compound such as cybernetic_right_eye. Repeat each visible subject's supported stable appearance, permanent features, and full current outfit in each independent prompt. Preserve count, blocking, contact, and anatomical-side ownership with separate established tags where the vocabulary allows; do not invent a compound to express an unavailable relation. For a not-touching or not-yet-holding beat, tag the actual hand placement and the object's separate position instead of leaving contact unspecified or adding holding. Keep JSON structure, negative fields, and Relay metadata outside positivePrompt.`

export const RELAY_PLANNED_BOORU_TAG_MODE_GUIDANCE = `DANBOORU TAG MODE — RELAY-PLANNED CONTRACT

The Story Model still writes ordinary narrative prose with no illustration markup. For each selected illustration, the Relay Director must add a booruTags JSON array to that illustration object. Each array entry is one lowercase Danbooru-style visual tag, such as "1girl", "short_hair", "black_hair", "holding", "card", "workshop". Include at least three tags. The existing promptCore, composition, and subjectDirectives remain natural-language planning data; booruTags alone supplies the provider's positive image prompt in this mode. The local compiler will not convert those prose fields into tags. Therefore booruTags must carry the full visual composition on its own: do not stop at a short list of generic subjects, props, and setting nouns. For a populated action scene, supply enough distinct supported tags to convey the camera distance, each subject's visible state and action, the action-bearing relationship to the prop or other person, and the environment. A tag list that could just as easily produce a posed portrait is incomplete even if promptCore describes the event correctly. Keep the central action and every story-critical object's plain object tag as separate items. Do not coin multiword relation tags in place of established action and object tags; if no known tag expresses the relation, retain its action, body/hand position, object, and setting as separate tags and omit only that nuance.

Build booruTags from the exact source paragraph and supplied appearance state: visible count, each visible subject's stable appearance and complete current outfit, expression, action, contact, meaningful objects, setting, and light. Prefer established tags. Use a short object or attribute tag for a scene-supported detail with no established equivalent alongside the closest established concept tags, never instead of them. An underscore joins words inside a real tag; it does not turn a sentence into a tag. Example: ["1girl", "solo", "short_hair", "black_hair", "blue_eyes", "sleeveless_shirt", "black_shirt", "holding", "card", "cracked_card", "looking_at_object", "workshop", "indoors", "desk_lamp"]. For a supported single mechanical eye, include "single_mechanical_eye" before any custom side qualifier; a made-up compound alone is not enough. A no-contact beat needs tags for the subject's actual hand placement and the object's separate position; never use "holding" when the subject has not touched the object. Never emit "woman_is_examining_a_cracked_card_under_the_lamp". The Relay repair model must repair missing or prose-shaped booruTags without changing the illustrated event. Story prose and moment selection stay unchanged.`

export const RELAY_PLANNED_STORY_CHANNEL_GUIDANCE = `STORY/PROVIDER CHANNEL SEPARATION

In Relay-Planned mode, write ordinary narrative prose only. Do not emit image prompts, illustration tags, camera/framing instructions, or commentary about how Relay should render or place an image. Relay's separate planner and composer build an image-only prompt from the selected story beat. Never turn narrative dialogue or prose into rendered captions or speech bubbles.`

export const REVERIE_ILLUSTRATION_PROTOCOL = xmlAuthoringInstructions(`[REVERIE RELAY — MODEL-PLACED ILLUSTRATION PROTOCOL]

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

PARAGRAPH-TO-FRAME LOCK

Emit each <reverie-illustration> immediately after the prose paragraph it depicts. The paragraph directly above the opening tag is the only story beat this tag illustrates. Treat it as the source of truth: choose its clearest concrete instant and show its main visible action, participants, positions, interaction, important props, and scene anchors inside <visual_prompt>.

Do not substitute a generic portrait, summarize the whole response, or illustrate a different beat from elsewhere in the scene. Do not borrow actions from a later paragraph, advance an action beyond the paragraph, or invent contact or staging that the paragraph has not established. Stable identity and continuity may supplement the frame, but must not replace what the paragraph visibly says.

${ILLUSTRATION_SCENE_FIDELITY_GUIDANCE}

VISUAL PROMPT OWNERSHIP

For Model-Placed illustrations, write the complete scene-specific image prompt inside <visual_prompt>.

Relay preserves that composition and supplements it with stable identity continuity, Appearance Memory data, configured references, LoRA trigger/base tags, negative-prompt assembly, generation settings, and provider formatting. This downstream safety net does not replace a self-contained appearance description in each authored request.

Focus <visual_prompt> on what this particular image visibly contains.

${ILLUSTRATION_VISUAL_PROMPT_CHANNEL_GUIDANCE}

PROMPT STYLE

Prefer compact Danbooru-style visual tags and concise descriptive fragments only when they remain unambiguous. Prioritize scene fidelity over brevity: do not compress complex action, body position, ownership, orientation, or contact into a broad tag when a clear natural-language clause is needed.

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

This attribute selects bound identities, NOT the number of people. Named NPCs remain visible in the image prompt but do not count as "char" or "user". If only named NPCs appear, use cast="none" even when two or more people are visible. Never bind the narrator card or active Persona merely to fill a two-person scene. When all visible people are known, begin a natural-language image prompt with "Exactly N visible people: [their names];" and assign each action to its named owner.

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

The <visual_prompt> content is consumed by Reverie Relay and is not reader-facing prose.`)

export const REVERIE_RELAY_PLANNED_PROTOCOL = `REVERIE RELAY — RELAY-PLANNED ILLUSTRATIONS

Write the narrative response as ordinary prose. Do not emit prose-illustration tags. Relay independently discovers eligible visual beats, plans one distinct image per selected beat, composes the visible prompt, generates it, and places it at the selected paragraph anchor. Enabled semantic surfaces remain available at their natural story beats.

The current paragraph owns the moment and any explicit change. Preserve each named character's stable identity and last confirmed current outfit; a default outfit, reference, location change, or emotional shift does not imply new clothing. Changes are incremental: change only what the story changes, retain the rest, and do not restore removed garments. Leave unknown details unspecified.

Narrate relevant blocking and interaction unambiguously: who is standing, sitting, or lying where; facing and front/behind position; who owns each hand or prop; and the exact contact, if any. Name participants when pronouns could blur ownership. Preserve action stage—reaching is not holding, approaching is not touching, offering is not a completed transfer. Keep continuity natural in the prose; do not add image-making instructions or a visual inventory.

${RELAY_PLANNED_STORY_CHANNEL_GUIDANCE}`

/** One-pass authoring: the Story Model owns the exact request and placement.
 * Relay scans the same canonical grammar but does not invoke a planner or a
 * prompt-completion pass for these requests. */
export const REVERIE_INLINE_PROTOCOL = xmlAuthoringInstructions(`REVERIE RELAY — MODEL PLANNED ILLUSTRATIONS

MODEL PLANNED IS ONE-PASS FULL MODEL AUTHORING.

The Story Model owns the visual beat selection, request placement, visible cast, camera position, shot size, blocking, action, contact, environment, depth, relevant gaze and expression, and the final <visual_prompt>. Relay will not perform a second creative composition pass. The <visual_prompt> must already be an intentional, finished, image-ready composition.

Do not ask Relay, a planner, a Sidecar Composer, or a parser to finish, expand, interpret, repair, or choose the angle. Relay only scans and routes the canonical request, applies deterministic identity/settings continuity, and dispatches or exposes the authored request according to runtime settings.

CANONICAL FORMAT

<reverie-illustration request="generate" slot="short-stable-slot" aspect="4:3" cast="char" alt="Accessible description"><visual_prompt>Complete scene-specific visual prompt.</visual_prompt></reverie-illustration>

Place the completed request exactly where the illustration belongs in the narrative. Do not emit a planning note, parser task, acknowledgement, or second completion request. When Auto Generate is enabled Relay dispatches the exact inline request after deterministic parsing; when Auto Generate is disabled it remains a manual lazy slot.

PARAGRAPH-TO-FRAME LOCK

Emit every inline <reverie-illustration> immediately after the prose paragraph it depicts. The paragraph directly above the opening tag is the only story beat that tag illustrates. Freeze one concrete instant from that paragraph and make its main visible action, participants, blocking, interaction, important prop, and relevant setting directly recognizable in <visual_prompt>. The paragraph—not the general scene, the whole response, or a later paragraph—is the source of truth for the image.

Do not replace the paragraph's event with a generic character portrait, add an action that has not happened yet, or import a different beat from nearby prose. Stable identity and continuity may supplement the frame, but must not displace the paragraph's actual visible moment. If the paragraph contains several actions, select the one instant that best represents it; do not turn the prompt into a montage.

${ILLUSTRATION_SCENE_FIDELITY_GUIDANCE}

${ILLUSTRATION_VISUAL_PROMPT_CHANNEL_GUIDANCE}

SCENE-FIRST COMPOSITION

The subject is the story moment, not automatically the characters' faces. Emotional importance does not automatically justify a close-up; close-ups remain valid when the visible beat genuinely calls for one. Choose a camera wide enough to show the action, contact, props, and setting that matter. If the environment, hands, body relationship, or important prop would be lost in a close-up, widen the camera.

In natural, concise image language, establish visible count and camera, then each subject's position/orientation/pose and owned clothing/hands/props, the shared action or exact contact, and the scene's depth and environmental anchors. Keep useful locations recognizable and keep gaze/expression with its owner; do not let face detail displace blocking or action.

In sexual scenes, specify genitalia, position, and expression.

SCENE-SPECIFIC APPEARANCE

Resolve each subject from the paragraph's moment and the latest established story state. In every <visual_prompt>, state each visible named subject's supported stable appearance and distinctive permanent traits, including visible android or prosthetic parts, plus their complete current outfit. Repeat these facts independently for every request, including the second and later images in one response; never rely on a previous illustration request or Relay's downstream identity supplement to supply an omitted trait. Use supplied identity and confirmed Appearance Memory only as compact, supported anchors. Carry forward the last confirmed current outfit until the story changes it. Outfit changes are incremental: change only what the story changed, retain the rest, and do not restore removed garments. A default outfit, reference image, mood, or location change does not change clothing. Unknown details stay unspecified.

EXACT POSITIONS AND INTERACTIONS

Name owners whenever pronouns could swap positions, limbs, hands, props, or contact. In sexual scenes, specify genitalia, position, and expression. Preserve frame-left/right, each person's facing and front/behind depth, support surface, distance, and established handedness. State who touches which body part or garment; preserve gaps and action stage (reaching is not touching, offering is not holding). Never mirror, merge, swap, or invent contact. In Persona POV, the Persona is an unseen camera only. Put resolved visible facts—not these instructions—inside <visual_prompt>.

Before closing each <visual_prompt>, check that every described hand or eye action uses the same anatomical side and owner as the subject's established permanent traits. If the right hand hovers while the left hand is mechanical, do not describe the hovering right fingers as mechanical. Resolve contradictions in the image description itself, not with a disclaimer.

MULTIPLE INLINE ILLUSTRATIONS

When a response has multiple requests, treat each <visual_prompt> as independent: repeat the visible subjects' established appearance, permanent features, and full current clothing in every one. Do not force a shot sequence. Prefer a meaningfully different scale, angle, or visual center when that better shows each beat.

CAST SEMANTICS — BOUND IDENTITIES ONLY

The cast attribute names only visible bound identities: "char" = active Character, "user" = active Persona, "char+user" = both, and "none" = neither. Named NPCs belong in <visual_prompt> but not in cast. Do not use cast="char+user" merely because two people are visible.

ASPECT AND MEDIA

Keep 4:3 as the general story default. Prefer 16:9 or 3:2 for environmental, multi-plane, spatial, or ensemble compositions. Use 3:4 only when a genuinely vertical composition benefits. Do not select portrait orientation merely because people are visible, and do not let close character framing silently force portrait orientation. Respect the runtime aspect policy and supported aspect list.

MANDATORY COMPLETION LOCK

Mandatory structured contracts outrank prose length. If the response budget becomes tight, shorten nonessential prose and optional utility wording before dropping required structure.

BEFORE ENDING RESPONSE: Count current-turn raw <reverie-illustration> requests belonging to Inline story illustrations. In fixed mode, the count MUST equal target_count. In minimum mode, it MUST meet minimum_count. Resolved historical images do not count. Relay result Markdown, Relay runtime <img> markup, and Surface or Narrative Utility media do not count toward the Inline story-illustration requirement. Never replace a required raw current request with resolved Relay runtime syntax.

Do not silently drop required Inline illustrations, required Utility media, required closing tags, or the final required portion of a structured payload merely because prose became long. Repair the current response before stopping.

SLOT AND OUTPUT

Give every request a short lowercase slug-safe stable slot. Each selected illustration appears once at its intended narrative position. Emit the raw complete <reverie-illustration> element as part of the story response and continue the surrounding prose naturally. The <visual_prompt> is consumed by Reverie Relay and is not reader-facing prose.`)

/** Alternate one-pass contract for strict Danbooru-style provider prompts. */
export const REVERIE_BOORU_INLINE_PROTOCOL = REVERIE_INLINE_PROTOCOL
  .replace(ILLUSTRATION_VISUAL_PROMPT_CHANNEL_GUIDANCE, BOORU_TAG_MODE_VISUAL_PROMPT_GUIDANCE)
  .replace(/SCENE-FIRST COMPOSITION[\s\S]*?(?=\r?\nSCENE-SPECIFIC APPEARANCE)/, `SCENE-FIRST TAG COMPOSITION

The subject is the story moment, not automatically the characters' faces. Emotional importance does not automatically justify a close-up; choose tags for a camera wide enough to show the action, contact, props, and setting that matter. If the environment, hands, body relationship, or important prop would be lost in a close-up, use wider-shot and environmental tags. Keep every tag inside the Danbooru-style comma-separated list; do not use natural-language descriptions.`)
  .replace(BOORU_TAG_MODE_VISUAL_PROMPT_GUIDANCE, `${BOORU_TAG_MODE_VISUAL_PROMPT_GUIDANCE}\n\n${BOORU_TAG_SUBJECT_WARDROBE_GUIDANCE}`)

export const REVERIE_CHARACTER_ONLY_FRAMING_PROMPT = DEFAULT_ILLUSTRATOR_FRAMING_PROMPTS['solo-scene']

export const REVERIE_ARTIFACT_MEDIA_PROTOCOL = xmlAuthoringInstructions(`REVERIE RELAY — ARTIFACT MEDIA

Author the complete declarative artifact and place one semantic request inside the exact frame that displays the final image:
<image_request id="stable-unique-id" target="custom.artifact-media" slot="stable-media-slot" aspect="4:3" alt="Brief accessible description">
<scene_brief>Complete visible description of the image belonging in this frame.</scene_brief>
</image_request>

Use a stable unique id and slot, a supported aspect, accessible alt text, and a scene-specific visible brief. Describe object, location, document, screenshot, architecture, evidence, and environment images as empty compositions when people are absent. Describe the depicted subject, never its hosting UI card/slot. Relay keeps the lifecycle card, generation state, image, and controls at this exact location.`)

export const REVERIE_SURFACE_PROTOCOL = xmlAuthoringInstructions(`REVERIE RELAY — SHARED SURFACE PROTOCOL

USE
Use only enabled Surface modules. Use a Surface when the current response directly presents that in-world communication, document, object, network, app, or visual form and the Surface adds concrete reader value. Never invent an action, message, document, media event, or screen merely to justify a Surface. Do not duplicate ordinary prose when the Surface adds no concrete in-world information.

AUTHORING
Author XML semantic markup only: <root>...</root>. opening XML tags use the attributes shown in the schema; metadata is written as child <field>value</field> nodes. Follow each module's ROOT, SCHEMA, order, counts, and RULES exactly. Repeated messages, posts, comments, gallery items, channels, feeds, entries, and other rows stay as separate ordered child blocks. Keep every XML tag balanced. XML is the canonical authoring format; old bracket messages remain readable.

PLACEMENT
Place each complete Surface immediately after the prose beat where it is opened, shown, received, discovered, watched, read, or otherwise becomes directly relevant.

MEDIA
Generated media also uses XML child elements. Put the complete request at the exact image-request position shown by the module schema, inside its owning semantic field:
<image_request id="unique-lowercase-id" target="TARGET" slot="stable-slot" aspect="ASPECT" alt="Accessible description"><scene_brief>Complete scene-specific visible image description.</scene_brief></image_request>
Use the module's required target, aspect, owner, and media count. IDs and slots are stable and unique per unrelated image. The scene_brief describes the actual in-world image using current established identity/outfit/state when relevant, never its hosting UI card/slot. Keep interface chrome, labels, captions, map labels, timestamps, logos, watermarks, and readable text out of generated media unless the Surface-specific RULES explicitly require otherwise. Never place a bare image request in visible prose and never reuse one generic request for unrelated media slots.

CONTEXT
Use the current scene/message for names, places, timing, route information, text, participants, and visual content. Schema ellipses are placeholders only, never default story values. Do not author Markdown fences, HTML/CSS layouts, launcher chrome, presentation controls, generic substitute cards, or renderer fallback text.`)

export const REVERIE_SURFACE_APP_SCHEMA_FIREBREAK = `APP SURFACE SHAPE FIREBREAK
Use only the enabled module's exact registered root and exact child hierarchy. Never emit <igfeed>, <igstory>, <igpost>, <tw_profile>, <reddit_thread>, <reddit_comment>, or <discord_message>. A <tw_post> is valid only inside <twitter_app>. A Discord Server uses <discord_server> with the module's exact four <server_channel> children; do not flatten its messages beside the channels. If the requested platform module is not enabled, omit that Surface instead of inventing a substitute schema.`

export const REVERIE_SURFACE_UTILITY_TEMPLATE = `REVERIE RELAY — ENABLED SURFACES

{{reverie_enabled_surface_modules}}

STRICT ENABLED ROOT REGISTRY
Only the exact roots below are valid. Never rename a root after a platform, invent feed/post/story shorthand, add namespace punctuation, or combine multiple enabled contracts into a substitute app schema.
{{reverie_enabled_surface_roots}}

${REVERIE_SURFACE_APP_SCHEMA_FIREBREAK}
`


export const REVERIE_ALL_PROTOCOLS = `${REVERIE_SURFACE_PROTOCOL}\n\n${REVERIE_INLINE_PROTOCOL}\n\n${REVERIE_ARTIFACT_MEDIA_PROTOCOL}`

/** Legacy XML normalization reference used to recover imported/persisted
 * Surface definitions. Runtime model instructions are generated from each
 * canonical sample as bracket-native modules before injection. */
export const DEFAULT_SURFACE_PROMPT_MODULES: Record<string, string> = {
  smartphone: `SURFACE: SMARTPHONE — REGEX PACK CONTRACT
Canonical XML shape. Preserve this structure and child order when repairing imported XML:
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
Canonical XML shape. Root attributes may be parsed flexibly, but preserve this canonical order during repair:
<ig_app user="[username]" loc="[location]" likes="[count]" verified="[true or empty]">
<image_request id="instagram-example" target="instagram.single" slot="post-media" aspect="1:1" alt="Post image"><scene_brief>Scene-specific post image.</scene_brief></image_request>
<caption>Caption text.</caption>
<comments>
<i_comment user="[username]" time="[relative time]" likes="[count]" verified="[true or empty]">Comment text.<i_reply user="[username]" time="[relative time]">Nested reply text.</i_reply></i_comment>
</comments>
</ig_app>
Single media: place exactly one <image_request id="instagram-UNIQUE-ID" target="instagram.single" slot="post-media" aspect="1:1" alt="Accessible post description"><scene_brief>Complete visible post image.</scene_brief></image_request> before <caption>.
Carousel media: place exactly one <image_request id="instagram-UNIQUE-ID" target="instagram.carousel" slot="carousel" count="2" aspect="1:1" alt="Accessible carousel description"><scene_brief>Describe each slide consecutively as Slide 1, Slide 2, and so on.</scene_brief></image_request> before <caption>. Use count 2-4. Never emit target="instagram.slide". Include <caption> and <comments> even when their text is brief. Put every <i_reply> inside its owning <i_comment>.`,
  twitter: `SURFACE: TWITTER / X — REGEX PACK CONTRACT
Canonical XML shape. Preserve this outer order exactly during repair:
<twitter_app>
<for_you>...</for_you>
<following>...</following>
<thread>...</thread>
<trends>...</trends>
</twitter_app>
<for_you> is required. The other three sections are optional, but when present they must remain in that order.
Timeline post attribute order:
<tw_post author="[display name]" handle="@[handle]" time="[relative time]" verified="[true or empty]" replies="[count]" reposts="[count]" likes="[count]" views="[count]" pinned="[true or empty]">Post text.<!-- Optional direct image_request here --><tw_comments>...</tw_comments></tw_post>
Before generation, <media> is one direct-child request:
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
Canonical XML shape. Attribute and child order remain strict during repair:
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
Canonical XML shape. A real album/release title is required for newly authored output: use the established title, or deliberately name the fictional release when the scene creates it. Never substitute a generic label or player state. Artist and release context are optional.
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

<character_profile> is the canonical wrapper. Its first child is the mandatory <portrait> region. The Relay XML <image_request> lives inside that XML element; never substitute <media> for it.

Use one when a named character receives a meaningful first entrance, identity reveal, memorable return, or scene-relevant role clarification.

Use it when it improves orientation rather than for routine appearances, background figures, or unnamed extras.

The portrait is mandatory.

Keep all information safe to the current focal viewpoint. Use only visible or already established information.

IMAGE RULES

- Use exactly one Reverie Relay <image_request>.
- Place it inside <portrait>.
- Use target="custom.artifact-media".
- Use aspect="3:4".
- Use a unique lowercase slug-safe id and matching slot beginning with character-profile-.
- Describe visible appearance, clothing, expression, posture, meaningful props, environment, lighting, and portrait composition.
- Request a polished story-appropriate manga/manhwa/illustrated character-profile composition.
- Keep readable text, labels, logos, captions, watermarks, and speech bubbles out of the generated portrait.
- Keep the generated image inside this same <portrait> region through pending, live preview, completed, retry, reparse, and reload states.
- After </portrait>, output <name>, <role>, <hook>, and <trait> in that order.

TEXT FIELDS

<name>
The character's currently known name.

<role>
A short scene-relevant role.

<hook>
One memorable viewpoint-safe hook, maximum 16 words.

<trait>
One concrete visible or already established trait.

OUTPUT FORMAT — EXACT

<character_profile>
<portrait>
<image_request
  id="character-profile-UNIQUE-ID"
  target="custom.artifact-media"
  slot="character-profile-UNIQUE-ID"
  aspect="3:4"
  alt="Portrait of Character"
>
<scene_brief>Complete scene-specific portrait description using visible or established information. Polished manga, manhwa, or story-appropriate character-profile composition, no readable text.</scene_brief>
</image_request>
</portrait>
<name>Character name</name>
<role>Short scene-relevant role</role>
<hook>One memorable hook, maximum 16 words</hook>
<trait>One concrete visible or established trait</trait>
</character_profile>

Output the bracket Surface adjacent to the relevant character entrance. Keep only the nested image_request block in XML.
</character_profile_utility>`,
}

export const PROMPT_REGISTRY_DEFINITIONS: PromptRegistryDefinition[] = [
  { id: 'story.model-placed', displayName: 'Model-Placed Illustrator', description: 'Canonical Story Model illustration contract.', category: 'story-model', defaultTemplate: REVERIE_ILLUSTRATION_PROTOCOL, version: 6, requiredTokens: ['<reverie-illustration', '<visual_prompt>', 'cast="none"', 'PARAGRAPH-TO-FRAME LOCK', 'SCENE FIDELITY AND SPATIAL CHOREOGRAPHY', 'IMAGE-PROMPT CHANNEL SEPARATION'] },
  { id: 'story.inline-protocol', displayName: 'Model Planned Illustrator', description: 'Compact one-pass Story Model request and placement contract.', category: 'story-model', defaultTemplate: REVERIE_INLINE_PROTOCOL, version: 10, requiredTokens: ['<reverie-illustration', 'request="generate"', '<visual_prompt>', 'PARAGRAPH-TO-FRAME LOCK', 'SCENE FIDELITY AND SPATIAL CHOREOGRAPHY', 'IMAGE-PROMPT CHANNEL SEPARATION'] },
  { id: 'story.inline-protocol.booru-tags', displayName: 'Model Planned Illustrator / Danbooru Tag Mode', description: 'One-pass Story Model request and placement contract with tag-only image prompts.', category: 'story-model', defaultTemplate: REVERIE_BOORU_INLINE_PROTOCOL, version: 8, requiredTokens: ['<reverie-illustration', 'request="generate"', '<visual_prompt>', 'Danbooru-style visual tags', 'SUBJECT-OWNED TAG GROUPS AND CANONICAL APPEARANCE COMPONENTS', 'jaw_length_black_hair', 'knee_length_blonde_hair'] },
  { id: 'story.relay-planned', displayName: 'Relay-Planned Illustrator', description: 'Story Model continuity and prose behavior while Relay plans visual beats.', category: 'story-model', defaultTemplate: REVERIE_RELAY_PLANNED_PROTOCOL, version: 5, requiredTokens: ['ordinary prose', 'Do not emit prose-illustration tags', 'STORY/PROVIDER CHANNEL SEPARATION'] },
  { id: 'story.surface-protocol', displayName: 'Shared Surface Protocol', description: 'Shared semantic surface authorship rules.', category: 'story-model', defaultTemplate: REVERIE_SURFACE_PROTOCOL, version: 6, requiredTokens: ['AUTHORING', '<image_request '] },
  { id: 'story.artifact-media', displayName: 'Artifact Media', description: 'Inline artifact image request contract.', category: 'story-model', defaultTemplate: REVERIE_ARTIFACT_MEDIA_PROTOCOL, version: 5, requiredTokens: ['target="custom.artifact-media"'] },
  { id: 'story.runtime-directives', displayName: 'Illustrator Runtime Directives', description: 'Deterministic runtime values injected into the Story Model prompt.', category: 'story-model', defaultTemplate: DEFAULT_RUNTIME_DIRECTIVES_TEMPLATE, version: 4, requiredTokens: ['{{target_count}}', '{{minimum_count}}', '{{count_mode}}', '{{illustration_instruction}}'] },
  { id: 'story.adult-content-fidelity', displayName: 'Adult Content Fidelity', description: 'Optional scene-fidelity policy. Blank disables it without hidden fallback.', category: 'story-model', defaultTemplate: DEFAULT_ADULT_CONTENT_FIDELITY, version: 1 },
  ...Object.entries(DEFAULT_ILLUSTRATOR_FRAMING_PROMPTS).map(([id, defaultTemplate]) => ({
    id: `story.framing.${id}`,
    displayName: ILLUSTRATOR_FRAMING_METADATA[id as keyof typeof ILLUSTRATOR_FRAMING_METADATA].displayName,
    description: ILLUSTRATOR_FRAMING_METADATA[id as keyof typeof ILLUSTRATOR_FRAMING_METADATA].description,
    category: 'story-model' as const,
    defaultTemplate,
    version: id === 'persona-pov' ? 6 : id === 'sequence' ? 5 : id === 'storyboard' ? 14 : 4,
    status: 'stable' as const,
  })),
  {
    id: 'appearance.sidecar.system',
    displayName: 'Appearance Sidecar / System',
    description: 'Canonical identity, current visual state, provenance, and terminal-state extraction law.',
    category: 'sidecars',
    defaultTemplate: APPEARANCE_SIDECAR_SYSTEM_PROMPT,
    version: 1,
    status: 'stable',
    allowedPlaceholders: [],
  },
  {
    id: 'appearance.sidecar.request',
    displayName: 'Appearance Sidecar / Request',
    description: 'Editable runtime request template for completed-response appearance extraction.',
    category: 'sidecars',
    defaultTemplate: APPEARANCE_SIDECAR_REQUEST_TEMPLATE,
    version: 2,
    status: 'stable',
    allowedPlaceholders: ['adultMode', 'providerVocabulary', 'manualAppearanceJson', 'canonicalAppearanceJson', 'currentVisualStateJson', 'subjectBindingsJson', 'tagVocabularyJson', 'sourceResponse'],
    requiredTokens: ['{{sourceResponse}}', '{{canonicalAppearanceJson}}', '{{currentVisualStateJson}}'],
  },
  {
    id: 'relay-planned.director.system',
    displayName: 'Relay-Planned Director / System',
    description: 'Canonical Relay-Planned illustration selection and direction law.',
    category: 'sidecars',
    defaultTemplate: RELAY_PLANNED_DIRECTOR_SYSTEM_PROMPT,
    version: 3,
    status: 'stable',
    allowedPlaceholders: [],
  },
  {
    id: 'relay-planned.director.request',
    displayName: 'Relay-Planned Director / Request',
    description: 'Editable runtime request template for selecting illustration moments.',
    category: 'sidecars',
    defaultTemplate: RELAY_PLANNED_DIRECTOR_REQUEST_TEMPLATE,
    version: 2,
    status: 'stable',
    allowedPlaceholders: ['adultMode', 'maximumIllustrations', 'maximumCharacters', 'defaultAspectRatio', 'promptStyle', 'perspectiveMode', 'characterContextJson', 'latestUserVisualContext', 'locationContextJson', 'priorIllustrationsJson', 'referenceAssetsJson', 'globalNegativeRequirementsJson', 'paragraphsJson'],
    requiredTokens: ['{{paragraphsJson}}', '{{characterContextJson}}', '{{adultMode}}'],
  },
  {
    id: 'relay-planned.repair-parser.system',
    displayName: 'Relay-Planned Repair Parser / System',
    description: 'Constrained structured-object repair law for Relay-Planned proposals.',
    category: 'sidecars',
    defaultTemplate: RELAY_PLANNED_REPAIR_PARSER_SYSTEM_PROMPT,
    version: 1,
    status: 'stable',
    allowedPlaceholders: [],
  },
  {
    id: 'relay-planned.repair-parser.request',
    displayName: 'Relay-Planned Repair Parser / Request',
    description: 'Editable deterministic repair request for a rejected illustration proposal.',
    category: 'sidecars',
    defaultTemplate: RELAY_PLANNED_REPAIR_PARSER_REQUEST_TEMPLATE,
    version: 1,
    status: 'stable',
    allowedPlaceholders: ['validationErrorsJson', 'sourceParagraphsJson', 'subjectStateJson', 'referenceAssetsJson', 'proposedIllustrationJson'],
    requiredTokens: ['{{validationErrorsJson}}', '{{proposedIllustrationJson}}'],
  },
  ...Object.entries(DEFAULT_SIDECAR_PROMPTS)
    .filter(([id]) => id !== 'sidecar.appearance.system' && id !== 'sidecar.appearance.request')
    .map(([id, defaultTemplate]) => ({
    id,
    displayName: id.split('.').slice(1).join(' / '),
    description: 'Editable Sidecar workflow prompt.',
    category: 'sidecars' as const,
    defaultTemplate,
    version: id === 'sidecar.composer.request' ? 5 : id === 'sidecar.parser.request' ? 3 : id === 'sidecar.parser.repair' ? 2 : id === 'sidecar.appearance.field-refresh' ? 3 : id.startsWith('sidecar.appearance.') ? 2 : id.startsWith('sidecar.events.') ? 3 : 1,
    })),
]

export const DEFAULT_PROMPT_REGISTRY: Record<string, string> = Object.fromEntries(
  PROMPT_REGISTRY_DEFINITIONS.map(definition => [definition.id, definition.defaultTemplate]),
)

export const DEFAULT_PROMPT_REGISTRY_VERSIONS: Record<string, number> = Object.fromEntries(
  PROMPT_REGISTRY_DEFINITIONS.map(definition => [definition.id, definition.version]),
)
