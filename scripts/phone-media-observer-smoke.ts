// @ts-nocheck -- production observer plus handset, with deferred host attachment.
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { observeRelayMediaMounts } from '../src/mediaDomStability'
import { mountPhoneWidget, phoneHostLayerCss } from '../src/phoneWidget'
import { emptyPhoneDevice } from '../src/phoneDevice'

const dom = new JSDOM('<!doctype html><body><main id="story"></main></body>', {url:'http://localhost/',pretendToBeVisual:true})
for (const name of ['window','document','Node','Element','HTMLElement','HTMLInputElement','HTMLTextAreaElement','ShadowRoot','MutationObserver']) globalThis[name] = name === 'window' ? dom.window : name === 'document' ? dom.window.document : dom.window[name]
const attached=[], registered=[], handlers=[], pending=[]
let visibilityWrites=0
let bridgeFails=false,expectShell=false
const host = {
  getActiveChat:()=>({chatId:'observer-chat'}),
  sendToBackend:()=>{
    if(expectShell)assert(registered.at(-1)?.shadowRoot.querySelector('[aria-label="Close phone"]'),'The closeable shell must precede its load request, even before deferred attachment')
    if(bridgeFails)throw new Error('Simulated disconnected bridge')
  },
  onBackendMessage:handler=>{handlers.push(handler);return()=>{}},
  events:{on:()=>()=>{}},
  ui:{createFloatWidget:options=>{
    const root=document.createElement('div')
    registered.push(root)
    const frame=document.createElement('div');frame.dataset.testFloatWidget='true'
    document.body.append(frame)
    // Unlike the old performance fixture, registration returns a detached
    // root. Attachment occurs later, as it does in Spindle's paint phase.
    pending.push(()=>{frame.replaceChildren(root);attached.push(root)})
    let visible=true
    return {root,setVisible:next=>{visibilityWrites++;visible=next},isVisible:()=>visible,destroy:()=>frame.remove()}
  }},
}
const flush=async()=>{for(let i=0;i<4;i++)await new Promise(resolve=>setTimeout(resolve,0))}
let scans=0
const stop=observeRelayMediaMounts(document.body,()=>{scans++})
const phone=mountPhoneWidget(host)
pending.splice(0).forEach(mount=>mount());await flush()
const projection={type:'phone_state',chatId:'observer-chat',operationId:'load-observer-001',state:emptyPhoneDevice(),identities:[{id:'char:1',name:'Character',kind:'character'},{id:'persona:1',name:'Persona',kind:'persona'}],connections:[],saved:[],apps:[],appRecords:[]}
handlers.forEach(handler=>handler(projection));await flush()
scans=0
expectShell=true
phone.open()
assert.equal(pending.length,1,'The host defers the fullscreen root attachment')
assert(registered.at(-1).shadowRoot.querySelector('[aria-label="Close phone"]'),'The detached fullscreen root is populated synchronously')
pending.splice(0).forEach(mount=>mount());await flush()
let overlay=attached.at(-1)
assert(overlay.shadowRoot.querySelector('[aria-label="Close phone"]'),'Detached-root opening still populates its closeable shell before attachment')
assert.equal(scans,0,'Attaching a phone-only widget must not schedule a full story/media rescan')
handlers.forEach(handler=>handler({...projection,state:{...projection.state,revision:1}}));await flush()
assert.equal(scans,0,'Phone rerender and notification badge updates are not chat-media mounts')
assert.equal(visibilityWrites,0,'Opening and rerendering an already-visible launcher must not write the host placement store')
overlay.shadowRoot.querySelector('[aria-label="Close phone"]').click()
assert(!overlay.isConnected,'Closing removes the fullscreen blocker')
for(let i=0;i<3;i++){
  phone.open();pending.splice(0).forEach(mount=>mount());overlay=attached.at(-1)
  overlay.shadowRoot.querySelector('[aria-label="Close phone"]').click()
}
bridgeFails=true;phone.open()
pending.splice(0).forEach(mount=>mount());overlay=attached.at(-1)
assert(overlay.shadowRoot.querySelector('[aria-label="Close phone"]'),'A throwing bridge cannot leave an empty fullscreen blocker')
assert(overlay.shadowRoot.textContent.includes('Simulated disconnected bridge'),'Bridge failure is explained inside the handset')
overlay.shadowRoot.querySelector('[aria-label="Close phone"]').click()
bridgeFails=false;expectShell=false;await flush()
assert.equal(scans,0,'Open/close cycles must not rebind story media')

// The boundary must exclude only phone UI, not real inline story Surfaces.
const story=document.querySelector('#story')
const image=document.createElement('img');story.append(image);await flush()
assert.equal(scans,1,'New story media must still be observed')
const isolated=document.createElement('div');const shadow=isolated.attachShadow({mode:'open'});story.append(isolated);await flush()
scans=0;shadow.append(document.createElement('img'));await flush()
assert.equal(scans,1,'Actual story shadow-root media must remain observed')
scans=0
const mixed=document.createElement('div'),marked=document.createElement('div')
marked.setAttribute('data-reverie-phone-ui','handset')
mixed.append(marked,document.createElement('img'));story.append(mixed);await flush()
assert.equal(scans,1,'A mixed phone/story mount cannot hide genuine story media from reconciliation')
phone.setEnabled(false);await flush()
assert.equal(visibilityWrites,1,'Disabling still hides the launcher through the host API')
phone.setEnabled(true);await flush()
assert.equal(visibilityWrites,2,'Re-enabling still restores the launcher through the host API')
phone.destroy();stop();dom.window.close()

// Actual host wrapper shape: a fullscreen handset must be above the drawer,
// but launcher and unrelated widgets must retain the host's original layer.
const layers=new JSDOM('<!doctype html><head></head><body><div class="widget"><div><div data-reverie-phone-ui="handset"></div></div></div><div class="widget"><div><div data-reverie-phone-ui="launcher"></div></div></div><div class="widget"><div><div data-other-extension></div></div></div></body>')
const sheet=layers.window.document.createElement('style');sheet.textContent='.widget{position:fixed;z-index:9980}'+phoneHostLayerCss;layers.window.document.head.append(sheet)
assert.deepEqual([...layers.window.document.querySelectorAll('.widget')].map(widget=>layers.window.getComputedStyle(widget).zIndex),['9993','9980','9980'],'Only the fullscreen Reverie handset rises above the drawer')
layers.window.close()
console.log('phone media observer smoke passed: deferred handset attachment and rerenders do not rebind story media; story mounts remain observed')
