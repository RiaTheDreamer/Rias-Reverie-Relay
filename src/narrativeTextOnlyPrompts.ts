/** Text-only contracts are deliberately separate from the shipped image-capable
 * Utilities. Those prompts contain mandatory media rules and examples, so a
 * late "no images" instruction would give the Story Model conflicting orders. */
import { PERSONA_WARDROBE_TEXT_ONLY_PROMPT } from './personaWardrobe'

export const NARRATIVE_TEXT_ONLY_PROMPTS: Readonly<Record<string, string>> = {
  'Character Phone': `# Character Phone — text-only
Create one story-linked phone snapshot for a character. Use only established facts and plausible off-screen activity; do not invent a major unseen event. Keep the fully namespaced cp_ bracket grammar. Do not output renderer HTML or image requests.
[character_phone]
[cp_presentation]sparkling|plain|inline[/cp_presentation]
[cp_owner]Character name[/cp_owner][cp_subtitle]Private-device subtitle[/cp_subtitle]
[cp_time]HH:MM[/cp_time][cp_day]Day / date[/cp_day][cp_battery]0-100[/cp_battery]
[cp_wallpaper][/cp_wallpaper]
[cp_apps]
Exactly eight [cp_app] blocks with [cp_slot]1[/cp_slot] through [cp_slot]8[/cp_slot] once each. Every app has [cp_name], [cp_icon], [cp_tone], [cp_badge], and [cp_content]. [cp_tone] is a presentation color, not the app name: choose green, black, red, yellow, orange, blue, slate, photos, purple, browser, or health. For the default apps use Messages=green, Photos=photos, Browser=browser, Diary=purple, Contacts=blue, Banking=black, Vault=slate, Wardrobe=purple. Choose the eight apps supplied by the active app-selection directive; otherwise use Messages, Photos, Browser, Diary, Contacts, Banking, Vault, Wardrobe.
[/cp_apps]
[/character_phone]
Messages use [cp_msg][cp_side]other|self[/cp_side][cp_name]Name[/cp_name][cp_time]HH:MM[/cp_time][cp_text]Text[/cp_text][/cp_msg]. Browser and other lists use [cp_row][cp_glyph]Icon[/cp_glyph][cp_title]Title[/cp_title][cp_meta]Metadata[/cp_meta][cp_text]Detail[/cp_text][/cp_row]. Health may use [cp_stat][cp_label]Label[/cp_label][cp_value]Value[/cp_value][cp_note]Note[/cp_note][/cp_stat]. Preserve the canonical cp_ component tags for other apps.
If Photos is selected, keep it a mini gallery of 2–4 distinct, grounded [cp_photo] entries rather than a single preview or generic rows: [cp_photo][cp_title]Caption[/cp_title][cp_meta]Time · Location[/cp_meta][cp_media][/cp_media][/cp_photo]. Every photo's media wrapper stays empty in text-only mode. Wallpaper, Wardrobe, and all other cp_media wrappers also stay empty. Distinguish photos by moment, subject, and purpose through their captions and metadata.
Contacts and Vault may contain the owner's subjective view; never present that view as omniscient canon. Close all bracket fields.`,

  'Dramatic Cutaway': `# Dramatic Cutaway — text-only
Create one active off-screen scene that increases pressure and is tied to at least two concrete current-scene or established-canon anchors. Keep the focal cast's knowledge separate. Do not output image requests or renderer HTML.
[dramatic_parallel]
[dramatic_head]LOCATION:Place • TIME:Sync • PRESSURE:Collision/Secret/Fallout/Threat/Opportunity[/dramatic_head]
[dramatic_media][/dramatic_media]
[dramatic_body][paragraph]Concrete off-screen action.[/paragraph][paragraph]A second beat escalating or reframing the pressure.[/paragraph][paragraph]Optional active collision vector, not a vague teaser.[/paragraph][/dramatic_body]
[dramatic_foot]STATUS: OFFSCREEN • PRESSURE: LIVE • FIREWALL: ACTIVE[/dramatic_foot]
[/dramatic_parallel]
The media wrapper remains empty. Do not move reader-only facts into a character's knowledge.`,

  'Plot Sparks': `# Plot Sparks — text-only current-scene branch board
Create seven concise, playable continuations of the current scene, not seven unrelated events or predetermined outcomes. Preserve actual positions, objects, emotional states, names, and knowledge boundaries. Do not invent people, evidence, crises, or a deadline merely to create variety. Use only identities already supplied by the scene or established context. Do not output image requests.
[Plot_Sparks]
[ID]fresh lowercase id[/ID]
[Lifecycle]Unused Plot Sparks dissolve after this response.[/Lifecycle]
[Spark][Key]a[/Key][Vector]detonation[/Vector][Text]One current tension slips into an immediate playable beat.[/Text][Media][/Media][/Spark]
[Spark][Key]b[/Key][Vector]heartknife[/Vector][Text]An unexpected but grounded personal move.[/Text][Media][/Media][/Spark]
[Spark][Key]c[/Key][Vector]wrongness[/Vector][Text]An established detail does not add up.[/Text][Media][/Media][/Spark]
[Spark][Key]d[/Key][Vector]crash-in[/Vector][Text]A grounded interruption from the existing world.[/Text][Media][/Media][/Spark]
[Spark][Key]e[/Key][Vector]matchstrike[/Vector][Text]Existing pressure forces a decision.[/Text][Media][/Media][/Spark]
[Spark][Key]f[/Key][Vector]reputation-fire[/Vector][Text]The current moment creates a plausible misread.[/Text][Media][/Media][/Spark]
[Spark][Key]g[/Key][Vector]wildcard-collision[/Vector][Text]The least obvious causally natural branch.[/Text][Media][/Media][/Spark]
[/Plot_Sparks]
Each [Media] wrapper stays empty. Use the seven exact key/vector pairs and one non-empty [Text] per Spark. Place the board after the prose, never inside a prose paragraph.`,

  'Scene Shift': `# Scene Shift — text-only
Use only for an actual new location, meaningful time jump, or substantial atmosphere change. Ground the new scene in established geography and continuity; do not output image requests.
[SCENE|Location|Time|Weather/Atmosphere]
[scene_media][/scene_media]
[scene_detail]One concise sensory line that makes the changed setting legible.[/scene_detail]
[scene_context][reason]What changed: location, time, atmosphere, or a combination.[/reason][continuity]One concrete element carried forward from the previous scene.[/continuity][/scene_context]
[/SCENE]`,

  'Parallel Scene': `# Parallel Scene — text-only
Show exactly three active off-stage threads grounded in the current story, with present-tense movement rather than guaranteed future outcomes. Do not leak off-stage knowledge into focal characters or output image requests.
[PARALLEL|Scope|Status]
[parallel_entry][text]First live thread and its immediate pressure.[/text][parallel_media][/parallel_media][/parallel_entry]
[parallel_entry][text]Second live thread and its immediate pressure.[/text][parallel_media][/parallel_media][/parallel_entry]
[parallel_entry][text]Third live thread and its immediate pressure.[/text][parallel_media][/parallel_media][/parallel_entry]
[parallel_context][trajectory]How the three established threads are moving now.[/trajectory][intersection]Where existing pressures could touch, without promising an outcome.[/intersection][/parallel_context]
[/PARALLEL]`,

  'Cast Introduction': `# Cast Introduction — text-only
Emit once, immediately after a named non-user character first appears on-page and the response establishes at least two of role, appearance, relationship, behavior/voice, or immediate function. Choose tier by present weight, not predicted importance. Do not invent unknown identity details or output image requests.
MAJOR: [NPC:MAJOR|Name][npc_media][/npc_media]
b: Full Name | Age | Gender/Pronouns | Occupation
a: Height/Build | Hair | Eyes | Skin | Distinguishing Marks | Current Attire
p: Demeanor | Speech Pattern | Core Traits | Quirks/Tells
h: Relevant History | Motivations | Secrets
r: Connection to Protagonist | Other Ties
[/NPC]
SUPPORT: [NPC:SUPPORT|Name][npc_media][/npc_media]
b: Name | Age | Gender | Role
a: Build | Notable Features | Attire
p: Demeanor | Speech | Key Traits
h: Relevant History | Motivation
r: Connection to Protagonist | Other Ties
[/NPC]
MINOR: [NPC:MINOR|Name][npc_media][/npc_media]
b: Name | Age/Range | Role
a: Quick Physical Description
p: One-line Personality Summary
[/NPC]
Choose exactly one tier for a new introduction. For a genuine upgrade, use [NPC:UP|Name|NEW_TIER] with the complete new-tier fields and empty [npc_media]. Returning quick reference remains [NPC:REF|Name|visual cue|current mood]; relationship change remains [NPC:REL|Name|change description]. Keep pipe separators in data lines.`,

  'Backstage Secrets': `# Backstage Secrets — text-only
Use only when this scene creates, reveals, transfers, or materially changes a meaningful gap in what different characters know. Attribute knowledge precisely; do not turn reader-only truth into character knowledge. Do not output image requests.
[SECRET|Owner|What They Know or Hide|Who Else Knows]
[secret_media][/secret_media]
[context]Where the information gap came from or why it matters now.[/context]
[pressure]What the asymmetry currently changes, enables, delays, or endangers.[/pressure]
[/SECRET]`,

  'Setting the Scene': `# Setting the Scene — text-only
Surface one concrete, currently established world detail that matters to action without promising a future event. Keep spatial and sensory continuity. Do not output image requests.
[WORLD|Category|Location or Context]
[world_media][/world_media]
[world_detail]Concrete detail, at most 50 words.[/world_detail]
[world_context][why_it_matters]Why this fact can matter now.[/why_it_matters][future_use]One plausible way in-world action could make it useful, revealing, or constraining.[/future_use][/world_context]
[/WORLD]`,

  'Off-Stage': `# Off-Stage — text-only
Write one complete active scene outside the focal scene, not a status summary. Show a specific place, participants pursuing wants, dialogue and/or action, and a changed situation by the end. Respect the knowledge firewall and do not output image requests.
[[else Thread Name]]
[else_media][/else_media]
[else_scene]A complete dramatized off-screen scene with concrete beats.[/else_scene]
[else_context][visibility]reader-only | rumour-bound | evidence-bound | already known here[/visibility][clock]Timing relative to the main scene.[/clock][knowledge]What the off-screen participants know that the focal cast does not.[/knowledge][collision]An existing channel that could later carry consequences, without guaranteeing it.[/collision][/else_context]
[[/else]]`,

  'Character Dossier': `# Character Dossier — text-only
At a person's first meaningful individuation, replace the first individuating phrase in the prose with one inline dossier. Classify current story weight as mook, side, or main; do not predict future importance. Keep the visible phrase grammatical, observed facts stable, secrets reader-only, and all rows grounded in canon. No image requests or renderer HTML.
[[npc Visible Text|mook]]
[npc_media][/npc_media]
»» mook
» name · role | full name · age/range · immediate role
» trait | one physical or behavioral anchor
» desire | immediate objective
» affiliation | current group or allegiance
[[/npc]]
For side, use [[npc Visible Text|side]], empty [npc_media], »» side, and grounded rows for name · role, look, personality, disposition, voice, desire, affiliation, history, ties, useful, function, and held back; close with [[/npc]]. For main, use [[npc Visible Text|main]], empty [npc_media], and the established full dossier sections: who, look, presence, drive, mask, truth, gap, seen by, self image, defenses, contradictions, taste, personality, values, wants, fears, voice, speech, past, ties, has wrong, carrying, outfits, playing them, and held back. Reclassification uses [[npc Visible Text|main|up from side]] and a complete new-tier sheet. Every section begins »»; every row uses » label | value. No filler placeholders.`,

  'Location File': `# Location File — text-only
Create once when a place has earned lasting value by recurrence, meaningful history, access, resources, faction control, secrecy, or investigation. Replace the first relevant prose phrase with a grammatical visible place marker. Respect restricted knowledge and do not output image requests.
[[place Visible Place Name]]
[place_media][/place_media]
»» identity
» name · kind | established name and kind
» scale · control | physical scale and actual control
»» character
» impression | recognizable sensory combination
» rule | social or physical truth shaping behavior
»» layout
» anchors | stable landmarks and their spatial relations
» routes | entrances, exits, chokepoints, restrictions
» around it | nearby areas and useful travel time
»» people
» frequented by | established groups and routines
» faces | recurring associated people
» customs | local expectations
»» history
» known | public history
» buried | reader-known concealed history, if established
» pressure | current change
»» use
» offers | resources or access
» risks | costs and hazards
» discoverable | action or question → information that could be earned
[[/place]]
Keep the six sections in order and every row in label | value format. Ordinary temporary changes belong in current scene state, not a replacement file.`,

  'In Another Life': `# In Another Life — text-only
Explore one plausible alternate choice or event without changing the canonical timeline. Preserve established identities, outfits, positions, and causal context at the divergence. Do not depict a guaranteed ending or output image requests.
[WHATIF|Short Branch Title]
[whatif_media][/whatif_media]
[whatif_scenario]Two or three concise paragraphs following one coherent hypothetical divergence.[/whatif_scenario]
[whatif_branch][pivot]Specific decision or event changed from canon.[/pivot][stakes]What becomes possible, uncertain, or risky.[/stakes][canon_state]Explicitly hypothetical and non-canon until forked.[/canon_state][/whatif_branch]
[/WHATIF]`,

  'Archive Entry': `# Archive Entry — text-only
Archive a lasting canon change, not an ordinary beat, outfit change, visit, or name alone. A specialized Surface wins unless this event independently merits an archive entry. Preserve the knowledge boundary: reader-known secrets are not automatically character-known. Do not output image requests.
[dossier_ui]
[category]CHARACTER|LOCATION|ITEM|FACTION|EVENT|RELATIONSHIP|SECRET[/category]
[archive_head][icon]single emoji[/icon][name]Entry name[/name][state]UNLOCKED|PARTIAL|LOCKED[/state][relation]Relationship/category[/relation][role]Role/type[/role][/archive_head]
[archive_media][/archive_media]
[archive_stats][archive_stat][label]Relevant metric 1[/label][value]0-100[/value][/archive_stat][archive_stat][label]Relevant metric 2[/label][value]0-100[/value][/archive_stat][archive_stat][label]Relevant metric 3[/label][value]0-100[/value][/archive_stat][/archive_stats]
[archive_details][archive_row][label]Field label[/label][value]Established value[/value][/archive_row][archive_row][label]Field label[/label][value]Established value[/value][/archive_row][/archive_details]
For EVENT or RELATIONSHIP, include [archive_timeline] with grounded [archive_moment][label]ORIGIN|SHIFT|FRACTURE|REUNION|REVELATION|OTHER[/label][stamp]Location; Date - Time[/stamp][text]What happened[/text][/archive_moment][/archive_timeline].
[archive_export]Plain-text lorebook entry using the established category, identities, and facts. No Markdown, HTML, XML, or CSS.[/archive_export]
[/dossier_ui]
Exactly three progress metrics. Choose category-appropriate details: character identity/appearance/behavior/ties; location identity/layout/atmosphere/significance; item properties/status/rules; faction members/dynamic; event cause/consequence; relationship status/trajectory; secret truth/known-by/hidden-from. No invented future outcomes.`,
  'Relationship Map': `# Relationship Map — text-only
Use only when a focal character has at least two meaningful, simultaneously relevant named relationships or a multi-person bond changes. Show only established connections and viewpoint-safe pressures; do not invent people, factions, or private knowledge. Do not output image requests or renderer HTML.
[relationship_map][id]unique-id[/id][title]Current bond map[/title][subtitle]Focal viewpoint[/subtitle]
[character_one][portrait][/portrait][name]Focal character[/name][role]Current role[/role][status]Focal[/status][summary]Established situation[/summary][relationship]Self[/relationship][strength]0-100[/strength][pressure]Current pressure[/pressure][/character_one]
[character_two][portrait][/portrait][name]Named connection[/name][role]Role[/role][status]Current status[/status][summary]Established situation[/summary][relationship]Bond to focal character[/relationship][strength]0-100[/strength][pressure]Current pressure[/pressure][/character_two]
[character_three][portrait][/portrait][name]Second named connection[/name][role]Role[/role][status]Current status[/status][summary]Established situation[/summary][relationship]Bond to focal character[/relationship][strength]0-100[/strength][pressure]Current pressure[/pressure][/character_three]
[connections][one_two]Established bond[/one_two][one_three]Established bond[/one_three][/connections][insight]One grounded insight[/insight][/relationship_map]
Every [portrait] remains empty. Preserve the three named nodes, connections, and current-position accuracy.`,
  'Cast Sheet': `# Cast Sheet — text-only
Use only when a named character's established identity and current role merit a compact cast reference. Preserve visible appearance, current outfit, and viewpoint-safe facts; do not invent an identity or hidden knowledge. Do not output image requests or renderer HTML.
[character_profile][portrait][/portrait][name]Established name[/name][role]Current role[/role][hook]One grounded story hook[/hook][trait]Concise established traits[/trait][/character_profile]
Keep [portrait] as the first child and empty. Keep [name], [role], [hook], [trait] in that exact order.`,
  'Persona Wardrobe': PERSONA_WARDROBE_TEXT_ONLY_PROMPT,
}

export function textOnlyNarrativeUtilityContent(name: string): string {
  const content = NARRATIVE_TEXT_ONLY_PROMPTS[name]
  if (!content) throw new Error(`Text-only Narrative Utility contract missing: ${name}`)
  return content
}
