// @ts-nocheck -- production request/anchor/count handling without a host.
import assert from 'node:assert/strict'
import {parseImageRequests,inspectStoryModelOutputContracts} from '../src/contracts'
import {canStreamIllustration} from '../src/illustratorWeave'
globalThis.spindle={permissions:{has:()=>false},on(){},onFrontendMessage(){},registerMacro(){},registerMessageContentProcessor(){},sendToFrontend(){},log:{info(){},warn(){},error(){}}}
const {proseRequestAnchor,insertProseMarker,applyPromptProfileToPositivePrompt}=await import('../src/backend')
const objectDecision = { requestedProfileId:'auto',selectedProfileId:'object-prop',selectedProfileName:'Object',automaticClassification:'object photo',reason:'fixture',framingGuidance:'',promptAdditions:'',negativeAdditions:'',removedPositiveFragments:[],suppressedContext:[{source:'character/persona',reason:'object-only'}] }
assert.equal(applyPromptProfileToPositivePrompt('No people in frame. A blue mug beside a closed yellow notebook.',objectDecision).prompt,'No people in frame. A blue mug beside a closed yellow notebook.','object framing must preserve explicit absence instead of producing "No ."')
const image=(slot,opening=false)=>`<reverie-illustration request="generate" slot="${slot}" aspect="4:3" cast="none"${opening?' placement="opening"':''}><visual_prompt>The brass key on the table.</visual_prompt></reverie-illustration>`
const content=`${image('cover',true)}\n\nA brass key lies on the table.\n\n${image('inline')}\n\nRain beads on the window.`
const requests=parseImageRequests(content)
assert.equal(requests.length,2)
assert.equal(requests.filter(canStreamIllustration).length,1,'streaming dispatch defers the opening and keeps the inline image')
const cover=proseRequestAnchor(requests[0],content,'m',0)
assert.equal(cover.anchor.insertionSide,'opening')
assert.match(cover.paragraph,/brass key/)
assert.doesNotMatch(cover.paragraph,/visual_prompt/)
assert.equal(proseRequestAnchor(requests[0],image('cover',true),'m',0),null,'early streaming cover has no following paragraph')
assert.equal(proseRequestAnchor(requests[1],content,'m',0).anchor.insertionSide,'after')
const check=inspectStoryModelOutputContracts(content,{expectedInlineIllustrations:1,inlineCountMode:'fixed'})
assert.equal(check.inline.valid,true,JSON.stringify(check))
const inserted=insertProseMarker(content,cover.anchor,'<scene_image>opener</scene_image>')
assert(inserted.content.startsWith('<scene_image>'))
assert.equal(insertProseMarker(inserted.content,cover.anchor,'<scene_image>opener</scene_image>').content,inserted.content)
const {renderCompletedProseLifecycleProjection,renderRegenerationLifecycleProjection}=await import('../src/nativeSurfaces')
const record={key:'cover-slot',requestId:'cover',target:'prose.illustration',status:'completed',imageUrl:'/cover.png',imageId:'cover-image',alt:'Rain & <Windows>',requestAspect:'16:9',proseAnchor:cover.anchor}
const rendered=renderCompletedProseLifecycleProjection(record,{records:[record]})
assert.match(rendered,/data-rr-opening-cover="1"/,'opening assets must mount in a designed cover, not a bare illustration')
assert.match(rendered,/<h2[^>]*>Rain &amp; &lt;Windows&gt;<\/h2>/,'title is escaped HTML typography outside the generated image')
assert.match(renderRegenerationLifecycleProjection({...record,status:'generating'},{definitions:{},activePresetIds:{}},{}),/data-rr-opening-cover="1"/,'regeneration preserves the cover shell')
assert.doesNotMatch(renderCompletedProseLifecycleProjection({...record,proseAnchor:{...cover.anchor,insertionSide:'after'}},{}),/data-rr-opening-cover="1"/,'inline images retain their presentation')
console.log('Opening Frame: independent inline count, preserved XML, first-paragraph anchoring, streaming boundary and idempotent top placement passed.')
