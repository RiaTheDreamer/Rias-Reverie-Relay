// @ts-nocheck -- mounted production controls; no real host or provider calls.
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<body></body>', { pretendToBeVisual: true })
const win = dom.window
for (const name of ['window','document','HTMLElement','HTMLButtonElement','HTMLImageElement','HTMLInputElement','HTMLSelectElement','HTMLTextAreaElement','HTMLStyleElement','Element','ShadowRoot','Node','MutationObserver','Event','CustomEvent','getComputedStyle']) globalThis[name] = name === 'window' ? win : name === 'document' ? win.document : win[name]
win.matchMedia = () => ({ matches:false,addEventListener(){},removeEventListener(){} })
win.setInterval = () => 0; win.clearInterval = () => {}
globalThis.requestAnimationFrame = callback => win.requestAnimationFrame(callback)
globalThis.cancelAnimationFrame = id => win.cancelAnimationFrame(id)
globalThis.fetch = async () => ({ok:false,status:404,json:async()=>({})})
globalThis.spindle = {on(){},onFrontendMessage(){},registerInterceptor(){},registerMacro(){},registerMessageContentProcessor(){},sendToFrontend(){},permissions:{has:()=>true},log:{info(){},warn(){},error(){}},toast:{info(){},success(){},warning(){},error(){}}}
const { normalizeProseIllustratorSettings } = await import('../src/backend')
const { setup } = await import('../src/frontend')
const drawer = document.createElement('div'); document.body.append(drawer)
const requests = []
let backendHandler
const ctx = {
  dom:{addStyle:()=>()=>{},findMessageElement:()=>null,cleanup(){}},
  ui:{registerDrawerTab:()=>({root:drawer,setTitle(){},setShortName(){},setBadge(){},activate(){},onActivate:()=>()=>{},destroy(){}}),registerInputBarAction:()=>({setLabel(){},setSubtitle(){},setEnabled(){},onClick:()=>()=>{},destroy(){}})},
  events:{on:()=>()=>{},emit(){}},display:{invalidate(){}},
  messages:{registerTagInterceptor:()=>()=>{},getRecent:()=>[]},
  getActiveChat:()=>({chatId:'count-ui-chat',characterId:'character'}),
  sendToBackend:request=>requests.push(request),onBackendMessage:handler=>{backendHandler=handler;return()=>{}}
}
const cleanup = setup(ctx)
const state = {type:'state',chatId:'count-ui-chat',revision:1,records:[],config:{enabled:true,phoneEnabled:false,enableRelayOrb:false,autoRescanOnChatOpen:false},parserConnections:[{id:'director',name:'Test Director',model:'test',provider:'mock'}],imageConnections:[],imageProviders:[],logs:[],candidateBatches:[],galleryLinks:[],versionTrees:[]}
const button = text => [...drawer.querySelectorAll('button')].find(node=>node.textContent.trim()===text)
for (const modelPlacedCountMode of ['fixed','range']) {
  const settings = normalizeProseIllustratorSettings({mode:'relay-planned',plannerConnectionId:'director',modelPlacedCountMode,illustrationsPerRun:7,minimumImages:2,maximumImages:3})
  backendHandler({...state,revision:++state.revision,config:{...state.config,proseIllustratorSettings:settings}})
  const tab = [...drawer.querySelectorAll('button')].find(node=>node.textContent.replace(/\s/g,'').endsWith('Illustrations'))
  assert(tab); tab.click()
  assert(drawer.textContent.includes(modelPlacedCountMode==='range'?'2–3 per response':'7 per response'))
  assert(drawer.textContent.includes(modelPlacedCountMode==='range'?'2–3 (inclusive)':'exactly 7'))
  button('Image Controls').click()
  const savedMessageLimit = [...drawer.querySelectorAll('.dg-field')].find(node=>node.textContent.startsWith('Total Image Limit per Message'))?.querySelector('input')
  assert(savedMessageLimit)
  assert.equal(savedMessageLimit.min,modelPlacedCountMode==='range'?'3':'7','the inactive fixed count cannot raise the active range control minimum')
  button('Illustrations').click()
  const control = button('Plan Latest Once')
  assert(control && !control.disabled, 'configured manual batch planning must be accessible')
  requests.length = 0
  control.click()
  assert.deepEqual(requests.filter(request=>request.type==='prose_illustrator_action').map(({requestId, ...request})=>request),[{type:'prose_illustrator_action',chatId:'count-ui-chat',action:'relay_plan_once'}], 'manual planning must use the same count-aware batch path, not legacy plan_latest')
  const requestId = requests.find(request=>request.type==='prose_illustrator_action').requestId
  assert(requestId, 'manual clicks need a correlated acknowledgement')
  backendHandler({type:'prose_action_feedback',chatId:'count-ui-chat',requestId,status:'completed'})
}
cleanup(); dom.window.close()
console.log('Relay-Planned mounted count UI passed: fixed/range overview and manual batch dispatch action; no provider calls.')
