// @ts-nocheck -- production backend in an isolated, provider-free host.
import assert from 'node:assert/strict'
import {PHONE_CORE_APPS} from '../src/phoneCoreApps'
import {shippedSurfaceDefinitions} from '../src/shippedSurfaceDefinitions'
import {r45SupplementalSurfaceDefinitions} from '../src/r45SurfaceCatalog'
let receive,history=[]
const stored=new Map(),output=[]
const storage={async getJson(path,options={}){return structuredClone(stored.get(`${options.userId}:${path}`)??options.fallback)},async setJson(path,value,options={}){stored.set(`${options.userId}:${path}`,structuredClone(value))},async mkdir(){}}
globalThis.spindle={registerInterceptor(){},registerMessageContentProcessor(){},registerMacro(){},on(){},registerTool(){throw Error('XML only')},unregisterTool(){},onFrontendMessage(fn){receive=fn},sendToFrontend(value,userId){output.push({...value,userId})},permissions:{has:()=>true,onChanged:()=>()=>{}},log:{info(){},warn(){},error(){}},userStorage:storage,storage,
 chats:{async get(id){return{id,character_id:'actor',metadata:{active_persona_id:'reader'}}}},characters:{async get(id){return{id,name:'Actor',description:'An adult test character'}}},personas:{async get(){return{id:'reader',name:'Reader'}},async getActive(){return null}},chat:{async getMessages(){return structuredClone(history)}},connections:{async list(){return[]}},imageGen:{async listConnections(){return[]}},generate:{async raw(){throw Error('Opening or syncing apps must never start a model')}},variables:{global:{async set(){}},chat:{async set(){}}},world_books:{async getActivated(){return[]},entries:{async get(){return null}}}}
const backend=await import('../src/backend')
await backend.setConfig({autoGenerate:false,surfaceUtilityInjectionEnabled:false},'sync-user')
async function command(action,patch={}){
 const operationId=crypto.randomUUID();receive({type:'reverie_phone_command',action,chatId:'sync-chat',operationId,...patch},'sync-user')
 for(let tick=0;tick<300&&!output.some(row=>row.operationId===operationId);tick++)await Bun.sleep(5)
 const result=output.find(row=>row.operationId===operationId);assert(result&&!result.error,`${action} ${patch.appId||''}: ${result?.error||'No response'}`);return result
}
const definitions=[...shippedSurfaceDefinitions(1),...r45SupplementalSurfaceDefinitions(1)]
history=[{id:'all-core',role:'assistant',content:PHONE_CORE_APPS.map(app=>definitions.find(def=>def.baseSurfaceId===app.id).sampleXml.replace(/owner="[^"]*"/g,'owner="Reader"')).join('\n'),swipe_id:0}]
const all=await command('load')
assert.deepEqual(new Set(all.appRecords.map(record=>record.appId)),new Set(PHONE_CORE_APPS.map(app=>app.id)),'All 48 story Core Surfaces are projected into phone apps')
for(const record of all.appRecords){
 const view=await command('app',{appId:record.appId,recordId:record.id,from:'persona:reader'})
 assert.equal(view.type,'phone_app',record.appId);assert(view.html?.length>100,`${record.appId} returns its real renderer`)
 assert(!view.html.includes('data-rrn-surface-recovery='),`${record.appId} must render, not return a format error`)
}
const forum=definitions.find(def=>def.baseSurfaceId==='forum-thread').sampleXml
history=[{id:'old-forum',role:'assistant',content:forum,swipe_id:0},...Array.from({length:130},(_,i)=>({id:`prose-${i}`,role:'assistant',content:'An ordinary story paragraph.',swipe_id:0}))]
assert((await command('load')).appRecords.some(record=>record.messageId==='old-forum'),'A story Reddit thread must not disappear after 100 later messages')
history=Array.from({length:310},(_,i)=>({id:`forum-${i}`,role:'assistant',content:forum,swipe_id:0,created_at:1800000000+i}))
const longLibrary=await command('load')
assert.equal(longLibrary.appRecords.length,310,'The phone must not silently discard records beyond 300')
assert.equal(longLibrary.appRecords[0].createdAt,1800000000000,'Host seconds are normalized to phone milliseconds')
history=[{id:'edited-forum',role:'assistant',content:forum,swipes:['An obsolete prose-only swipe cache.'],swipe_id:0}]
const edited=await command('load')
assert(edited.appRecords.some(record=>record.messageId==='edited-forum'),'The active saved content wins over a stale swipe cache')
assert(edited.identities.some(person=>person.kind==='npc'),'App authors also come from the active source, allowing exact reply targeting')
history=[{id:'swiped',role:'assistant',content:forum,swipes:['An obsolete swipe.',forum],swipe_id:1}]
assert((await command('load')).appRecords.every(record=>record.swipeId===1),'Only the selected story swipe syncs')
history=[{id:'deleted-forum',role:'assistant',content:'The Surface was removed by its author.',swipes:[forum],swipe_id:0}]
assert.equal((await command('load')).appRecords.length,0,'An edited-out Surface must not return from its old swipe copy')
history=[{id:'narrative',role:'assistant',content:'<Plot_Sparks><ID>one</ID><Spark><Key>a</Key><Text>A possibility.</Text></Spark></Plot_Sparks><parallel_scene><title>Elsewhere</title><body>A separate scene.</body></parallel_scene>',swipe_id:0}]
assert.equal((await command('load')).appRecords.length,0,'Narrative Surfaces stay out of phone apps')
history=[{id:'unfinished',role:'assistant',content:forum,swipe_id:0,extra:{promptActivationBySwipe:[{complete:false}]}}]
assert.equal((await command('load')).appRecords.length,0,'An unfinished or failed story remains excluded')
console.log('Story phone sync passed: 48 real app views, full history, authoritative edits, Narrative exclusion and commit guard; zero model calls')
