// @ts-nocheck -- real backend with user-scoped host storage; no provider calls.
import assert from 'node:assert/strict'
import {normalizePhonePreferences,applyPhonePreferences} from '../src/phonePreferences'
import {emptyPhoneDevice} from '../src/phoneDevice'
let frontendHandler,interceptor;const stored=new Map(),output=[]
const key=(path,options)=>`${options?.userId||'default'}:${path}`
const storage={async getJson(path,options={}){return structuredClone(stored.get(key(path,options))??options.fallback)},async setJson(path,value,options={}){stored.set(key(path,options),structuredClone(value))},async mkdir(){}}
globalThis.spindle={registerInterceptor(fn){interceptor=fn;return()=>{}},registerMessageContentProcessor(){return()=>{}},registerMacro(){},on(){},registerTool(){throw Error('XML only')},unregisterTool(){},onFrontendMessage(fn){frontendHandler=fn},sendToFrontend(value,userId){output.push({...value,userId})},permissions:{has:()=>true,onChanged:()=>()=>{}},log:{info(){},warn(){},error(){}},userStorage:storage,storage,
chats:{async get(id){return{id,character_id:'test-char',metadata:{active_persona_id:'test-persona'}}}},characters:{async get(){return{id:'test-char',name:'Test Character'}}},personas:{async get(){return{id:'test-persona',name:'Test Persona'}},async getActive(){return null}},chat:{async getMessages(){return []}},connections:{async list(){return[{id:'connection-a',name:'A',model:'test'},{id:'connection-b',name:'B',model:'test'}]}},imageGen:{async listConnections(){return []}},generate:{async raw(){throw Error('No generation permitted')}},variables:{global:{async set(){}},chat:{async set(){}}},world_books:{async getActivated(){return []},entries:{async get(){return null}}}}
const backend=await import('../src/backend')
for(const user of ['user-a','user-b'])await backend.setConfig({autoGenerate:false,surfaceUtilityInjectionEnabled:false},user)
async function command(chatId,action,patch={},userId='user-a'){
  const operationId=crypto.randomUUID();frontendHandler({type:'reverie_phone_command',chatId,action,operationId,...patch},userId)
  for(let tick=0;tick<100&&!output.some(row=>row.operationId===operationId);tick++)await new Promise(resolve=>setTimeout(resolve,0))
  const result=output.find(row=>row.operationId===operationId);assert(result,'backend command must finish');assert(!result.error,result.error);return result.state
}
const preferences={connectionId:'connection-a',autoReply:false,contextMode:'manual',incoming:{frequency:'every-n',everyN:7,maxNotifications:2}}
await command('settings-old-chat','settings',{...preferences,sharedScene:'PRIVATE SCENE A'})
const fresh=await command('settings-new-chat','load')
for(const [field,value] of Object.entries(preferences))assert.deepEqual(fresh[field],value,`${field} is shared with new chats`)
assert.equal(fresh.sharedScene,'');assert.equal(fresh.messages.length,0,'new chats cannot inherit another inbox')
assert.equal((await command('settings-new-chat','load',{},'user-b')).connectionId,null,'different users cannot inherit a connection')
await command('settings-new-chat','settings',{connectionId:'connection-b',sharedScene:'PRIVATE SCENE B'})
const old=await command('settings-old-chat','load');assert.equal(old.connectionId,'connection-b','existing chats must not override shared preferences with old local settings')
assert.equal(old.sharedScene,'PRIVATE SCENE A');assert.deepEqual(old.incoming,preferences.incoming,'partial saves retain other preferences')
assert.equal(old.autoReply,false);assert.equal(old.contextMode,'manual')
await backend.setConfig({phoneEnabled:false},'user-a')
assert.equal((await command('settings-disabled','load')).connectionId,'connection-b','disabled settings still show the global selection')
await backend.setConfig({phoneEnabled:true},'user-a')
const prompt=await interceptor([{role:'user',content:'A normal reply.'}],{chatId:'settings-new-chat',userId:'user-a',isDryRun:true})
assert((Array.isArray(prompt)?prompt:prompt.messages).map(row=>row.content).join('\n').includes('frequency="every-n" interval="7" max_notifications="2"'),'actual injection reads global frequency settings')
assert.deepEqual((await backend.getConfig('user-a')).phonePreferences,{...preferences,connectionId:'connection-b'},'config normalization preserves saved phone preferences')
assert([...stored.entries()].some(([path,row])=>path.startsWith('user-a:')&&row.phonePreferences?.connectionId==='connection-b'),'global preferences reach durable user storage')
await Promise.all([command('settings-old-chat','settings',{autoReply:true}),command('settings-new-chat','settings',{contextMode:'automatic'})])
const concurrent=await command('settings-third-chat','load');assert.equal(concurrent.autoReply,true);assert.equal(concurrent.contextMode,'automatic');assert.equal(concurrent.connectionId,'connection-b','concurrent disjoint preference saves merge without lost fields')
assert.throws(()=>normalizePhonePreferences({contextMode:'invalid'}))
assert.throws(()=>normalizePhonePreferences('damaged'))
await command('settings-third-chat','settings',{connectionId:null})
assert.equal((await command('settings-old-chat','load')).connectionId,null,'explicitly clearing a shared connection must not revive an old per-chat connection')
const local=emptyPhoneDevice();local.sharedScene='PRIVATE';assert.equal(applyPhonePreferences(local,normalizePhonePreferences(preferences)).sharedScene,'PRIVATE')
await command('settings-preview-chat','settings',{autoReply:false,contextMode:'manual'})
const actors=(await backend.getConfig('user-a')).phonePreferences
assert.equal(actors.contextMode,'manual')
await command('settings-preview-chat','send',{from:'persona:test-persona',to:'character:test-char',text:'Remember the blue folder.'})
const queued=await command('settings-preview-chat','continue')
assert(queued.contextRequest?.id)
const preview=await interceptor([{role:'user',content:'Preview only.'}],{chatId:'settings-preview-chat',userId:'user-a',dryRun:true})
assert((Array.isArray(preview)?preview:preview.messages).some(row=>row.content.includes('Remember the blue folder.')))
assert.equal((await command('settings-preview-chat','load')).contextRequest?.id,queued.contextRequest.id,'host prompt previews preserve queued manual context')
await interceptor([{role:'user',content:'A real story generation.'}],{chatId:'settings-preview-chat',userId:'user-a',dryRun:false})
assert.equal((await command('settings-preview-chat','load')).contextRequest,undefined,'real generation consumes queued manual context once')
console.log('PASS phone preferences: real backend cross-chat connection and cadence, partial/concurrent saves, user isolation, private scenes, durable config, global prompt injection')
