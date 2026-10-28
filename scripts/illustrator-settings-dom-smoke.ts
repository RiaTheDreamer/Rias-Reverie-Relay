// @ts-nocheck -- mounted production controls, no host/provider calls.
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
const dom = new JSDOM('<body><div id="drawer"></div></body>', { url: 'http://localhost/', pretendToBeVisual: true })
const win = dom.window
for (const name of ['window','document','HTMLElement','HTMLButtonElement','HTMLImageElement','HTMLInputElement','HTMLSelectElement','HTMLTextAreaElement','HTMLStyleElement','Element','ShadowRoot','Node','MutationObserver','Event','CustomEvent','getComputedStyle']) globalThis[name] = name === 'window' ? win : name === 'document' ? win.document : win[name]
win.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
win.setInterval = () => 0; win.clearInterval = () => {}
const frames = new Map<number, Function>(); let frame = 0
win.requestAnimationFrame = callback => { frames.set(++frame, callback); return frame }
win.cancelAnimationFrame = id => frames.delete(id)
globalThis.requestAnimationFrame = win.requestAnimationFrame; globalThis.cancelAnimationFrame = win.cancelAnimationFrame
globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) })
globalThis.spindle = { on() {}, onFrontendMessage() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, sendToFrontend() {}, log: { info() {}, warn() {}, error() {} } }
const drawer = document.getElementById('drawer')
const sent = []
const hostEvents = new Map<string, Function>()
let receive: Function
const ctx = {
  dom: { addStyle: () => () => {}, findMessageElement: () => null, cleanup() {} },
  ui: { registerDrawerTab: () => ({ root: drawer, setTitle() {}, setShortName() {}, setBadge() {}, activate() {}, onActivate: () => () => {}, destroy() {} }), registerInputBarAction: () => ({ setLabel() {}, setSubtitle() {}, setEnabled() {}, onClick: () => () => {}, destroy() {} }) },
  events: { on: (name, handler) => { hostEvents.set(name, handler); return () => hostEvents.delete(name) }, emit() {} }, display: { invalidate() {} },
  messages: { registerTagInterceptor: () => () => {}, getRecent: () => [] },
  getActiveChat: () => ({ chatId: 'chat', characterId: 'character' }), sendToBackend(message) { sent.push(message) }, onBackendMessage(handler) { receive = handler; return () => {} },
}
const { setup } = await import('../src/frontend')
const cleanup = setup(ctx)
const flush = async () => { for (let i = 0; i < 5; i++) { await Promise.resolve(); const batch = [...frames]; frames.clear(); for (const [, callback] of batch) callback(0) } }
const button = label => [...drawer.querySelectorAll('button.dg-illustrator-mode-card')].find(element => element.querySelector('strong')?.textContent.trim() === label)
  || [...drawer.querySelectorAll('button')].find(element => element.textContent.trim() === label)
const framing = label => [...drawer.querySelectorAll('button')].find(element => element.getAttribute('aria-label')?.startsWith(`${label}: `))
const state = { type: 'state', chatId: 'chat', revision: 1, records: [], config: { enabled: true, phoneEnabled: false, enableRelayOrb: false, autoRescanOnChatOpen: false,
  proseIllustratorSettings: { enabled: true, mode: 'relay-planned', perspectiveMode: 'sequence', promptFormat: 'natural-language', adaptiveMode: true } }, parserConnections: [], imageConnections: [], imageProviders: [], logs: [], candidateBatches: [], galleryLinks: [], versionTrees: [] }
