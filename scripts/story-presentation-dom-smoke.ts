// @ts-nocheck -- mounted production frontend, not token-presence assertions.
import assert from 'node:assert/strict'
import { emptyStoryConstellationState, proposeStoryEvents, confirmStoryProposal } from '../src/storyState'
import { eventCandidate, storySource } from './event-constellation-fixtures'
import { storyEventImageIds, bindStoryGraphGeometry } from '../src/storyPresentation'
import { emptyPhoneDevice } from '../src/phoneDevice'
const domRuntime = 'jsdom'
const { JSDOM } = await import(domRuntime)
const dom = new JSDOM('<!doctype html><html><body></body></html>', {url:'http://localhost/',pretendToBeVisual:true})
const win = dom.window
for (const name of ['window','document','HTMLElement','HTMLButtonElement','HTMLImageElement','HTMLInputElement','HTMLSelectElement','HTMLTextAreaElement','HTMLStyleElement','Element','ShadowRoot','Node','MutationObserver','Event','CustomEvent','getComputedStyle']) globalThis[name] = name === 'window' ? win : name === 'document' ? win.document : win[name]
win.matchMedia = () => ({matches:false,addEventListener(){},removeEventListener(){}})
win.setInterval = () => 0
win.clearInterval = () => {}
const frames = new Map(); let frameId = 0
win.requestAnimationFrame = callback => { frames.set(++frameId,callback); return frameId }
win.cancelAnimationFrame = id => frames.delete(id)
globalThis.requestAnimationFrame = callback => win.requestAnimationFrame(callback)
globalThis.cancelAnimationFrame = id => win.cancelAnimationFrame(id)
globalThis.fetch = async () => ({ok:false,status:404,json:async()=>({})})
globalThis.spindle = {on(){},onFrontendMessage(){},registerInterceptor(){},registerMacro(){},registerMessageContentProcessor(){},sendToFrontend(){},log:{info(){},warn(){},error(){}},toast:{info(){},success(){},warning(){},error(){}}}
const observers = []
globalThis.ResizeObserver = class {
  disconnected = false
  constructor(callback) { this.callback=callback; observers.push(this) }
  observe() {}
  disconnect() { this.disconnected=true }
}
win.HTMLElement.prototype.scrollIntoView = function() { this.dataset.didScroll='true' }
const source = storySource('source-message')
const proposal = proposeStoryEvents(emptyStoryConstellationState(), [eventCandidate()], source, {sourceText:source.excerpt})
const story = proposal.state
confirmStoryProposal(story,proposal.proposalIds[0])
const event = Object.values(story.events)[0]
assert(event,'fixture must create actual confirmed state')
event.linkedAssetIds=['photo','photo']
story.echoes.echo={echoId:'echo',eventId:event.eventId,chatId:source.chatId,kind:'news',summary:'Published photograph',sourceRef:source,assetId:'echo-photo',linkState:'confirmed',confidence:1,createdAt:1,updatedAt:1}
event.echoIds=['echo']
story.phoneEntries.photo={entryId:'photo',ownerActorId:event.participants[0].actorId,ownerName:'Phone owner',app:'Photos',kind:'photo',title:'Saved scene photo',body:'',assetId:'photo',sourceRef:source,createdAt:1,updatedAt:1}
assert.deepEqual(storyEventImageIds(story,event),['photo','echo-photo'])
story.reelOverrides[event.eventId]={eventId:event.eventId,preferredHeroAssetId:'echo-photo',updatedAt:1}
assert.deepEqual(storyEventImageIds(story,event),['echo-photo','photo'])
story.echoes.echo.linkState='rejected'
delete story.reelOverrides[event.eventId]
assert.deepEqual(storyEventImageIds(story,event),['photo'],'rejected Echo media cannot become event hero')
story.echoes.echo.linkState='confirmed'
const drawer = document.createElement('div'); document.body.appendChild(drawer)
const sourceMessage = document.createElement('article'); document.body.appendChild(sourceMessage)
let backendHandler; const sent=[];const callbacks=[];const floats=[]
const ctx = {
  dom:{addStyle:()=>()=>{},findMessageElement:id=>id===source.messageId?sourceMessage:null,cleanup(){}},
  ui:{registerDrawerTab:()=>({root:drawer,setTitle(){},setShortName(){},setBadge(){},activate(){},onActivate:()=>()=>{},destroy(){}}),registerInputBarAction:()=>({setLabel(){},setSubtitle(){},setEnabled(){},onClick:()=>()=>{},destroy(){}}),showModal:()=>{const root=document.createElement('div');root.dataset.testModal='true';document.body.append(root);return{root,dismiss:()=>root.remove()}}},
  events:{on:()=>()=>{},emit(){}},display:{invalidate(){}},
  messages:{registerTagInterceptor:()=>()=>{},getRecent:()=>[]},
  getActiveChat:()=>({chatId:source.chatId,characterId:'character'}),sendToBackend:payload=>sent.push(payload),onBackendMessage:handler=>{backendHandler=handler;callbacks.push(handler);return()=>{}}
}
ctx.ui.createFloatWidget=options=>{const root=document.createElement('div');document.body.append(root);const handle={root,setVisible(value){root.hidden=!value},destroy(){root.remove()}};floats.push(handle);return handle}
const {setup}=await import('../src/frontend')
const cleanup=setup(ctx)
const asset=id=>({assetId:id,chatId:source.chatId,status:'available',imageUrl:`/images/${id}.png`,alt:'Scene evidence',caption:id})
const activeState={type:'state',chatId:source.chatId,revision:1,records:[],config:{enabled:true,enableRelayOrb:false,autoRescanOnChatOpen:false,storyConstellationsEnabled:true,parserConnectionId:null},storyConstellations:story,assetLibrary:{assets:{photo:asset('photo'),'echo-photo':asset('echo-photo')},compare:{},updatedAt:1},parserConnections:[],imageConnections:[],imageProviders:[],logs:[{id:'analysis',timestamp:1,chatId:source.chatId,messageId:source.messageId,swipeId:source.swipeId,eventType:'story_analysis_outcome',details:{status:'analyzed',rawCandidates:0}},{id:'other-chat',chatId:'other',eventType:'story_analysis_outcome',details:{status:'failed',reason:'other-chat-secret'}}],candidateBatches:[],galleryLinks:[],versionTrees:[]}
backendHandler(activeState)
const click=(label,root=drawer)=>{const button=[...root.querySelectorAll('button')].find(el=>el.textContent.trim()===label);assert(button,`button missing: ${label}`);button.click();return button}
click('Story')
assert(drawer.textContent.includes('Recent Story Analysis'))
assert(drawer.textContent.includes('No event found'),'valid empty output is not an analyzer failure')
assert(!drawer.textContent.includes('other-chat-secret'),'diagnostics must remain chat-scoped')
click('Retry Analysis')
assert.deepEqual(sent.at(-1),{type:'story_action',chatId:source.chatId,action:'retry-analysis',messageId:source.messageId,swipeId:source.swipeId},'manual retry must identify the original source, never supply replacement story text')
click('Open Constellation')
let detail=drawer.querySelector('[data-story-event-id]')
assert(detail)
assert.equal(detail.querySelectorAll('.dg-story-actor select').length,0,'identity dropdowns must not dominate graph nodes')
assert.equal(detail.querySelector('.dg-story-manage').open,false,'management must start collapsed')
assert.equal(detail.querySelectorAll('.dg-story-gallery button').length,2,'linked and confirmed Echo images must have visual thumbnails')
backendHandler({...activeState,chatId:null,revision:999,storyConstellations:emptyStoryConstellationState(),assetLibrary:{assets:{},compare:{},updatedAt:0}})
detail=drawer.querySelector('[data-story-event-id]')
assert.equal(detail?.dataset.storyEventId,event.eventId,'global settings must not erase the active Story event')
assert.equal(detail.querySelectorAll('.dg-story-gallery button').length,2,'global settings must preserve active event assets')
backendHandler({...activeState,revision:2})
detail=drawer.querySelector('[data-story-event-id]')
assert.equal(detail?.dataset.storyEventId,event.eventId,'a global revision must not block the next chat-bound Story update')
assert(detail.querySelector('.dg-story-actor').textContent.includes('unknown'),'unestablished belief must remain explicitly unknown')
click('Go to Source',detail)
assert.equal(sourceMessage.dataset.didScroll,'true','source action must scroll the actual originating message')
click('Edit Constellation',detail)
assert.equal(detail.querySelector('.dg-story-manage').open,true)
assert(detail.querySelector('.dg-story-manage select'),'identity/knowledge editing must remain available')
detail.querySelector('.dg-story-gallery button').click()
assert(document.querySelector('[data-test-modal] img'),'thumbnail must open the existing image viewer')
story.reelOverrides[event.eventId]={eventId:event.eventId,chapterLabelOverride:'Test Chapter',pinned:true,updatedAt:2}
click('Story Reel')
assert(drawer.querySelector('.dg-story-meta').textContent.includes('Test Chapter'),'saved chapter labels must be visible, not just stored')
assert(drawer.querySelector('.dg-story-image-button'),'Reel should render the same referenced hero')
win.prompt=()=>{throw new Error('native prompt unsupported')}
win.confirm=()=>{throw new Error('native confirm unsupported')}
const modal=()=>[...document.querySelectorAll('[data-test-modal]')].at(-1)
click('Edit Caption')
assert.equal(modal().getAttribute('aria-label'),'Edit Reel Caption')
const caption=modal().querySelector('textarea')
caption.value='Confirmed receipt, source preserved.';caption.dispatchEvent(new win.Event('input',{bubbles:true}))
click('Save',modal())
assert.deepEqual(sent.at(-1),{type:'story_action',chatId:source.chatId,action:'set-reel-override',eventId:event.eventId,captionOverride:'Confirmed receipt, source preserved.'})
const afterSave=sent.length
click('Chapter');click('Cancel',modal())
assert.equal(sent.length,afterSave,'cancelling an edit must not mutate Story data')
click('Open Constellation')
assert(drawer.querySelector('[data-story-event-id]'),'Reel must navigate to rich Event detail')
click('Edit Constellation')
click('Mark Non-Canon')
assert.equal(modal().getAttribute('aria-label'),'Mark Event Non-Canon')
click('Cancel',modal())
assert.equal(sent.length,afterSave,'non-canon confirmation must remain preview-only until accepted')
assert(!drawer.textContent.includes('Living Phones'),'Story navigation does not contain Phone')
click('Phone')
assert(drawer.querySelector('[aria-label="Enable Reverie Phone"]'),'Phone has its own top-level enable switch')
callbacks[0]({type:'phone_state',chatId:source.chatId,operationId:sent.filter(row=>row.action==='load').at(-1).operationId,state:emptyPhoneDevice(),identities:[{id:'char',name:'Character',kind:'character'},{id:'persona',name:'Persona',kind:'persona'}],connections:[{id:'reply',name:'Reply sidecar',model:'Test model'}],saved:[]})
const settingsHost=Array.from(drawer.querySelectorAll('div')).find(el=>el.shadowRoot?.querySelector('#phone-incoming-frequency'))
assert(settingsHost?.shadowRoot.querySelector('#phone-connection'),'Phone tab mounts actual frequency and reply settings, not a link')
assert(settingsHost.shadowRoot.querySelector('#phone-scene')&&settingsHost.shadowRoot.querySelector('#phone-context-mode')&&settingsHost.shadowRoot.querySelector('#phone-auto-reply'))
const enable=drawer.querySelector('[aria-label="Enable Reverie Phone"]');enable.checked=false;enable.dispatchEvent(new win.Event('input'))
assert.equal(sent.at(-1).patch.phoneEnabled,false);assert(floats[0].root.hidden,'Phone off hides the actual floating widget')
assert(drawer.querySelectorAll('.dg-suite-secondary-tab').length===1,'Phone does not depend on Story subnavigation')
const restore=drawer.querySelector('[aria-label="Enable Reverie Phone"]');restore.checked=true;restore.dispatchEvent(new win.Event('input'))
assert(!floats[0].root.hidden,'Phone can be re-enabled without discarding the archive or reloading')
const phonePhoto=drawer.querySelector('.dg-story-image-button')
assert(phonePhoto, 'Living Phone photos must use the keyboard-accessible shared image viewer')
const modalCount=document.querySelectorAll('[data-test-modal]').length
phonePhoto.click()
assert.equal(document.querySelectorAll('[data-test-modal]').length,modalCount+1,'Living Phone photo must open the existing image viewer')
const beforePhoneRemoval=sent.length
click('Remove Record')
assert.equal(modal().getAttribute('aria-label'),'Remove Phone Record')
click('Cancel',modal())
assert.equal(sent.length,beforePhoneRemoval,'phone removal cancellation must not send a mutation')
// The configuration recovery shortcut must land on the real parser controls.
click('Story')
click('Choose Parser Connection')
assert(drawer.textContent.includes('Surface Parser Connection'),'missing parser shortcut must not land on unrelated general settings')
cleanup()
assert(observers.every(observer=>observer.disconnected),'panel replacement/teardown must release graph observers')

