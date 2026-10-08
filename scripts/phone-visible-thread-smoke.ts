// @ts-nocheck -- mounted production widget; no providers or inbox writes.
import assert from 'node:assert/strict'
import {JSDOM} from 'jsdom'
import {mountPhoneWidget} from '../src/phoneWidget'
import {emptyPhoneDevice} from '../src/phoneDevice'
const dom=new JSDOM('<body></body>',{url:'http://localhost',pretendToBeVisual:true})
globalThis.window=dom.window;globalThis.document=dom.window.document
const widgets=[],sent=[],handlers=[]
const ctx={getActiveChat:()=>({chatId:'visible-thread'}),sendToBackend:value=>sent.push(value),onBackendMessage:fn=>{handlers.push(fn);return()=>{}},events:{on:()=>()=>{}},ui:{createFloatWidget:()=>{const root=document.createElement('div');document.body.append(root);const widget={root,setVisible(){},destroy(){root.remove()}};widgets.push(widget);return widget}}}
const controller=mountPhoneWidget(ctx)
const identities=[{id:'character:a',name:'Character',kind:'character'},{id:'persona:a',name:'Persona',kind:'persona'},{id:'npc:b',name:'Other Contact',kind:'npc'}]
const row=(id,from,to,createdAt)=>({id,from,to,createdAt,body:id,replyStatus:'none'})
const state={...emptyPhoneDevice(),readAt:{'persona:a:character:a':100},messages:[row('initial-text','character:a','persona:a',90)]}
const projection={type:'phone_state',chatId:'visible-thread',operationId:'load',state,identities,connections:[],saved:[]}
handlers[0](projection);controller.open();const root=()=>widgets.at(-1).root.shadowRoot
const click=label=>[...root().querySelectorAll('button')].find(el=>el.textContent===label).click()
click('Messages');root().querySelector('.row').click();sent.length=0
const next={...projection,state:{...state,revision:1,messages:[...state.messages,row('new-in-thread','character:a','persona:a',200),row('other-unread','npc:b','persona:a',201)]}}
handlers[0](next);await Promise.resolve()
assert(sent.some(command=>command.action==='read'&&command.from==='persona:a'&&command.to==='character:a'),'a newly rendered incoming reply in the open thread must be marked read')
assert(!sent.some(command=>command.to==='npc:b'),'another unopened conversation stays unread')
const reads=sent.length;handlers[0](next);await Promise.resolve();assert.equal(sent.length,reads,'repeated projection cannot start a read loop')
root().querySelector('[aria-label="Close phone"]').click();handlers[0]({...next,state:{...next.state,revision:2,messages:[...next.state.messages,row('closed-phone-text','character:a','persona:a',300)]}});await Promise.resolve()
assert.equal(sent.length,reads,'closed phone never marks new texts read')
controller.destroy();dom.window.close()
console.log('PASS visible phone thread: active incoming read, unrelated and closed threads preserved, repeated projections deduplicated')