receive(state); await flush()
button('Illustrations').click(); await flush()
assert(framing('Sequence'), `Illustrator controls unavailable: ${[...drawer.querySelectorAll('button')].map(element => element.textContent.trim()).join(' | ')}`)
const modes = [['Scene Snapshot','scene-snapshot'],['Sequence','sequence'],['Emotional Beat','emotional-beat'],['Char only','solo-scene'],['Persona POV','persona-pov'],['Storyboard','storyboard'],['Blocking Fidelity','blocking-fidelity'],['Scene Flow','scene-flow'],['Dreamcut','dreamcut']]
// Framing help must be usable without hover and without changing the selection.
const beforeHelp = sent.length
for (const width of [390, 1280]) {
  Object.defineProperty(win, 'innerWidth', { configurable: true, value: width })
  for (const [label] of modes) {
    const help = drawer.querySelector(`[aria-label="Help for ${label}"]`)
    assert(help, `${label} needs a tap/keyboard help control`)
    assert(!help.closest('button'), 'help must not nest an interactive control inside the selection button')
    const selected = framing('Sequence').getAttribute('aria-pressed')
    help.getBoundingClientRect = () => ({ left: width - 30, top: 8, right: width - 6, bottom: 32, width: 24, height: 24 })
    help.click()
    const popover = document.querySelector('.dg-help-portal [role="tooltip"]')
    assert(popover && popover.textContent === framing(label).getAttribute('aria-label').slice(label.length + 2), 'help must expose the complete description')
    assert.equal(help.getAttribute('aria-expanded'), 'true')
    assert(Number.parseFloat(popover.style.left) >= 12 && Number.parseFloat(popover.style.left) + Number.parseFloat(popover.style.width) <= width - 12, 'help stays inside the viewport')
    assert.equal(framing('Sequence').getAttribute('aria-pressed'), selected)
    help.click()
    assert(!document.querySelector('.dg-help-portal'), 'second tap dismisses help')
    help.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    assert(document.querySelector('.dg-help-portal'), 'keyboard opens help')
    help.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    assert(!document.querySelector('.dg-help-portal'), 'Escape dismisses help')
  }
}
assert.equal(sent.length, beforeHelp, 'reading descriptions must not save settings or start work')
let cases = 0
for (const workflow of ['Relay','Story Model']) {
  button(workflow).click(); await flush()
  for (const [label, mode] of modes) for (const [formatLabel, format] of [['Natural Language','natural-language'],['Booru Tag Mode','danbooru-tags']]) {
    // Two clicks before the scheduled panel rerender, then an older backend
    // echo: the second edit must retain the first and the echo cannot undo it.
    framing(label).click()
    button(formatLabel).click()
    const updates = sent.filter(message => message.type === 'set_config' && message.patch.proseIllustratorSettings)
    assert.deepEqual(Object.keys(updates.at(-1).patch.proseIllustratorSettings), ['promptFormat'], 'send only the edited field, never a stale full-form snapshot')
    const patch = updates.reduce((settings,message) => ({...settings,...message.patch.proseIllustratorSettings}), state.config.proseIllustratorSettings)
    assert.equal(patch.perspectiveMode, mode)
    assert.equal(patch.promptFormat, format)
    assert.equal(patch.mode, workflow === 'Relay' ? 'relay-planned' : 'inline-protocol')
    receive({ ...state, revision: ++state.revision }); await flush()
    assert.equal(framing(label).getAttribute('aria-pressed'), 'true', 'stale echo must not paint another framing')
    assert.equal(button(formatLabel).getAttribute('aria-pressed'), 'true')
    state.config.proseIllustratorSettings = patch
    receive({ ...state, revision: ++state.revision }); await flush()
    assert.equal(framing(label).getAttribute('aria-pressed'), 'true', 'acknowledged setting must survive rerender')
    cases++
  }
}
assert(!sent.some(message => /generate|dispatch/.test(message.type)), 'settings edits must not start a provider')
for (const [label,key] of [['Sightline Guard','sightlineGuard'],['Quickweave','quickweave'],['Portrait Insight','portraitInsight'],['Opening Frame','openingFrame']]) {
  const input=[...drawer.querySelectorAll('label.dg-toggle')].find(el=>el.querySelector('.dg-toggle-title')?.textContent===label)?.querySelector('input')
  assert(input, `${label} mounted`)
  input.checked=true; input.dispatchEvent(new win.Event('input',{bubbles:true}));await flush()
  const patch=sent.filter(message=>message.type==='set_config').at(-1).patch.proseIllustratorSettings
  assert.equal(patch[key],true)
  state.config.proseIllustratorSettings={...state.config.proseIllustratorSettings,...patch};receive({...state,revision:++state.revision});await flush()
}

