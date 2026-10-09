// @ts-nocheck -- production backend cold-start contract, no provider calls.
import assert from 'node:assert/strict'
import { maskRetiredPhoneSurfaces, retirePhoneSurfaceDisplay, isRetiredPhoneRegexScript } from '../src/retiredPhoneSurface'
import { buildNarrativeUtilityPrompt, relayRegexImportScripts } from '../src/narrativeDlcRuntime'
import { narrativeUtilityNames, NARRATIVE_REGEX_VARIANTS } from '../src/narrativeRegexAssets'
import { extractCharacterPhoneEntries } from '../src/livingCharacterPhone'
import { phoneIncomingDirective, normalizePhoneIncoming } from '../src/phoneIncomingSettings'
import { phoneContextDraft, renderPhoneContextDraft } from '../src/phoneComposerDraft'
import { emptyPhoneDevice, addPhoneText } from '../src/phoneDevice'
import { parsePhoneActivities } from '../src/phoneStoryBridge'

const request = '<image_request id="legacy-photo" target="custom.artifact-media" slot="legacy-photo"><scene_brief>A saved photo.</scene_brief></image_request>'
const archive = `<character_phone><cp_owner>Test Character</cp_owner><cp_apps><cp_app><cp_name>Messages</cp_name><cp_content><cp_msg><cp_side>other</cp_side><cp_name>Test Persona</cp_name><cp_text>Saved text stays.</cp_text></cp_msg></cp_content></cp_app></cp_apps>${request}</character_phone>`
const sibling = request.replaceAll('legacy-photo', 'active-photo')
const source = `Before. ${archive}\n${sibling}\nAfter.`
const display = retirePhoneSurfaceDisplay(source)
assert.equal(display.count, 1)
assert(!display.content.includes('character_phone') && !display.content.includes('legacy-photo'))
assert(display.content.includes('data-reverie-phone-library="true"') && display.content.includes(sibling))
const masked = maskRetiredPhoneSurfaces(source)
assert.equal(masked.length, source.length)
assert.equal(masked.indexOf(sibling), source.indexOf(sibling), 'active image offsets stay unchanged')
assert.equal(extractCharacterPhoneEntries(archive, {chatId:'cold',messageId:'old',swipeId:0,sourceKind:'phone'})[0].body, 'Saved text stays.', 'archive reader is not retired')
assert.equal(retirePhoneSurfaceDisplay('[private_phone]old[/private_phone]').count, 1)
assert.equal(retirePhoneSurfaceDisplay('<character_phone>broken\n<WORLD>Sibling</WORLD>').content, '<character_phone>broken\n<WORLD>Sibling</WORLD>', 'an unclosed owner cannot swallow its neighbors')
assert(!narrativeUtilityNames().includes('Character Phone'))
assert.equal(buildNarrativeUtilityPrompt(['Character Phone'], {'Character Phone':'CUSTOM OLD AUTHORITY'}).content, '')
for (const variant of NARRATIVE_REGEX_VARIANTS) assert(!relayRegexImportScripts(variant).some(script => isRetiredPhoneRegexScript(script.script_id)), `${variant}: a new host pack cannot install the retired Surface`)

