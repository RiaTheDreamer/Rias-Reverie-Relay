import fs from 'node:fs'

const backend = fs.readFileSync('src/backend.ts', 'utf8')
const frontend = fs.readFileSync('src/frontend.ts', 'utf8')
const contracts = fs.readFileSync('src/contracts.ts', 'utf8')
const assert = (ok, message) => { if (!ok) throw new Error(message) }

for (const action of ['remove_slot_image', 'activate_alternate_look', 'return_to_base', 'save_collection', 'bind_collection', 'unbind_collection']) {
  assert(backend.includes(`'${action}'`), `backend contract is missing ${action}`)
}
assert(backend.includes("case 'remove_slot_image':") && backend.includes('handleRemoveSlotImage(payload'), 'Remove Image is declared but not routed')
assert(!backend.includes("case 'image_lab_action':") && !backend.includes("case 'image_analysis_action':"), 'retired direct-generation action is still routed')
assert(!backend.includes("case 'generate_scene_suggestion':") && !backend.includes("case 'dismiss_scene_suggestion':"), 'retired scene-suggestion action is still routed')
assert(!backend.includes("case 'save_manual_plan':") && !backend.includes("case 'select_beat':"), 'retired manual story action is still routed')
assert(frontend.includes("type: 'remove_slot_image'") && frontend.includes("action: 'activate_alternate_look'"), 'active controls are not connected to their backend actions')
assert(frontend.includes('message.slotKey || message.generationId') && frontend.includes('completedPreviewGenerations.has(message.generationId)'), 'preview events are not isolated by job or protected from late frames')
assert(frontend.includes('streamPreviews.clear()') && frontend.includes('completedPreviewGenerations.clear()'), 'preview state is not removed on teardown')
assert(contracts.includes('activeAlternateLookId?: string') && contracts.includes('collectionPresets: Record<string, SurfaceCollectionPreset>'), 'persistence contracts are incomplete')
console.log('action contract smoke ok')