const appearanceControl = (label, tag) => [...drawer.querySelectorAll('.dg-field')].find(field => field.textContent.startsWith(label))?.querySelector(tag)
let cadence = appearanceControl('Update Every X Story Responses', 'input')
assert(cadence, 'Appearance update frequency must be available in Illustrator settings')
cadence.value = '4'; cadence.dispatchEvent(new win.Event('input', { bubbles: true })); await flush()
assert.equal(sent.filter(message => message.type === 'set_config').at(-1).patch.appearanceUpdateIntervalMessages, 4, 'A valid count must save without waiting for blur')
receive({ ...state, revision: ++state.revision }); await flush()
assert.equal(appearanceControl('Update Every X Story Responses', 'input').value, '4', 'A stale backend echo must not undo the frequency edit')
state.config.appearanceUpdateIntervalMessages = 4
receive({ ...state, revision: ++state.revision }); await flush()
button('Appearance').click(); await flush()
assert.equal(appearanceControl('Update Every X Story Responses', 'input').value, '4', 'Appearance and Illustrator must edit the same global schedule')
let schedule = appearanceControl('Automatic Appearance Updates', 'select')
schedule.value = 'never'; schedule.dispatchEvent(new win.Event('change', { bubbles: true })); await flush()
assert.equal(sent.filter(message => message.type === 'set_config').at(-1).patch.appearanceUpdateIntervalMessages, 0)
assert(!appearanceControl('Update Every X Story Responses', 'input'), 'Never must hide the inactive numeric control')
assert.match(drawer.textContent, /once for initial setup/)
state.config.appearanceUpdateIntervalMessages = 0
receive({ ...state, revision: ++state.revision }); await flush()
button('Illustrations').click(); await flush()
assert.equal(appearanceControl('Automatic Appearance Updates', 'select').value, 'never', 'Never must persist across panel navigation')
schedule = appearanceControl('Automatic Appearance Updates', 'select')
schedule.value = 'every'; schedule.dispatchEvent(new win.Event('change', { bubbles: true })); await flush()
assert.equal(appearanceControl('Update Every X Story Responses', 'input').value, '1', 'Re-enabling automatic updates defaults to every response')
state.config.appearanceUpdateIntervalMessages = 1
receive({ ...state, revision: ++state.revision }); await flush()

const nsfwToggle = [...drawer.querySelectorAll('.dg-toggle')].find(label => label.querySelector('.dg-toggle-title')?.textContent === 'NSFW Planner Guidance')?.querySelector('input')
assert(nsfwToggle, 'The planner-only NSFW toggle must mount beside its editable text')
assert.equal(nsfwToggle.checked, false, 'The new control defaults off')
nsfwToggle.click(); await flush()
const nsfwText = [...drawer.querySelectorAll('.dg-field')].find(field => field.textContent.startsWith('NSFW Planner Text'))?.querySelector('textarea')
assert(nsfwText, 'The NSFW macro text must be editable in the same prompt controls')
nsfwText.value = 'Preserve the adult scene’s established clothing state.'
nsfwText.dispatchEvent(new Event('change', { bubbles: true })); await flush()
const nsfwPatch = sent.filter(message => message.type === 'set_config' && message.patch.proseIllustratorSettings)
  .reduce((settings,message)=>({...settings,...message.patch.proseIllustratorSettings}),state.config.proseIllustratorSettings)
assert.equal(nsfwPatch.nsfwPlannerEnabled, true)
assert.equal(nsfwPatch.nsfwPlannerText, nsfwText.value)
state.config.proseIllustratorSettings = nsfwPatch
receive({ ...state, revision: ++state.revision }); await flush()
assert([...drawer.querySelectorAll('.dg-toggle')].find(label => label.querySelector('.dg-toggle-title')?.textContent === 'NSFW Planner Guidance')?.querySelector('input').checked, 'Acknowledged NSFW settings survive panel reconstruction')

// Keep the production controls mounted while moving between focused fields,
// just as the live panel does to avoid closing native dropdowns. Each nested
// parameter edit must merge the latest local config, not the render's snapshot.
state.config = { ...state.config, generationSettingsSource: 'relay', followNativeImageGen: false,
  loraSource: 'none', imageParameters: { seed: 42 } }
receive({ ...state, revision: ++state.revision }); await flush()
button('Settings').click(); await flush()
const fieldControl = (label, selector) => [...drawer.querySelectorAll('.dg-field')]
  .find(field => field.textContent.startsWith(label))?.querySelector(selector)
const steps = fieldControl('Steps', 'input'), cfg = fieldControl('CFG / Guidance', 'input')
const sampler = fieldControl('Sampler', 'select'), scheduler = fieldControl('Scheduler', 'select')
assert(steps && cfg && sampler && scheduler, 'production Relay image settings must mount')
for (const [control, value] of [[steps,'10'], [cfg,'1'], [sampler,'euler'], [scheduler,'normal']]) {
  control.focus(); control.value = value; control.dispatchEvent(new Event('change', { bubbles: true }))
}
const parameterPatch = sent.filter(message => message.type === 'set_config').at(-1).patch.imageParameters
const expectedParameters = { seed: 42, steps: 10, cfgScale: 1, cfg: 1, sampler: 'euler', sampler_name: 'euler', scheduler: 'normal' }
assert.deepEqual(parameterPatch, expectedParameters, 'focused Relay parameter edits must retain each other and unedited parameters')
receive({ ...state, revision: ++state.revision }); await flush()
scheduler.blur(); await flush()
assert.equal(fieldControl('Steps', 'input').value, '10', 'stale server echo cannot lose the local steps')
assert.equal(fieldControl('CFG / Guidance', 'input').value, '1')
state.config.imageParameters = parameterPatch
receive({ ...state, revision: ++state.revision }); await flush()
assert.equal(fieldControl('Sampler', 'select').value, 'euler', 'acknowledged parameters survive panel reconstruction')
assert.equal(fieldControl('Scheduler', 'select').value, 'normal')
for (const [label, value, key, expected] of [['CFG / Guidance','0','cfg',0], ['CFG / Guidance','31','cfg',30], ['Steps','0','steps',1], ['Steps','151','steps',150]]) {
  const control = fieldControl(label, 'input')
  control.focus(); control.value = value; control.dispatchEvent(new Event('change', { bubbles: true }))
  const parameters = sent.filter(message => message.type === 'set_config').at(-1).patch.imageParameters
  assert.equal(parameters[key], expected, `${label} must accept zero when valid and clamp numeric boundaries`)
}
document.activeElement.blur(); await flush()
button('Illustrations').click(); await flush()

