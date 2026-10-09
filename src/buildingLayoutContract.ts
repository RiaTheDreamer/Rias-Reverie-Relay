/** The user's later instruction replaces the handover's bracket authoring law.
 * Canonical authoring is Reverie XML; brackets remain read-only compatibility. */
export const BUILDING_LAYOUT_CONTRACT = `SURFACE: BUILDING LAYOUT
FORMAT: compact-v1
ROOT: <building_layout>
Use only for an explicitly requested building layout, building navigation, or an explorable building whose rooms matter. Merely being indoors is not a trigger. Names, geography, architecture and contents come from the current context, never a demonstration building.
Use Reverie XML semantic fields and child hierarchy exactly as shown. No semantic attributes, HTML, CSS, scripts, controls, decorative brackets or fences. Escape & and < inside text values. image_request attributes and its scene_brief are protected XML controls inside each <media>.
SCHEMA
<building_layout><id>…</id><title>…</title><subtitle>…</subtitle><building_context><name>…</name><type>…</type><setting>…</setting><style_note>…</style_note></building_context><floor><floor_id>…</floor_id><floor_name>…</floor_name><floor_summary>…</floor_summary><room><room_id>…</room_id><room_name>…</room_name><plan_slot>…</plan_slot><category>…</category><atmosphere>…</atmosphere><summary>…</summary><notable_features>…</notable_features><connected_to>…</connected_to><media><image_request id="…" target="custom.artifact-media" slot="…" aspect="4:3" alt="…"><scene_brief>…</scene_brief></image_request></media></room></floor></building_layout>

MEDIA
minimum=2, maximum=16; target=custom.artifact-media; aspect=4:3. Repeat floor and room records as needed. Each room owns one environment-only image of that exact room, preserving established architecture, objects, time and light. No people, interface, floor-plan labels or readable text.
BOUNDS AND OWNERSHIP
1–4 floors, 2–8 rooms per floor, maximum 16 rooms total. Every floor/room ID is unique within the layout; every image ID and slot is unique across the response. Keep the layout ID stable for the same building. plan_slot is exactly northwest, north, northeast, west, east, southwest, south or southeast, unique per floor. The central circulation core is renderer-owned; never author a core room. Each room owns exactly one complete non-empty 4:3 custom.artifact-media request, inside its own <media>; never omit, share, resolve or relocate it. Text metadata stays outside the image brief. Preserve every field, nesting and closer; validate bounds, non-empty values and ownership before stopping.
INTERACTION
Relay owns floor/room selection and Add to lorebook. Do not author move_text, player movement, Composer drafts, button HTML or lorebook action tags. Selecting a room changes only the view; the human must click Add to lorebook to save that room. No click advances the story or sends a message.`

const room = (id: string, name: string, position: string) => `<room><room_id>${id}</room_id><room_name>${name}</room_name><plan_slot>${position}</plan_slot><category>Interior</category><atmosphere>Quiet</atmosphere><summary>A room grounded in the current setting.</summary><notable_features>Established architectural details</notable_features><connected_to>Circulation hall</connected_to><media><image_request id="building-${id}" target="custom.artifact-media" slot="building-${id}" aspect="4:3" alt="${name}"><scene_brief>Environment-only view of the ${name.toLowerCase()}, established furnishings and natural light. No people or readable text.</scene_brief></image_request></media></room>`
export const BUILDING_LAYOUT_SAMPLE = `<building_layout><id>current-building</id><title>Building Layout</title><subtitle>Explore the established rooms</subtitle><building_context><name>Current building</name><type>Residence</type><setting>Current setting</setting><style_note>Established architecture</style_note></building_context><floor><floor_id>ground-floor</floor_id><floor_name>Ground floor</floor_name><floor_summary>Shared rooms and circulation</floor_summary>${room('entry', 'Entrance', 'north')}${room('common-room', 'Common room', 'east')}</floor></building_layout>`

export function buildingLayoutLegacyBracketExample(xml: string): string {
  return xml.replace(/<image_request\b[^>]*>[\s\S]*?<\/image_request>|<(\/?)([a-z_]+)>/gi, (full, slash, tag) => tag ? `[${slash}${tag}]` : full)
}
