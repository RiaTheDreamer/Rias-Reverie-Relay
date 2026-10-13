// @ts-nocheck -- saved Relay prompt recovery through production parser shaping.
import assert from 'node:assert/strict'
const storage = new Map()
let parserCalls = 0
let parserReply = '{}'
globalThis.spindle = {
  on(){},onFrontendMessage(){},registerInterceptor(){},registerMacro(){},registerMessageContentProcessor(){},sendToFrontend(){},permissions:{has:()=>true},log:{info(){},warn(){},error(){}},
  userStorage:{async getJson(path,{fallback}){return structuredClone(storage.get(path)??fallback)},async setJson(path,value){storage.set(path,structuredClone(value))},async mkdir(){}},
  chats:{async get(){return {character_id:'fixture'}}},characters:{async get(){return {id:'fixture',name:'Host',description:'unrelated red hair'}}},personas:{async getActive(){return null}},chat:{async getMessages(){return []}},
  connections:{async get(){return {id:'mock',model:'mock',provider:'offline'}}},generate:{async raw(){parserCalls++;return {content:parserReply}}},
  imageGen:new Proxy({}, {get(){throw new Error('Reparse regression must not start images')}}),
}
const backend = await import('../src/backend')
const user='reparse-fixture'
const baseConfig={...await backend.getConfig(user),parserConnectionId:'mock',parserRetries:0,includeCharacterInfo:false,includePersonaInfo:false}
const base={chatId:'reparse-chat',messageId:'reparse-message',swipeId:0,requestId:'reparse-request',target:'prose.illustration',count:1,slots:['illustration'],cast:'none',promptSource:'structured',synthetic:true,originalSceneBrief:'SURROUNDING STORY MUST NEVER BECOME AN IMAGE PROMPT.',sourceContent:'STORY-ONLY SENTINEL',originalNegativePrompt:'',originalRequestXml:'',alt:'Two women in a room'}
for(const promptFormat of ['natural-language','danbooru-tags']) {
  const saved=promptFormat==='danbooru-tags'?'1girl, short_hair, black_jacket, Mira standing left, 1girl, long_hair, white_dress, Yuna seated right, indoors, night':'Exactly two visible people: Mira and Yuna. Mira stands left in a black jacket. Yuna sits right in a white dress. Warm room at night.'
  const config=await backend.setConfig({...baseConfig,proseIllustratorSettings:backend.normalizeProseIllustratorSettings({mode:'relay-planned',perspectiveMode:'scene-snapshot',promptFormat})},user)
  const job={...base,chatId:`reparse-${promptFormat}`,composedPositivePrompt:saved,prosePromptComposition:{positivePrompt:saved,negativePrompt:'duplicate person',namedSubjects:['Mira','Yuna'],expectedPeopleCount:2,peoplePolicy:'required',perspectiveMode:'scene-snapshot',rawOutput:{plannerVersion:'relay-planned-2'}}}
  assert.equal(backend.proseImageOnlyFallbackPrompt(job),saved)
  const result=await backend.parseSlotPrompt(job,'illustration',[],0,config,user,{},false,true)
  assert(result.promptPipeline.parserFallbackUsed,'unusable parser output must be reported as retained saved composition, not a successful reparse')
  assert.doesNotMatch(result.prompt,/SURROUNDING STORY|STORY-ONLY SENTINEL|unrelated red hair/)
  assert.match(result.negativePrompt,/duplicate person/)
  if(promptFormat==='danbooru-tags') assert.match(result.prompt,/1girl, short_hair, black_jacket, Mira standing left, 1girl, long_hair, white_dress, Yuna seated right/)
  else assert.match(result.prompt,/Mira stands left[\s\S]*Yuna sits right/)
  if(promptFormat==='danbooru-tags') {
    parserReply=JSON.stringify({prompt:'2girls, short_hair, long_hair, black_jacket, white_dress, indoors'})
    const mixed=await backend.parseSlotPrompt(job,'illustration',[],0,config,user,{},false,true)
    assert(mixed.promptPipeline.parserFallbackUsed)
    assert.match(mixed.promptPipeline.parserFallbackReason,/subject blocks/)
    assert.match(mixed.prompt,/1girl, short_hair, black_jacket[\s\S]*1girl, long_hair, white_dress/)
    parserReply='{}'
  }
}
assert.equal(parserCalls,3,'one attempted parser call per explicit Reparse, no extra generation')
assert.equal(backend.proseImageOnlyFallbackPrompt({...base,synthetic:false,composedPositivePrompt:'untrusted prose'}),'')
assert.equal(backend.proseImageOnlyFallbackPrompt({...base,prosePromptComposition:{sceneBrief:'story only'}}),'')
assert.equal(backend.proseImageOnlyFallbackPrompt({...base,promptSource:'visual_prompt',originalSceneBrief:'authored image-only prompt'}),'authored image-only prompt')
await assert.rejects(backend.parseSlotPrompt({...base,chatId:'missing-ownership',synthetic:false},'illustration',[],0,baseConfig,user,{},false,true),/no image-only/,'unknown story prose must still fail closed')
console.log('Relay Reparse fallback passed: Natural/Booru saved composition recovery, preserved owner blocks/negatives, visible parser failure, no story substitution or image calls.')
