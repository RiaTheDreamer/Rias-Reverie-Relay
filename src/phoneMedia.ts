// Photo styles, not the Illustrator's scene-selection modes.
export const PHONE_FRAMING = [
  {id:'auto',label:'As described'},
  {id:'character-portrait',label:'Character portrait'},
  {id:'selfie',label:'Social selfie'},
  {id:'social-candid',label:'Candid social photo'},
  {id:'cctv',label:'CCTV'},
  {id:'evidence-surveillance',label:'Evidence / surveillance'},
  {id:'cinematic-scene',label:'Cinematic still'},
  {id:'object-prop',label:'Object / detail'},
  {id:'environment-location',label:'Environment / location'},
]
export type PhoneImage = {status:'draft'|'pending'|'ready'|'failed';prompt:string;framing:string;connectionId:string;imageId?:string;imageUrl?:string;error?:string}
// Provider-ready composition cues, never the Story Model's instruction templates.
const cues:Record<string,string>={
  auto:'',
  'character-portrait':'character portrait, identity-focused composition, visible current clothing and expression',
  selfie:'arm-length front-facing social selfie, natural expression, phone held outside the image',
  'social-candid':'candid social photograph, casual unposed moment, ambient available light',
  cctv:'CCTV footage still, fixed elevated wide view, distant subjects, low-resolution surveillance capture',
  'evidence-surveillance':'documentary evidence photograph, distant observational view, imperfect candid capture',
  'cinematic-scene':'cinematic narrative still, environmental composition, visible ongoing action',
  'object-prop':'close detail photograph of the described object, visible material and wear',
  'environment-location':'wide environmental photograph, clear setting and spatial layout',
  'scene-snapshot':'candid scene, medium-wide view, visible surroundings, natural body orientation',
  sequence:'continuous scene geography, consistent screen direction, visible ongoing action',
  'emotional-beat':'expressive face, visible story-supported reaction, intimate composition',
  'solo-scene':'one visible person, environmental context, natural pose',
  'persona-pov':'first-person view from the user persona, in-world attention target',
  storyboard:'narrative still, visible action and contact, distinct actor positions, clear spatial relationships',
}
export function phoneFramingCue(id:string):string {if(!Object.hasOwn(cues,id))throw new Error('Choose a supported photo framing mode.');return cues[id]}
export function phoneImagePrompt(prompt:string):string {
  const value=prompt.trim()
  if(!value||value.length>6000||/<\/?[A-Za-z]|```/.test(value))throw new Error('Use an image description of 1–6,000 characters, without protocol markup.')
  return value.replace(/\bcamera\s*:/gi,'View:').replace(/\bcamera angle\b/gi,'view angle')
}
export function normalizePhoneImage(raw:any):PhoneImage|undefined {
  if(raw==null)return undefined
  if(!raw||!['draft','pending','ready','failed'].includes(raw.status)||typeof raw.prompt!=='string'||raw.prompt.length>6000||!Object.hasOwn(cues,raw.framing)||typeof raw.connectionId!=='string')throw new Error('Phone image storage is invalid. Existing messages were preserved.')
  if(raw.status==='ready'&&(!/^[\w.-]+$/.test(raw.imageId||'')||!safePhoneImageUrl(raw.imageUrl)))throw new Error('Phone image has no safe persisted asset.')
  return {status:raw.status,prompt:raw.prompt,framing:raw.framing,connectionId:raw.connectionId,...(raw.imageId?{imageId:raw.imageId}:{}),...(safePhoneImageUrl(raw.imageUrl)?{imageUrl:raw.imageUrl}:{}),...(typeof raw.error==='string'?{error:raw.error}: {})}
}
export function safePhoneImageUrl(value:unknown):value is string{return typeof value==='string'&&/^(?:https?:\/\/|\/(?!\/))[^\s<>"']+$/i.test(value)}