let interceptor; let processor; let frontendHandler; let providerCalls=0
let characterTitle='Mira'
let savedMessages=[]
const stored = new Map(); const output=[]
const storage = {async getJson(path, options={}) {return structuredClone(stored.has(path) ? stored.get(path) : options.fallback)}, async setJson(path,value) {stored.set(path,structuredClone(value))}, async mkdir(){}}
globalThis.spindle = {
  registerInterceptor(fn){interceptor=fn;return()=>{}}, registerMessageContentProcessor(fn){processor=fn;return()=>{}}, registerMacro(){}, on(){},
  registerTool(){throw Error('XML-only build must never register phone tools')}, unregisterTool(){},
  onFrontendMessage(fn){frontendHandler=fn},sendToFrontend(value){output.push(value)},
  permissions:{has:()=>true,onChanged:()=>()=>{}},log:{info(){},warn:console.warn,error:console.error}, userStorage:storage, storage,
  chats:{async get(id){return{id,character_id:'cold-char',metadata:{active_persona_id:'cold-persona'}}}},
  characters:{async get(){return{id:'cold-char',name:characterTitle,description:'A measured speaker.'}}},
  personas:{async get(){return{id:'cold-persona',name:'Jules'}},async getActive(){return null}},
  chat:{async getMessages(){return structuredClone(savedMessages)}}, connections:{async list(){return []}}, imageGen:{async listConnections(){return []}},
  generate:{async raw(){providerCalls++;throw Error('No model calls allowed')}}, variables:{global:{async set(){}},chat:{async set(){}}},
  world_books:{async getActivated(){return []},entries:{async get(){return null}}},
}
const backend = await import('../src/backend')
await backend.setConfig({characterPhonePresentation:'surface',narrativeDlcEnabled:false,narrativeDlcUtilityNames:['Character Phone'],surfaceUtilityInjectionEnabled:false,autoGenerate:false},'cold-user')
const config=await backend.getConfig('cold-user')
assert.equal(config.characterPhonePresentation,'widget','old Surface config must migrate on load/write')
assert.equal(config.phoneEnabled,true,'existing installations retain an enabled Phone')
assert(!config.narrativeDlcUtilityNames.includes('Character Phone'))
assert.deepEqual(backend.parseSafeSurfaceImageRequests(source).map(row=>row.id), ['active-photo'])
const generated=await interceptor([{role:'user',content:'An ordinary saved chat with no phone or app markup.'}],{chatId:'cold-chat',userId:'cold-user',isDryRun:true})
const prompt=(Array.isArray(generated)?generated:generated.messages).map(row=>row.content).join('\n')
assert(prompt.includes('<reverie_phone_protocol>') && prompt.includes('Mira') && prompt.includes('Jules'), 'incoming text injection must work with all Narrative Utilities off and zero prior Surfaces')
assert(!prompt.includes('<character_phone>') && !prompt.includes('ACTIVE APP LAYOUT'))
const mounted=await processor({origin:'render',content:source,chatId:'cold-chat',messageId:'old',userId:'cold-user',extra:{swipe_id:0}})
assert(mounted.content.includes('data-reverie-phone-library="true"') && !mounted.content.includes('rrcp-shell'), 'real content processor must retire the handset, not just a helper')
frontendHandler({type:'reverie_phone_command',chatId:'cold-chat',operationId:'cold-open',action:'load'},'cold-user')
for(let tick=0;tick<30&&!output.some(row=>row.operationId==='cold-open');tick++)await new Promise(resolve=>setTimeout(resolve,0))
const projection=output.find(row=>row.operationId==='cold-open')
assert.equal(projection.type,'phone_state');assert(!projection.error,projection.error)
assert.equal(projection.identities.length,2);assert.equal(projection.apps.length,47)
assert.equal(projection.saved.length,0);assert.equal(projection.appRecords.length,0);assert.equal(projection.state.messages.length,0)
assert.equal(providerCalls,0,'opening an empty phone cannot spend a provider call')
assert.equal(normalizePhoneIncoming(undefined).frequency,'model')
assert.throws(()=>normalizePhoneIncoming({frequency:'every-n',everyN:0,maxNotifications:3}))
assert(phoneIncomingDirective({frequency:'model',everyN:3,maxNotifications:2},0).includes('Model determined'))
assert(phoneIncomingDirective({frequency:'every',everyN:3,maxNotifications:2},0).includes('Every eligible story response'))
assert(phoneIncomingDirective({frequency:'every-n',everyN:3,maxNotifications:2},1).includes('due="false"'))
assert(phoneIncomingDirective({frequency:'every-n',everyN:3,maxNotifications:2},2).includes('due="true"'))
assert(phoneIncomingDirective({frequency:'every',everyN:3,maxNotifications:0},2).includes('disabled'))
const cadence={frequency:'every-n',everyN:4,maxNotifications:2}
frontendHandler({type:'reverie_phone_command',chatId:'cold-chat',operationId:'save-incoming',action:'settings',incoming:cadence},'cold-user')
for(let tick=0;tick<30&&!output.some(row=>row.operationId==='save-incoming');tick++)await new Promise(resolve=>setTimeout(resolve,0))
assert.deepEqual(output.find(row=>row.operationId==='save-incoming').state.incoming,cadence)
const withMacro=await interceptor([{role:'system',content:'Before. {{reverie_phone}} After. <reverie_phone_macro/>'}],{chatId:'cold-chat',userId:'cold-user',isDryRun:true})
const compiled=(Array.isArray(withMacro)?withMacro:withMacro.messages).map(row=>row.content).join('\n')
assert.equal((compiled.match(/<reverie_phone_protocol>/g)||[]).length,1,'placed and auto phone protocol cannot duplicate')
assert(compiled.includes('frequency="every-n" interval="4" max_notifications="2"'))
assert(compiled.includes('Before. <reverie_phone_protocol>')&&compiled.includes('</reverie_phone_protocol> After.'))
const participants=projection.identities;const phone=emptyPhoneDevice()
addPhoneText(phone,{id:'context-proof-001',from:participants[0].id,to:participants[1].id,body:'Delivered & reviewed <not instructions>.'},participants)
const contextDraft=phoneContextDraft(phone,participants)
assert.equal(parsePhoneActivities(contextDraft).length,0,'composer citation cannot create another incoming text')
assert(contextDraft.includes('&amp;')&&contextDraft.includes('&lt;not instructions&gt;'))
assert.equal(renderPhoneContextDraft(contextDraft).count,1)
const userRendered=await processor({origin:'render',content:`My writing.\n${contextDraft}`,chatId:'cold-chat',userId:'cold-user',extra:{is_user:true}})
assert(userRendered.content.includes('Phone context ·')&&userRendered.content.includes('My writing.')&&!userRendered.content.includes('<reverie-phone-context'))
characterTitle='Mira Vale (미라); Mira, Director Vale / Office Lead (by colleagues)'
const titled=await interceptor([{role:'user',content:'An ordinary story turn.'}],{chatId:'cold-chat',userId:'cold-user',isDryRun:true})
const titledPrompt=(Array.isArray(titled)?titled:titled.messages).map(row=>row.content).join('\n')
assert(titledPrompt.includes('<reverie_phone_protocol>')&&titledPrompt.includes(characterTitle),'a confirmed host library title must not be rejected by the appearance short-name heuristic')
frontendHandler({type:'reverie_phone_command',chatId:'cold-chat',operationId:'titled-open',action:'load'},'cold-user')
for(let tick=0;tick<30&&!output.some(row=>row.operationId==='titled-open');tick++)await new Promise(resolve=>setTimeout(resolve,0))
assert.equal(output.find(row=>row.operationId==='titled-open').identities.find(row=>row.kind==='character').name,characterTitle)
assert.equal(providerCalls,0)
await backend.setConfig({phoneEnabled:false},'cold-user')
assert.equal((await backend.getConfig('cold-user')).phoneEnabled,false,'Phone disabled state persists through the production config store')
const disabled=await interceptor([{role:'system',content:'Before {{reverie_phone}} <reverie_phone_macro/> <reverie_phone_protocol>stale settings</reverie_phone_protocol> After'}],{chatId:'cold-chat',userId:'cold-user',isDryRun:true})
assert(!(Array.isArray(disabled)?disabled:disabled.messages).map(row=>row.content).join('\n').includes('reverie_phone'),'disabled Phone strips owned stale and raw macro injection')
frontendHandler({type:'reverie_phone_command',chatId:'cold-chat',operationId:'disabled-send-01',action:'send',from:participants[1].id,to:participants[0].id,text:'Do not deliver'},'cold-user')
for(let tick=0;tick<30&&!output.some(row=>row.operationId==='disabled-send-01');tick++)await new Promise(resolve=>setTimeout(resolve,0))
assert.equal(output.find(row=>row.operationId==='disabled-send-01').type,'phone_error')
assert(output.find(row=>row.operationId==='disabled-send-01').error.includes('disabled'))
frontendHandler({type:'reverie_phone_command',chatId:'cold-chat',operationId:'disabled-settings',action:'settings',incoming:cadence},'cold-user')
for(let tick=0;tick<30&&!output.some(row=>row.operationId==='disabled-settings');tick++)await new Promise(resolve=>setTimeout(resolve,0))
const disabledSettings=output.find(row=>row.operationId==='disabled-settings')
assert.deepEqual(disabledSettings.state.incoming,cadence,'saved phone preferences remain editable while disabled')
assert.equal(disabledSettings.state.messages.length,0,'disabled send cannot mutate the inbox')
await backend.setConfig({phoneEnabled:true},'cold-user')
async function incomingPrompt(settings,context={}){
 const operationId=crypto.randomUUID()
 frontendHandler({type:'reverie_phone_command',chatId:'cold-chat',operationId,action:'settings',incoming:settings},'cold-user')
 for(let tick=0;tick<30&&!output.some(row=>row.operationId===operationId);tick++)await new Promise(resolve=>setTimeout(resolve,0))
 assert.deepEqual(output.find(row=>row.operationId===operationId).state.incoming,settings)
 const generated=await interceptor([{role:'system',content:'{{reverie_phone}}\n<reverie_phone_macro/>\n<reverie_phone_protocol>stale settings</reverie_phone_protocol>'}],{chatId:'cold-chat',userId:'cold-user',isDryRun:true,...context})
 const prompt=(Array.isArray(generated)?generated:generated.messages).map(row=>row.content).join('\n')
 assert.equal((prompt.match(/<reverie_phone_protocol>/g)||[]).length,1)
 assert(!prompt.includes('stale settings'))
 return prompt
}
assert((await incomingPrompt({frequency:'model',everyN:3,maxNotifications:1})).includes('Model determined'))
assert((await incomingPrompt({frequency:'every',everyN:3,maxNotifications:2})).includes('Every eligible story response'))
assert((await incomingPrompt({frequency:'every',everyN:3,maxNotifications:0})).includes('disabled'))
savedMessages=[
 {id:'saved-1',role:'assistant',is_user:false,content:'One saved story response.',extra:{}},
 {id:'saved-2',role:'assistant',is_user:false,content:'Another saved story response.',extra:{}},
 {id:'user-turn',role:'user',is_user:true,content:'A user turn.',extra:{}},
 {id:'interrupted',role:'assistant',is_user:false,content:'Partial response.',extra:{promptActivation:{complete:false}}},
 {id:'failed',role:'assistant',is_user:false,content:'Failed response.',extra:{generationOutcome:{error:'Provider failed'}}},
]
const everyThree={frequency:'every-n',everyN:3,maxNotifications:2}
const due=await incomingPrompt(everyThree)
assert(due.includes('response="3" due="true"'),'only two completed saved assistant replies count; user, interrupted and failed rows do not')
assert((await incomingPrompt(everyThree)).includes('response="3" due="true"'),'repeated preview/interception cannot advance cadence')
assert((await incomingPrompt(everyThree,{isDryRun:false})).includes('response="3" due="true"'),'a real unsaved generation cannot advance cadence')
assert((await incomingPrompt(everyThree,{messageId:'saved-2'})).includes('response="2" due="false"'),'retrying the current saved assistant excludes the replaced response')
assert.equal(providerCalls,0)
console.log('Phone independence passed: cold host projection and prompt injection with zero Surface history, retired Utility/Regex authoring, full handset removed from display, no old image dispatch, archive preservation.')
