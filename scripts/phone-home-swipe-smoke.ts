// @ts-nocheck -- mounted production widget with a local bridge; no providers.
import assert from 'node:assert/strict'
import {JSDOM} from 'jsdom'
import {mountPhoneWidget,phoneWidgetCss} from '../src/phoneWidget'
import {emptyPhoneDevice} from '../src/phoneDevice'
import {PHONE_CORE_APPS} from '../src/phoneCoreApps'

const dom=new JSDOM('<body></body>',{url:'http://localhost/',pretendToBeVisual:true})
Object.assign(globalThis,{window:dom.window,document:dom.window.document})
const handlers=[],widgets=[],sent=[]
const context={getActiveChat:()=>({chatId:'swipe-fixture'}),sendToBackend:command=>sent.push(command),
  onBackendMessage:handler=>{handlers.push(handler);return()=>{}},events:{on:()=>()=>{}},
  ui:{createFloatWidget:()=>{const root=document.createElement('div');document.body.append(root);const widget={root,setVisible(){},destroy(){root.remove()}};widgets.push(widget);return widget}}}
const phone=mountPhoneWidget(context)
const root=()=>widgets.at(-1).root.shadowRoot
let revision=0
const project=(apps=PHONE_CORE_APPS)=>handlers[0]({type:'phone_state',chatId:'swipe-fixture',operationId:`fixture-${revision}`,state:{...emptyPhoneDevice(),revision:++revision},identities:[{id:'persona:1',name:'Owner',kind:'persona'},{id:'character:1',name:'Contact',kind:'character'}],connections:[],saved:[],apps,appRecords:[]})
const position=()=>root().querySelector('.app-pages span')?.textContent
const pointer=(target,type,x,y,extra={})=>{
  const event=new window.Event(type,{bubbles:true,composed:true,cancelable:true})
  for(const [key,value] of Object.entries({pointerType:'touch',pointerId:1,isPrimary:true,button:0,clientX:x,clientY:y,...extra}))Object.defineProperty(event,key,{value})
  target.dispatchEvent(event);return event
}
const swipe=(dx,dy=0,extra={})=>{
  const target=root().querySelector('.home-screen .app')||root().querySelector('.home-screen')
  pointer(target,'pointerdown',200,200,extra)
  const move=pointer(target,'pointermove',200+dx,200+dy,extra)
  pointer(target,'pointerup',200+dx,200+dy,extra)
  return move
}
const ghostClick=()=>root().querySelector('.home-screen .app').dispatchEvent(new window.MouseEvent('click',{bubbles:true,composed:true,cancelable:true,detail:1}))
try{
  phone.open();project()
  assert.equal(position(),'1 / 4')
  const sentBefore=sent.length
  assert(swipe(-100).defaultPrevented,'horizontal gesture owns its movement')
  assert.equal(position(),'2 / 4');assert.equal(ghostClick(),false,'swipe release cannot launch the app under the finger')
  assert(root().querySelector('.home-screen'));assert.equal(sent.length,sentBefore,'paging never makes a backend/model request')
  swipe(100);assert.equal(position(),'1 / 4');ghostClick()
  swipe(100);assert.equal(position(),'1 / 4','first page does not wrap');assert.equal(ghostClick(),false)
  for(let i=0;i<5;i++){swipe(-100);ghostClick()}
  assert.equal(position(),'4 / 4','last page does not wrap')
  root().querySelector('[aria-label="Previous app page"]').click();assert.equal(position(),'3 / 4','arrows still work')
  swipe(25);assert.equal(position(),'3 / 4','short drag cannot turn a page');assert.equal(ghostClick(),false)
  assert(!swipe(-20,100).defaultPrevented,'vertical scrolling is not prevented');assert.equal(position(),'3 / 4')
  swipe(-70,65);assert.equal(position(),'3 / 4','diagonal movement needs clear horizontal intent')
  let target=root().querySelector('.home-screen .app')
  pointer(target,'pointerdown',200,200);pointer(target,'pointermove',100,200);pointer(target,'pointercancel',100,200);pointer(target,'pointerup',100,200)
  assert.equal(position(),'3 / 4','cancelled touch cannot page')
  pointer(target,'pointerdown',200,200);pointer(target,'pointerdown',210,200,{pointerId:2,isPrimary:false});pointer(target,'pointermove',100,200);pointer(target,'pointerup',100,200)
  assert.equal(position(),'3 / 4','multi-touch cancels paging')
  pointer(target,'pointerdown',200,200);pointer(target,'pointermove',100,200);project();pointer(root().querySelector('.home-screen'),'pointerup',100,200)
  assert.equal(position(),'3 / 4','replaced screen cannot complete a stale gesture')
  swipe(100,0,{pointerType:'mouse'});assert.equal(position(),'2 / 4','desktop drag works too');ghostClick()
  swipe(100,0,{pointerType:'pen'});assert.equal(position(),'1 / 4');ghostClick()
  const pager=root().querySelector('[aria-label="Next app page"]')
  pointer(pager,'pointerdown',200,200);pointer(pager,'pointermove',100,200);pointer(pager,'pointerup',100,200)
  assert.equal(position(),'1 / 4','pager buttons are not swipe zones')
  target=root().querySelector('[aria-label="Messages"]')
  pointer(target,'pointerdown',100,100);pointer(target,'pointermove',104,101);pointer(target,'pointerup',104,101)
  target.dispatchEvent(new window.MouseEvent('click',{bubbles:true,composed:true,detail:1}))
  assert(!root().querySelector('.home-screen'),'ordinary icon taps still launch an app')
  const nonHome=root().querySelector('.screen');pointer(nonHome,'pointerdown',200,200);pointer(nonHome,'pointermove',100,200);pointer(nonHome,'pointerup',100,200)
  assert(!root().querySelector('.home-screen'),'swiping inside an app cannot change home pages')
  root().querySelector('.head button').click();project([])
  assert(!root().querySelector('.app-pages'));assert(!swipe(-100).defaultPrevented,'one-page home needs no paging gesture')
  assert(phoneWidgetCss.includes('touch-action:pan-y pinch-zoom'),'vertical pan and pinch zoom remain browser-owned')
  phone.destroy();phone.open();assert(!widgets.at(-1).root.isConnected,'destroy removes the handset and gesture handlers')
  console.log('PASS mounted phone home swipes: touch/pen/mouse, both directions, 4 pages/bounds, tap safety, vertical/diagonal scroll, cancellation, multi-touch, stale renders, arrows, app isolation and single-page home. Zero providers.')
}finally{phone.destroy();dom.window.close()}