// Story Model requests live in the slot lifecycle, not the Relay-only planner
// record map. A cold archived completion must count once without enabling
// cleanup for an unrelated chat or counting pending/failed work as generated.
const slot = (key, status = 'completed', chatId = 'chat', target = 'prose.illustration') => ({
  key, chatId, target, status, messageId: 'message', requestId: key, slot: key, swipeId: 0,
  imageUrl: status === 'completed' ? `/images/${key}.png` : undefined,
  originalSceneBrief: '', originalRequestXml: '', originalNegativePrompt: '', alt: '', count: 1,
  createdAt: 1, updatedAt: 2, history: [],
})
state.records = [slot('story'), slot('relay'), slot('pending', 'queued'), slot('failed', 'failed'), slot('surface', 'completed', 'chat', 'instagram.photo'), slot('foreign', 'completed', 'other')]
state.proseIllustrator = { plans: { relay: { planId: 'relay', chatId: 'chat' } }, records: { relay: { planId: 'relay', slotKey: 'relay', createdAt: 1 } } }
state.renderCatalogFingerprint = 'catalog-1'
receive({ ...state, revision: ++state.revision }); await flush()
assert([...drawer.querySelectorAll('.dg-status-chips')].some(element => element.textContent.includes('2 generated')), 'Story Model and Relay completions count exactly once')
assert(drawer.textContent.includes('4 illustrations currently tracked'), 'cleanup counts the current chat illustration slots, not only Relay plans')
assert(!button('Remove Chat Illustrations…').disabled, 'Story Model slots must enable their existing cleanup control')
receive({ type: 'render_records', chatId: 'chat', fingerprint: 'catalog-1', cursor: 0, nextCursor: null, records: [slot('old'), slot('story'), slot('foreign-old', 'completed', 'other')] }); await flush()
assert([...drawer.querySelectorAll('.dg-status-chips')].some(element => element.textContent.includes('3 generated')), 'cold archive updates the count without double-counting the hot copy')
assert(drawer.textContent.includes('4 illustrations currently tracked'), 'archive display must not expand the existing hot-state cleanup scope')
assert(!sent.some(message => /generate|dispatch|bulk_chat_media_action/.test(message.type)), 'displaying counts starts no generation or cleanup')

// Native UI edits must reach the backend-owned Relay planner, including a
// second generation inside the normal one-second snapshot cache interval.
let nativePreset = 'base'
let nativeReads = 0
globalThis.fetch = async (url) => String(url).endsWith('/settings/imageGeneration')
  ? { ok: true, json: async () => { nativeReads++; return { value: { activeLoraPresetId: nativePreset, parameters: { steps: 4, cfgScale: 1 } } } } }
  : { ok: false, status: 404, json: async () => ({}) }
hostEvents.get('GENERATION_STARTED')({ chatId: 'other', generationId: 'foreign' }); await flush()
assert.equal(nativeReads, 0, 'another chat must not refresh this frontend snapshot')
for (const preset of ['base', 'gpt-v4']) {
  nativePreset = preset
  hostEvents.get('GENERATION_STARTED')({ chatId: 'chat', generationId: preset }); await flush(); await flush()
  const snapshot = sent.filter(message => message.type === 'sync_native_settings').at(-1)
  assert.equal(snapshot?.imageGeneration.activeLoraPresetId, preset, 'each generation must refresh the native preset before automatic planning')
  assert.equal(snapshot?.imageGeneration.parameters.steps, 4)
}
assert.equal(nativeReads, 2, 'generation refresh must bypass the ordinary snapshot TTL')