// Exact mounted endpoint geometry, independent of card count or panel width.
const graph=document.createElement('div');graph.className='dg-story-constellation'
graph.innerHTML='<svg><line data-story-actor-id="a"></line></svg><div class="dg-story-center"></div><div class="dg-story-actor" data-story-actor-id="a"></div>'
document.body.append(graph)
graph.getBoundingClientRect=()=>({left:10,top:20,width:400,height:600})
graph.querySelector('.dg-story-center').getBoundingClientRect=()=>({left:160,top:270,width:100,height:100})
graph.querySelector('[data-story-actor-id="a"]:not(line)').getBoundingClientRect=()=>({left:60,top:60,width:100,height:100})
const stop=bindStoryGraphGeometry(document.body)
for(const [id,callback] of [...frames]){frames.delete(id);callback()}
const line=graph.querySelector('line')
const near=(key,expected)=>assert(Math.abs(Number(line.getAttribute(key))-expected)<0.00001,`${key} must meet the card edge without crossing its label`)
near('x1',44.04761904761905);near('y1',41.666666666666664)
near('x2',30.952380952380956);near('y2',23.333333333333332)
stop();assert(observers.at(-1).disconnected)
dom.window.close()
console.log('PASS mounted Story presentation: global-state isolation, image/reference projection, gallery viewer, read/edit split, Reel navigation, source scroll, parser recovery route, measured graph links and observer cleanup')
