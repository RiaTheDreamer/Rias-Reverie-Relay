import { parseBracketDocument, bracketNodeText, type BracketNode } from './bracketParser'

export const BUILDING_LAYOUT_ID = 'building-layout'
export const BUILDING_LAYOUT_ROOT = 'building_layout'
export const BUILDING_PLAN_SLOTS = ['northwest', 'north', 'northeast', 'west', 'east', 'southwest', 'south', 'southeast'] as const
export type BuildingRoom = { id: string; name: string; planSlot: string; category: string; atmosphere: string; summary: string; features: string; connectedTo: string; media: string }
export type BuildingFloor = { id: string; name: string; summary: string; rooms: BuildingRoom[] }
export type BuildingLayout = { id: string; title: string; subtitle: string; context: { name: string; type: string; setting: string; styleNote: string }; floors: BuildingFloor[] }
export type BuildingLayoutResult = { layout: BuildingLayout | null; diagnostics: string[] }

const semanticTags = new Set('building_layout id title subtitle building_context name type setting style_note floor floor_id floor_name floor_summary room room_id room_name plan_slot category atmosphere summary notable_features connected_to move_text media'.split(' '))
const escape = (value: string) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const plain = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/&#91;/g, '[').replace(/&#93;/g, ']').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&').trim()
const children = (node: BracketNode, tag: string) => node.children.filter((child): child is BracketNode => typeof child !== 'string' && child.name === tag)

/** Each owner's media is opaque to semantic parsing, including brackets in briefs.
 * Canonical authoring is XML; bracket input remains read-only compatibility. */
