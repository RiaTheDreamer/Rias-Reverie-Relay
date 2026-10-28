// @ts-nocheck -- real backend callbacks with an in-memory host; never a provider.
import assert from 'node:assert/strict'
import {AMAZON_SAMPLE} from '../src/amazonDefinition'
import {phoneCoreRecords} from '../src/phoneCoreApps'
import {checkoutSummary} from '../src/amazon-phone-state.mjs'
import {parseAmazon} from '../src/amazon-contract.mjs'
import {phoneArchivePath} from '../src/phoneArchive'
const stored=new Map(),output=[],events=new Map(),warnings=[]
let interceptor,frontendHandler,providerCalls=0
const userId='amazon-backend-user',chatId='amazon-backend-chat',ownerId='persona:test-persona'
const history=[{id:'catalog-source',role:'assistant',is_user:false,content:AMAZON_SAMPLE,extra:{}}]
const key=(path,options)=>`${options?.userId||'default'}:${path}`
const storage={async getJson(path,options={}){return structuredClone(stored.get(key(path,options))??options.fallback)},async setJson(path,value,options={}){stored.set(key(path,options),structuredClone(value))},async mkdir(){}}
const forbid=()=>{providerCalls++;throw Error('No provider permitted in this test')}
globalThis.spindle={registerInterceptor(fn){interceptor=fn;return()=>{}},registerMessageContentProcessor(){return()=>{}},registerMacro(){},on(name,fn){events.set(name,fn)},registerTool(){throw Error('XML transport only')},unregisterTool(){},onFrontendMessage(fn){frontendHandler=fn},sendToFrontend(value,userId){output.push({...value,userId})},permissions:{has:()=>true,onChanged:()=>()=>{}},log:{info(){},warn(value){warnings.push(value)},error(value){warnings.push(value)}},userStorage:storage,storage,
chats:{async get(id){return{id,character_id:'test-char',metadata:{active_persona_id:'test-persona'}}}},characters:{async get(){return{id:'test-char',name:'Test Character'}}},personas:{async get(){return{id:'test-persona',name:'Test Persona'}},async getActive(){return null}},chat:{async getMessages(){return structuredClone(history)},updateMessage:forbid},connections:{async list(){return[]}},imageGen:{async listConnections(){return[]},generate:forbid},generate:{raw:forbid},variables:{global:{async set(){}},chat:{async set(){}}},world_books:{async getActivated(){return[]},entries:{async get(){return null}}}}
const backend=await import('../src/backend')
await backend.setConfig({enabled:true,phoneEnabled:true,autoGenerate:false,appearanceSidecarEnabled:false,surfaceUtilityInjectionEnabled:false,narrativeDlcEnabled:false,storyConstellationsEnabled:false,proseIllustratorSettings:{enabled:false,mode:'off'}},userId)
await backend.setConfig({enabled:true,phoneEnabled:true,autoGenerate:false,appearanceSidecarEnabled:false,surfaceUtilityInjectionEnabled:false,narrativeDlcEnabled:false,storyConstellationsEnabled:false,proseIllustratorSettings:{enabled:false,mode:'off'}},'another-user')
async function waitFor(check){for(let tick=0;tick<300;tick++){if(await check())return;await new Promise(resolve=>setTimeout(resolve,0))}throw Error('Backend did not finish')}
async function command(action,patch={},user=userId,chat=chatId){const operationId=crypto.randomUUID();frontendHandler({type:'reverie_phone_command',chatId:chat,action,operationId,...patch},user);try{await waitFor(()=>output.some(row=>row.operationId===operationId))}catch(error){throw Error(`${action} ${chat} ${user}: ${String(error)}; ${JSON.stringify(output.slice(-2).map(row=>({type:row.type,error:row.error,operationId:row.operationId})))}; ${warnings.join('\n')}`)}return output.find(row=>row.operationId===operationId)}
const record=phoneCoreRecords(AMAZON_SAMPLE,'catalog-source',0).find(row=>row.appId==='amazon')
const load=await command('load');assert(!load.error,load.error)
const app=await command('app',{appId:'amazon',recordId:record.id,from:ownerId});assert.equal(app.type,'phone_app');assert(app.amazon.scopeKey);assert(app.html.includes('rr-amazon'))
const commerce=(action,patch={})=>command('commerce',{appId:'amazon',recordId:record.id,from:ownerId,commerceScope:app.amazon.scopeKey,commerceAction:action,...patch})
await command('settings',{contextMode:'manual'})
assert(!(await commerce('cart-add',{productId:'sage-headphones',quantity:2})).error)
assert(!(await commerce('wishlist-add',{productId:'sage-headphones'})).error)
const archive=()=>storage.getJson(phoneArchivePath(chatId),{userId})
let state=await archive();assert.equal(state.commerce[0].cart[0].quantity,2)
const confirmation=checkoutSummary(state.commerce[0],parseAmazon(AMAZON_SAMPLE))
const wrong=await commerce('purchase',{confirmation:{...confirmation,total:1}});assert(wrong.error);assert.equal((await archive()).commerce[0].orders.length,0)
assert(!(await commerce('purchase',{confirmation})).error);state=await archive();assert.equal(state.commerce[0].orders.length,1);assert.equal(state.commerce[0].orders[0].total,9980)
assert(!(await commerce('inject')).error)
const prompt=async(generationId,patch={})=>{const result=await interceptor([{role:'system',content:'{{reverie_phone}}'},{role:'user',content:'Continue.'}],{chatId,userId,generationId,...patch});return(Array.isArray(result)?result:result.messages).map(row=>row.content).join('\n')}
const before=JSON.stringify(await archive()),dry=await prompt('preview',{isDryRun:true});assert(dry.includes('<reverie_commerce_context>'));assert(dry.includes('€99.80'));assert.equal(JSON.stringify(await archive()),before,'real preview cannot consume receipts')
for(const outcome of ['error','stopped','wrong-text','uncommitted']){
  await prompt(outcome);const saved={id:'story-'+outcome,role:'assistant',is_user:false,content:'Saved reply.',extra:outcome==='uncommitted'?{promptActivation:{complete:false}}:{}};history.push(saved)
  if(outcome==='stopped')events.get('GENERATION_STOPPED')({chatId,generationId:outcome},userId)
  events.get('GENERATION_ENDED')({chatId,generationId:outcome,messageId:saved.id,content:outcome==='wrong-text'?'Different reply.':saved.content,...(outcome==='error'?{error:'Fixture failure'}:{})},userId)
  await new Promise(resolve=>setTimeout(resolve,25));assert.equal((await archive()).commerce[0].events.filter(event=>event.consumedBy).length,0,outcome+' must preserve pending shopping actions')
}
const otherOwner=await command('app',{appId:'amazon',recordId:record.id,from:'character:test-char'});assert.notEqual(otherOwner.amazon.scopeKey,app.amazon.scopeKey)
const isolated=await command('load',{},userId,'another-chat');assert.equal(isolated.state.commerce?.length||0,0)
const otherUser=await command('load',{},'another-user');assert.equal(otherUser.state.commerce?.length||0,0)
await prompt('committed');history.push({id:'committed-story',role:'assistant',is_user:false,content:'The order is placed, not delivered.',extra:{promptActivation:{complete:true}}})
const terminal={chatId,generationId:'committed',messageId:'committed-story',content:'The order is placed, not delivered.'}
events.get('GENERATION_ENDED')(terminal,userId);await waitFor(async()=>!(await archive()).commerceRequest)
state=await archive();assert.equal(state.commerce[0].events.filter(event=>event.consumedBy==='committed').length,3);assert.equal(state.commerce[0].orders.length,1)
events.get('GENERATION_ENDED')(terminal,userId);await new Promise(resolve=>setTimeout(resolve,25));assert.equal((await archive()).commerce[0].orders.length,1)
const afterPrompt=await prompt('after-success',{isDryRun:true});assert(!afterPrompt.includes('<commerce_event>'),'successful saved generation acknowledges exactly once; the Utility may still describe the context tag')
assert.equal(providerCalls,0);assert(!warnings.some(value=>String(value).includes('Continuity unavailable')||String(value).includes('Amazon receipts remain queued')),warnings.join('\n'))
console.log('PASS real Amazon backend: native app projection, durable commands, exact checkout, owner/user/chat isolation, real interceptor Dry Run, failed/stopped/uncommitted guards, saved-generation acknowledgement and duplicate terminal. Zero provider calls.')