// Everyday illustration options must be discoverable without opening a
// disclosure. Moving controls must retain their existing saved keys and the
// optimistic write protection, and navigation must never generate an image.
button('Illustrations').click(); await flush()
for (const label of ['Sightline Guard', 'Quickweave', 'Portrait Insight', 'Opening Frame']) {
  const control = [...drawer.querySelectorAll('label.dg-toggle')].find(el => el.querySelector('.dg-toggle-title')?.textContent === label)
  assert(control && !control.closest('details'), `${label} must be visible outside Advanced`)
}
const controlsTab = button('Image Controls')
assert(controlsTab, 'Illustrations needs a separate Image Controls tab')
controlsTab.click(); await flush()
const cap = appearanceControl('Total Image Limit per Message', 'input')
const context = appearanceControl('Legacy Planner Context Messages', 'input')
assert(cap && context && !cap.closest('details') && !context.closest('details'), 'count/context controls must be visible in their own tab')
assert.match(drawer.textContent, /Continue appends to the same message/)
assert.match(drawer.textContent, /current Relay Director uses the selected response and latest user scene context instead/)
context.value = '2'; context.dispatchEvent(new Event('change', { bubbles: true })); await flush()
let movedPatch = sent.filter(message => message.type === 'set_config').at(-1).patch.proseIllustratorSettings
assert.equal(movedPatch.contextMessageCount, 2, 'renamed context control must retain its saved key')
state.config.proseIllustratorSettings = {...state.config.proseIllustratorSettings,...movedPatch}
receive({ ...state, revision: ++state.revision }); await flush()
for (const [label, key] of [['Reuse Reference Images', 'reuseAcceptedReferences'], ['Reuse Location References', 'reuseLocationReferences'], ['Show Image Captions', 'showCaptions'], ['Ignore Debug/Test Messages', 'skipTestFixtures']]) {
  const control = [...drawer.querySelectorAll('label.dg-toggle')].find(el => el.querySelector('.dg-toggle-title')?.textContent === label)
  assert(control?.querySelector('.dg-toggle-description')?.textContent, `${label} needs visible help`)
  const input = control.querySelector('input')
  input.checked = false; input.dispatchEvent(new Event('input', { bubbles: true })); await flush()
  movedPatch = sent.filter(message => message.type === 'set_config').at(-1).patch.proseIllustratorSettings
  assert.equal(movedPatch[key], false, `${label} must save the existing setting`)
  receive({ ...state, revision: ++state.revision }); await flush()
  const staleInput = [...drawer.querySelectorAll('label.dg-toggle')].find(el => el.querySelector('.dg-toggle-title')?.textContent === label)?.querySelector('input')
  assert.equal(staleInput.checked, false, 'stale backend echo must not undo a moved setting')
  state.config.proseIllustratorSettings = {...state.config.proseIllustratorSettings,...movedPatch}
  receive({ ...state, revision: ++state.revision }); await flush()
}
state.config.lastActiveDrawerTab = 'illustration-controls'
assert(!sent.some(message => /generate|dispatch|bulk_chat_media_action/.test(message.type)), 'settings navigation and edits must not generate or remove images')
cleanup()
state.config.appearanceUpdateIntervalMessages = 0
const reloadCleanup = setup(ctx)
receive({ ...state, revision: ++state.revision }); await flush()
button('Illustrations').click(); await flush()
button('Image Controls').click(); await flush()
assert.equal(appearanceControl('Legacy Planner Context Messages', 'input')?.value, '2', 'Image Controls values must hydrate on reload')
for (const label of ['Reuse Reference Images', 'Reuse Location References', 'Show Image Captions', 'Ignore Debug/Test Messages']) {
  assert.equal([...drawer.querySelectorAll('label.dg-toggle')].find(el => el.querySelector('.dg-toggle-title')?.textContent === label)?.querySelector('input')?.checked, false, `${label} must survive reload`)
}
button('Illustrations').click(); await flush()
assert.equal(appearanceControl('Automatic Appearance Updates', 'select').value, 'never', 'A fresh frontend must hydrate the saved schedule')
for(const label of ['Sightline Guard','Quickweave','Portrait Insight','Opening Frame']) assert([...drawer.querySelectorAll('label.dg-toggle')].find(el=>el.querySelector('.dg-toggle-title')?.textContent===label)?.querySelector('input')?.checked, `${label} survives frontend reload`)
reloadCleanup(); dom.window.close()
console.log(`Illustrator mounted settings passed: ${cases} workflow/framing/format combinations, Appearance cadence saves/navigation/reload, focused Relay parameter merges, stale echoes, acknowledgements and Story Model/archive counts; zero generation commands.`)