export function parseBuildingLayout(source: string, phase: 'authoring' | 'display' = 'display'): BuildingLayoutResult {
  const diagnostics: string[] = []
  const media: string[] = []
  if (phase === 'authoring' && !/^\s*<building_layout>/.test(source)) diagnostics.push('New Building Layout output must use XML.')
  const xml = /^\s*</.test(source)
  let structural = source.replace(/(?:\[media\]([\s\S]*?)\[\/media\]|<media>([\s\S]*?)<\/media>)/gi, (_full, bracket: string, body: string) => {
    const value = `__building_media_${media.push(bracket ?? body) - 1}__`
    return xml ? `<media>${value}</media>` : `[media]${value}[/media]`
  })
  if (xml) {
    // Preserve literal brackets in XML values, then project *only* bare known
    // semantic tags into the shared tree parser. All remaining XML is invalid.
    structural = structural.replace(/\[/g, '&#91;').replace(/\]/g, '&#93;')
      .replace(/<(\/?)([a-z_]+)>/gi, (full, slash: string, tag: string) => semanticTags.has(tag.toLowerCase()) ? `[${slash}${tag}]` : full)
    if (/<|>/.test(structural)) diagnostics.push('Unexpected XML tag, attributes or unescaped text.')
  }
  // The shared parser is tolerant for legacy imports; this new owner is not.
  const stack: string[] = []
  for (const token of structural.matchAll(/\[(\/?)([a-z_]+)([^\]]*)\]/gi)) {
    const name = token[2].toLowerCase()
    if (token[3].trim()) diagnostics.push(`Attributes are not allowed on [${name}].`)
    if (token[1]) {
      if (stack.pop() !== name) diagnostics.push(`Unbalanced closing field [/${name}].`)
    } else stack.push(name)
  }
  if (stack.length) diagnostics.push('Building Layout has unclosed fields.')
  const parsed = parseBracketDocument(structural)
  diagnostics.push(...parsed.diagnostics)
  const root = parsed.roots[0]
  if (parsed.roots.length !== 1 || root?.name !== BUILDING_LAYOUT_ROOT) return { layout: null, diagnostics: ['Expected exactly one balanced Building Layout root.', ...diagnostics] }
  const field = (node: BracketNode, tag: string, required = true) => {
    const matches = children(node, tag)
    if (matches.length !== 1 || matches[0].children.some(child => typeof child !== 'string')) {
      if (required || matches.length) diagnostics.push(`Expected exactly one scalar [${tag}].`)
      return ''
    }
    const value = plain(bracketNodeText(matches[0]))
    if (required && !value) diagnostics.push(`[${tag}] is empty.`)
    return value
  }
  const walk = (node: BracketNode) => {
    if (!semanticTags.has(node.name) || Object.keys(node.attrs || {}).length) diagnostics.push(`Unsupported field or attributes: [${node.name}].`)
    const hierarchy: Record<string, string[]> = {
      building_layout: ['id', 'title', 'subtitle', 'building_context', 'floor'],
      building_context: ['name', 'type', 'setting', 'style_note'],
      floor: ['floor_id', 'floor_name', 'floor_summary', 'room'],
      room: ['room_id', 'room_name', 'plan_slot', 'category', 'atmosphere', 'summary', 'notable_features', 'connected_to', 'move_text', 'media'],
    }
    for (const child of node.children) {
      if (typeof child !== 'string') {
        if (!hierarchy[node.name]?.includes(child.name)) diagnostics.push(`Unexpected [${child.name}] inside [${node.name}].`)
        walk(child)
      } else if (hierarchy[node.name] && child.trim()) diagnostics.push(`Unexpected unowned text inside [${node.name}].`)
    }
  }
  walk(root)
  const contexts = children(root, 'building_context')
  if (contexts.length !== 1) diagnostics.push('Expected exactly one [building_context].')
  const context = contexts[0] || { name: 'building_context', children: [] }
  const seenRooms = new Set<string>(), seenFloors = new Set<string>(), seenRequests = new Set<string>(), seenSlots = new Set<string>()
  const stable = (id: string, seen: Set<string>, label: string) => {
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(id) || seen.has(id)) diagnostics.push(`${label} must be a unique non-empty lowercase stable ID: ${id}.`)
    seen.add(id)
  }
  const floors = children(root, 'floor').map(floor => {
    const id = field(floor, 'floor_id'); stable(id, seenFloors, 'Floor ID')
    const placements = new Set<string>()
    const rooms = children(floor, 'room').map(room => {
      const roomId = field(room, 'room_id'); stable(roomId, seenRooms, 'Room ID')
      const planSlot = field(room, 'plan_slot')
      if (!(BUILDING_PLAN_SLOTS as readonly string[]).includes(planSlot) || placements.has(planSlot)) diagnostics.push(`Invalid or duplicate plan slot on floor ${id}: ${planSlot}.`)
      placements.add(planSlot)
      const owner = field(room, 'media')
      const ownerIndex = /^__building_media_(\d+)__$/.exec(owner)
      const roomMedia = ownerIndex ? media[Number(ownerIndex[1])] || '' : ''
      if (/\bon\w+\s*=|(?:src|href)\s*=\s*["']\s*javascript:|<script\b/i.test(roomMedia)) diagnostics.push(`Room ${roomId}: unsafe media markup.`)
      const requests = [...roomMedia.matchAll(/<image_request\b([^>]*)>([\s\S]*?)<\/image_request>/gi)]
      if (/\[\/?(?:image_request|scene_brief)\b/i.test(roomMedia)) diagnostics.push(`Room ${roomId}: image controls must be XML.`)
      if (requests.length) {
        if (requests.length !== 1 || (roomMedia.match(/<image_request\b/gi) || []).length !== 1 || roomMedia.replace(requests[0][0], '').trim()) diagnostics.push(`Room ${roomId}: media must own exactly one image request.`)
        for (const request of requests) {
          const attrs = Object.fromEntries([...request[1].matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(match => [match[1], match[2] ?? match[3]]))
          stable(attrs.id || '', seenRequests, 'Request ID'); stable(attrs.slot || '', seenSlots, 'Request slot')
          if (attrs.target !== 'custom.artifact-media' || attrs.aspect !== '4:3') diagnostics.push(`Room ${roomId}: required target custom.artifact-media and aspect 4:3.`)
          if (!/^\s*<scene_brief>\s*\S[\s\S]*?<\/scene_brief>\s*$/i.test(request[2]) || (request[2].match(/<scene_brief>/gi) || []).length !== 1) diagnostics.push(`Room ${roomId}: expected exactly one non-empty scene_brief.`)
        }
      } else {
        const images = roomMedia.match(/<img\b/g) || []
        const runtimeOwner = /(?:<image_request_error\b|data-rrn-native-request=|\brrl-card\b|<!--\s*reverie-relay:)/i.test(roomMedia)
        const ownedImage = /^\s*(?:<!--[^]*?-->\s*)?<img\b[^>]*data-dgir-(?:request-id|key)=[^>]*>\s*$/i.test(roomMedia)
        const ownedError = /^\s*<image_request_error\b[^>]*>[^]*?<\/image_request_error>\s*$/i.test(roomMedia)
        if (phase === 'authoring' || images.length > 1 || (!ownedImage && !ownedError) || (!runtimeOwner && images.length !== 1)) diagnostics.push(`Room ${roomId}: missing or ambiguous owned media.`)
      }
      return { id: roomId, name: field(room, 'room_name'), planSlot, category: field(room, 'category'), atmosphere: field(room, 'atmosphere'), summary: field(room, 'summary'), features: field(room, 'notable_features'), connectedTo: field(room, 'connected_to'), media: roomMedia }
    })
    if (rooms.length < 2 || rooms.length > 8) diagnostics.push(`Floor ${id} requires 2–8 rooms.`)
    return { id, name: field(floor, 'floor_name'), summary: field(floor, 'floor_summary'), rooms }
  })
  if (floors.length < 1 || floors.length > 4 || seenRooms.size > 16) diagnostics.push('Building Layout requires 1–4 floors and at most 16 rooms.')
  const layout = { id: field(root, 'id'), title: field(root, 'title'), subtitle: field(root, 'subtitle'), context: { name: field(context, 'name'), type: field(context, 'type'), setting: field(context, 'setting'), styleNote: field(context, 'style_note') }, floors }
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(layout.id)) diagnostics.push('Layout ID must be lowercase and stable.')
  return { layout: diagnostics.length ? null : layout, diagnostics }
}

/** A missing closer is bounded at the next registered sibling owner, never
 * allowed to swallow the rest of an assistant message. */
export function buildingLayoutBlocks(source: string, siblingRoots: readonly string[] = []): Array<{ source: string; start: number; end: number }> {
  const blocks: Array<{ source: string; start: number; end: number }> = []
  const opens = /(?:\[building_layout(?:\s+[^\]]*)?\]|<building_layout\b[^>]*>)/gi
  let cursor = 0
  for (const open of source.matchAll(opens)) {
    const start = open.index || 0
    if (start < cursor) continue
    const bracket = open[0].startsWith('[')
    const tail = source.slice(start + open[0].length)
    const searchTail = tail.replace(/<image_request\b[^>]*>[\s\S]*?<\/image_request>/gi, request => ' '.repeat(request.length))
    const closer = bracket ? /\[\/building_layout\]/i.exec(searchTail) : /<\/building_layout>/i.exec(searchTail)
    let end = closer ? start + open[0].length + closer.index + closer[0].length : source.length
    const siblings = [...siblingRoots, 'building_layout'].filter(root => /^[a-z][\w-]*$/i.test(root))
    if (siblings.length) {
      const next = new RegExp(`(?:\\[|<)(?:${siblings.join('|')})(?=[\\s>\\]])`, 'i').exec(searchTail)
      if (next && start + open[0].length + next.index < end) end = start + open[0].length + next.index
    }
    blocks.push({ source: source.slice(start, end), start, end }); cursor = end
  }
  return blocks
}

export function buildingLayoutLoreRecord(layout: BuildingLayout, roomId: string) {
  const floor = layout.floors.find(item => item.rooms.some(room => room.id === roomId))
  const room = floor?.rooms.find(item => item.id === roomId)
  if (!floor || !room) throw new Error('Selected room does not belong to this Building Layout.')
  return { title: room.name, keys: [...new Set([room.name, layout.context.name])], content: `Building: ${layout.context.name}\nType: ${layout.context.type}\nSetting: ${layout.context.setting}\nArchitecture: ${layout.context.styleNote}\nFloor: ${floor.name}\nFloor purpose: ${floor.summary}\nRoom: ${room.name}\nPosition: ${room.planSlot}\nCategory: ${room.category}\nAtmosphere: ${room.atmosphere}\nDescription: ${room.summary}\nNotable features: ${room.features}\nConnected to: ${room.connectedTo}` }
}

export function renderBuildingLayout(layout: BuildingLayout, renderMedia: (media: string) => string, mode = 'plain'): string {
  const floors = layout.floors.map((floor, index) => `<button type="button" data-rrn-action="building-floor" data-bl-floor="${index}" aria-pressed="${index === 0}"><strong>${escape(floor.name)}</strong><small>${floor.rooms.length} rooms</small></button>`).join('')
  const bodies = layout.floors.map((floor, index) => `<section class="bl-floor" data-bl-floor-panel="${index}"${index ? ' hidden' : ''}><div class="bl-plan-card"><h3>${escape(floor.name)}</h3><p>${escape(floor.summary)}</p><div class="bl-plan"><div class="bl-core" aria-label="Circulation core">HALL</div>${floor.rooms.map((room, roomIndex) => `<button type="button" class="bl-room-node bl-slot-${room.planSlot}" data-rrn-action="building-room" data-bl-room="${roomIndex}" aria-pressed="${roomIndex === 0}"><small>${escape(room.category)}</small><span>${escape(room.name)}</span></button>`).join('')}</div></div><div class="bl-detail">${floor.rooms.map((room, roomIndex) => `<section class="bl-room-detail" data-bl-room-panel="${roomIndex}"${roomIndex ? ' hidden' : ''}><div class="bl-media">${renderMedia(room.media)}</div><div class="bl-room-copy"><small>${escape(room.category)}</small><h3>${escape(room.name)}</h3><p class="bl-atmosphere">${escape(room.atmosphere)}</p><p>${escape(room.summary)}</p><dl><div><dt>Notable features</dt><dd>${escape(room.features)}</dd></div><div><dt>Connected to</dt><dd>${escape(room.connectedTo)}</dd></div></dl><button type="button" class="bl-add" data-rrn-action="building-lorebook" data-bl-layout-id="${escape(layout.id)}" data-bl-room-id="${escape(room.id)}">Add to lorebook</button></div></section>`).join('')}</div></section>`).join('')
  const inner = `<header class="bl-head"><div><small>${escape(layout.context.type)} · ${escape(layout.context.name)}</small><h2>${escape(layout.title)}</h2><p>${escape(layout.subtitle)}</p></div><div><strong>${escape(layout.context.setting)}</strong><p>${escape(layout.context.styleNote)}</p></div></header><nav class="bl-floors" aria-label="Building floors">${floors}</nav><div class="bl-body">${bodies}</div>`
  return `<div class="rrn-native-island">${BUILDING_LAYOUT_CSS}<article class="rrn-root bl-atlas" data-rrn-surface="building-layout" data-bl-layout-id="${escape(layout.id)}">${mode === 'inline' ? `<section class="bl-shell">${inner}</section>` : `<details class="bl-shell"><summary>Building Layout</summary>${inner}</details>`}</article></div>`
}

export function handleBuildingLayoutNavigation(button: HTMLButtonElement): boolean {
  const owner = button.closest<HTMLElement>('.bl-atlas')
  if (!owner) return false
  const action = button.dataset.rrnAction
  if (action === 'building-floor') {
    const index = button.dataset.blFloor
    owner.querySelectorAll<HTMLElement>('[data-bl-floor-panel]').forEach(panel => { panel.hidden = panel.dataset.blFloorPanel !== index })
    owner.querySelectorAll<HTMLButtonElement>('[data-bl-floor]').forEach(tab => tab.setAttribute('aria-pressed', String(tab === button)))
    return true
  }
  if (action === 'building-room') {
    const floor = button.closest<HTMLElement>('[data-bl-floor-panel]')
    if (!floor) return false
    floor.querySelectorAll<HTMLElement>('[data-bl-room-panel]').forEach(panel => { panel.hidden = panel.dataset.blRoomPanel !== button.dataset.blRoom })
    floor.querySelectorAll<HTMLButtonElement>('[data-bl-room]').forEach(node => node.setAttribute('aria-pressed', String(node === button)))
    return true
  }
  return false
}

export const BUILDING_LAYOUT_CSS = `<style data-reverie-building-layout="1">
.bl-atlas{--bl-gold:color-mix(in srgb,var(--lumiverse-text-secondary,#c6a777) 70%,#bc9865);width:min(100%,980px);color:var(--lumiverse-text-primary,#f1e8de);font-family:var(--lumiverse-font-family,system-ui,sans-serif)}.bl-atlas *{box-sizing:border-box;min-width:0}.bl-atlas [hidden]{display:none!important}.bl-shell{border:1px solid color-mix(in srgb,var(--bl-gold) 40%,transparent);border-radius:18px;background:var(--lumiverse-bg-deep,#130e12);overflow:hidden}.bl-shell>summary{padding:15px;cursor:pointer;font-weight:700}.bl-head{display:grid;grid-template-columns:1.3fr 1fr;gap:18px;padding:22px;border-bottom:1px solid color-mix(in srgb,var(--bl-gold) 28%,transparent)}.bl-head h2,.bl-room-copy h3{font:600 clamp(23px,4vw,34px)/1.12 Georgia,serif;margin:7px 0}.bl-atlas small,.bl-atlas dt{color:var(--bl-gold);font-size:11px;text-transform:uppercase;letter-spacing:.08em}.bl-atlas p,.bl-atlas dd{font-size:13px;line-height:1.55;overflow-wrap:anywhere}.bl-floors{display:flex;gap:8px;overflow-x:auto;padding:14px;scrollbar-width:thin}.bl-atlas button{font:inherit;color:inherit;cursor:pointer;border:1px solid color-mix(in srgb,var(--bl-gold) 32%,transparent);border-radius:9px;background:var(--lumiverse-bg-elevated,#231b23);min-height:44px}.bl-floors button{flex:0 0 auto;padding:10px 16px;display:grid;gap:4px;text-align:left}.bl-atlas button[aria-pressed="true"]{border-color:var(--lumiverse-primary,#c24b78);background:color-mix(in srgb,var(--lumiverse-primary,#c24b78) 20%,var(--lumiverse-bg-elevated,#231b23))}.bl-body{padding:0 14px 16px}.bl-floor{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start}.bl-plan-card,.bl-detail{border:1px solid color-mix(in srgb,var(--bl-gold) 26%,transparent);border-radius:12px;overflow:hidden}.bl-plan-card{padding:14px}.bl-plan-card h3{font:600 21px Georgia,serif;margin:0}.bl-plan{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(3,minmax(85px,auto));gap:7px;padding:12px;border:1px dashed color-mix(in srgb,var(--bl-gold) 35%,transparent);background-image:linear-gradient(color-mix(in srgb,var(--bl-gold) 5%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--bl-gold) 5%,transparent) 1px,transparent 1px);background-size:16px 16px}.bl-core{grid-area:2/2;display:grid;place-items:center;align-self:center;aspect-ratio:1;border:1px solid var(--bl-gold);border-radius:50%;font-size:10px;color:var(--bl-gold)}.bl-room-node{display:flex;flex-direction:column;justify-content:center;gap:7px;padding:7px;overflow-wrap:anywhere}.bl-room-node span{font-size:12px;line-height:1.35}.bl-room-node small{font-size:9px}.bl-slot-northwest{grid-area:1/1}.bl-slot-north{grid-area:1/2}.bl-slot-northeast{grid-area:1/3}.bl-slot-west{grid-area:2/1}.bl-slot-east{grid-area:2/3}.bl-slot-southwest{grid-area:3/1}.bl-slot-south{grid-area:3/2}.bl-slot-southeast{grid-area:3/3}.bl-media{position:relative;aspect-ratio:4/3;background:var(--lumiverse-bg-deep,#0e0a0d);overflow:hidden;display:grid;place-items:center}.bl-media>.rrl-island,.bl-media>.rrl-resolved,.bl-media>img{width:100%;height:100%;max-width:none}.bl-media img{width:100%;height:100%;object-fit:cover}.bl-media image_request,.bl-media scene_brief{display:none!important}.bl-room-copy{padding:16px}.bl-room-copy h3{font-size:25px;overflow-wrap:anywhere}.bl-atmosphere{font-style:italic;color:var(--lumiverse-text-secondary,#c9b6b8)}.bl-room-copy dl{display:grid;grid-template-columns:1fr 1fr;gap:8px}.bl-room-copy dl>div{padding:10px;border:1px solid color-mix(in srgb,var(--bl-gold) 25%,transparent);border-radius:9px}.bl-atlas dd{margin:6px 0 0}.bl-add{width:100%;padding:12px;background:color-mix(in srgb,var(--lumiverse-primary,#c24b78) 20%,var(--lumiverse-bg-elevated,#231b23))!important}.bl-atlas button:focus-visible,.bl-shell>summary:focus-visible{outline:2px solid var(--lumiverse-primary,#c24b78);outline-offset:3px}@media(max-width:680px){.bl-head,.bl-floor{grid-template-columns:1fr}.bl-head{padding:16px}.bl-body{padding:0 9px 12px}.bl-plan{grid-template-rows:repeat(3,minmax(78px,auto))}}@media(max-width:420px){.bl-room-copy dl{grid-template-columns:1fr}.bl-plan-card{padding:9px}.bl-plan{padding:7px;gap:5px}}
</style>`
