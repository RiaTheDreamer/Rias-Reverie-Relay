// @ts-nocheck -- exercises production planners without provider traffic.
import assert from 'node:assert/strict'
import { compileRelayPlannedPrompt, validateRelayPlannedDirectorResult, runRelayPlannedDirectorWithFrequency, resolvedRelayFraming, relayPlannedCountDirective } from '../src/relayPlannedV2'
import { storyFraming } from '../src/sightline'
const context = {
  version: 'relay-planned-v2', chatId:'lab', messageId:'m', swipeId:0,
  maximumIllustrations:2, maximumCharacters:3, maximumPromptCharacters:6000,
  perspectiveMode:'scene-flow', defaultAspectRatio:'4:3', promptStyle:'', adultMode:false,
  paragraphs:[{index:0,text:'Ada rests her palms on her thighs. A brass key lies on the table.'},{index:1,text:'Ben waits by the window.'}],
  subjects:[{name:'Ada',role:'character',identity:['blue eyes'],current:['green jacket'],pinned:[],superseded:[],activeFactIds:[]}],
  referenceAssetIds:[], locationReferenceAssetIds:[], priorIllustrations:[], globalNegativeRequirements:[], sightlineGuard:true,
}
const shot = (overrides = {}) => ({rank:1,title:'Palms',reason:'visible action',anchor:{paragraphIndex:0,insertionSide:'after',anchorExcerpt:'Ada rests her palms on her thighs.'},aspectRatio:'4:3',expectedPeopleCount:1,namedSubjects:['Ada'],omittedSubjects:[],subjectDirectives:[{name:'Ada',role:'character',appearanceOverrides:[],attireOverrides:[],temporaryTraits:[],expression:'',pose:'seated',action:'rests her palms on her thighs',gaze:'',contact:'palms on own thighs',blocking:''}],composition:{shotType:'waist-up',cameraAngle:'eye level',framing:'waist-up',blocking:'Ada seated',foreground:'',background:'',location:'room',timeOfDay:'day',lighting:'soft',mood:'quiet',importantProps:[],backgroundPeople:''},promptCore:'Ada sits with her palms resting on her own thighs.',negativeCore:'',referenceAssetIds:[],locationReferenceAssetIds:[],...overrides})
assert.equal(resolvedRelayFraming(shot(),context),'blocking-fidelity')
const compiled = compileRelayPlannedPrompt(shot(),context)
assert.match(compiled.positivePrompt,/knees-up/)
assert(compiled.warnings.some(message => message.includes('Sightline')), 'camera correction must be auditable')
const detail = shot({expectedPeopleCount:0,namedSubjects:[],subjectDirectives:[],dreamcutFocus:{kind:'object',quote:'brass key'},promptCore:'Close-up of the brass key on the table.',composition:{...shot().composition,shotType:'close-up',framing:'close-up',blocking:'',importantProps:['brass key']}})
assert.equal(resolvedRelayFraming(detail,context),'dreamcut')
assert.doesNotMatch(compileRelayPlannedPrompt(detail,context).positivePrompt,/green jacket|blue eyes|Ada seated/)
const handDetail = shot({dreamcutFocus:{kind:'detail',quote:'her palms'},promptCore:'Close-up of Ada’s palms resting on her thighs.'})
assert.doesNotMatch(compileRelayPlannedPrompt(handDetail,{...context,perspectiveMode:'dreamcut'}).positivePrompt,/blue eyes|green jacket/, 'a fragment must not receive full-body identity append')
const xml = '<reverie-illustration framing="dreamcut" focus-kind="object" focus="brass key">'
assert.equal(storyFraming('scene-flow',xml,context.paragraphs[0].text,0),'dreamcut')
assert.equal(storyFraming('scene-flow','',context.paragraphs[0].text,1),'blocking-fidelity')
assert.equal(storyFraming('solo-scene',xml,context.paragraphs[0].text,1),'solo-scene')
assert.equal(storyFraming('dreamcut',xml,'No key here.',0),'scene-snapshot')
const cover=shot({placement:'opening',anchor:{...shot().anchor,insertionSide:'opening'}})
const last=shot({rank:2,title:'Waiting',anchor:{paragraphIndex:1,insertionSide:'after',anchorExcerpt:'Ben waits by the window.'},expectedPeopleCount:0,namedSubjects:[],subjectDirectives:[],promptCore:'The window in the room.'})
const v=validateRelayPlannedDirectorResult(JSON.stringify({shouldIllustrate:true,reason:'lab',illustrations:[cover,shot(),last]}), {...context,openingFrame:true})
assert.equal(v.illustrations.filter(row=>!row.rejected).length,3,JSON.stringify(v))
let calls=0
const quick=await runRelayPlannedDirectorWithFrequency([],{...context,quickweave:true,minimumIllustrations:2,frequencyMode:'every-message'},async()=>{calls++;return JSON.stringify({shouldIllustrate:true,reason:'lab',illustrations:[shot()]})})
assert.equal(calls,1,'Quickweave must not spend on an automatic count repair')
assert(quick)
const openingContext = {...context,openingFrame:true,maximumIllustrations:1,minimumIllustrations:1,countMode:'fixed',frequencyMode:'every-message'}
assert.match(relayPlannedCountDirective(openingContext), /1 inline illustration.*one extra Opening Frame/s, 'count instruction must distinguish cover from inline budget')
let openingCalls=0
const openingResult=await runRelayPlannedDirectorWithFrequency([],openingContext,async()=>{
  openingCalls++
  return JSON.stringify({shouldIllustrate:true,illustrations:openingCalls===1?[shot()]:[cover,shot()]})
})
assert.equal(openingCalls,2,'missing requested opening must share the bounded batch retry')
assert.equal(openingResult.validated.illustrations.length,2)
let quickOpeningCalls=0
const quickOpening=await runRelayPlannedDirectorWithFrequency([],{...openingContext,quickweave:true},async()=>{quickOpeningCalls++;return JSON.stringify({shouldIllustrate:true,illustrations:[shot()]})})
assert.equal(quickOpeningCalls,1)
assert(quickOpening.validated.warnings.some(message=>message.includes('Opening Frame shortfall')), 'one-pass omission must be visible rather than silently succeeding')
console.log('Weave: per-image Scene Flow, crop audit, Dreamcut isolation, opening count and Quickweave no-retry passed.')
