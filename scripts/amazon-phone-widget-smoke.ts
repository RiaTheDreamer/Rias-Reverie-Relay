// @ts-nocheck -- mounted production handset, mocked bridge, zero providers.
import assert from 'node:assert/strict'
import {JSDOM} from 'jsdom'
import {mountPhoneWidget} from '../src/phoneWidget'
import {emptyPhoneDevice} from '../src/phoneDevice'
import {phoneCoreRecords,PHONE_CORE_APPS,renderPhoneCoreRecord} from '../src/phoneCoreApps'
import {AMAZON_SAMPLE} from '../src/amazonDefinition'
import {parseAmazon} from '../src/amazon-contract.mjs'
import {amazonState,mutateAmazon} from '../src/amazonCommerce'
import {commerceScopeKey} from '../src/amazon-phone-state.mjs'
const dom=new JSDOM('<body></body>',{url:'http://localhost/',pretendToBeVisual:true})
Object.assign(globalThis,{window:dom.window,document:dom.window.document})
const sent=[],handlers=[],widgets=[],events=new Map()
let chatId='amazon-widget-chat'
const context={getActiveChat:()=>({chatId}),sendToBackend:command=>sent.push(command),
  onBackendMessage:handler=>{handlers.push(handler);return()=>handlers.splice(handlers.indexOf(handler),1)},
  events:{on:(name,handler)=>{events.set(name,handler);return()=>events.delete(name)}},
  ui:{createFloatWidget:()=>{const root=document.createElement('div');document.body.append(root);const widget={root,setVisible(){},destroy(){root.remove()}};widgets.push(widget);return widget}}}
const phone=mountPhoneWidget(context)
try{
  phone.open()
  const owner={id:'persona:widget-owner',name:'Fixture owner',kind:'persona'}
  const state=emptyPhoneDevice(),record=phoneCoreRecords(AMAZON_SAMPLE,'widget-catalog',0).find(row=>row.appId==='amazon')
  const scopeKey=commerceScopeKey(amazonState(state,record,'widget-user',chatId,owner.id))
  const projection=operationId=>handlers[0]({type:'phone_state',chatId,operationId,state:structuredClone(state),identities:[owner,{id:'character:widget-other',name:'Other fixture actor',kind:'character'}],connections:[],saved:[],apps:PHONE_CORE_APPS.filter(app=>app.id==='amazon'),appRecords:[record]})
  projection(sent.at(-1).operationId)
  const outer=()=>widgets.at(-1).root.shadowRoot
  outer().querySelector('[aria-label="Open Core app Amazon"]').click()
  const open=sent.findLast(command=>command.action==='app')
  handlers[0]({type:'phone_app',chatId,operationId:open.operationId,appId:'amazon',recordId:record.id,targets:[],bubbles:[],amazon:{snapshot:parseAmazon(AMAZON_SAMPLE),scopeKey},html:renderPhoneCoreRecord(record,{definitions:{},activePresetIds:{},defaultShellMode:'inline',rendererMode:'relay'},{chatId,records:[]})})
  const app=()=>outer().querySelector('.core-app-view').shadowRoot
  const click=text=>{const button=[...app().querySelectorAll('button')].find(button=>button.textContent===text);assert(button,'Missing '+text);button.click()}
  assert.equal(app().querySelectorAll('.amz-phone-nav button').length,4)
  click('Add to cart')
  const add=sent.at(-1)
  assert.equal(add.action,'commerce');assert.equal(add.from,owner.id);assert.equal(add.recordId,record.id);assert.equal(add.commerceScope,scopeKey)
  assert(app().querySelector('.amz-add').disabled,'Awaiting bridge acknowledgement disables duplicate UI actions')
  mutateAmazon(state,record,add,'widget-user');projection(add.operationId)
  app().querySelector('[aria-label="Open shopping cart"]').click()
  click('Review in-story checkout')
  assert(app().querySelector('[role="dialog"]'))
  click('Cancel checkout');assert(!app().querySelector('[role="dialog"]'))
  assert.equal(state.commerce[0].orders.length,0)
  click('Review in-story checkout');click('Confirm in-story purchase')
  const buy=sent.at(-1);assert.equal(buy.confirmation.total,4990)
  mutateAmazon(state,record,buy,'widget-user');projection(buy.operationId)
  click('Orders');assert(app().textContent.includes('Delivery not confirmed'))
  click('Inject shopping into next story prompt')
  assert.equal(sent.at(-1).commerceAction,'inject')
  handlers[0]({type:'phone_error',chatId,operationId:sent.at(-1).operationId,error:'Fixture bridge failure'})
  assert(outer().textContent.includes('Fixture bridge failure'))
  assert(!app().querySelector('.amz-inject').disabled,'Failed bridge action releases shopping controls')
  assert(sent.every(command=>!['reply','continue','app-create','image','app-image'].includes(command.action)),'Shopping never dispatches a provider')
  chatId='other-widget-chat';events.get('CHAT_SWITCHED')()
  assert(!widgets.at(-1).root.isConnected,'Chat switch destroys the prior handset window')
  phone.open()
  assert(!outer().querySelector('.core-app-view'),'Reopened handset cannot show the prior chat shopping UI')
  assert.equal(state.commerce[0].orders.length,1)
  console.log('PASS mounted Amazon handset: exact owner/source commands, pending acknowledgement, cart/review/cancel/purchase, orders, injection, error recovery and chat isolation. Zero providers.')
}finally{phone.destroy();dom.window.close()}
