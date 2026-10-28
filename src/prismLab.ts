/** Offline paired review. No connection access, generation calls or scoring by completion status. */
export const PRISM_AXES = ['actor count', 'posture', 'hands / contact', 'prop owner', 'clothing', 'framing', 'anatomy'] as const
export type PrismRun = { id: string; image: string; imageId: string; prompt: string; negativePrompt:string; actual: { provider:string; model: string; loras: Array<{name:string;weight:number}>; seed:number; steps:number; cfg:number; width:number; height:number; sampler:string; scheduler:string }; variant:string }
export type PrismPair = { id:string; source:string; control:PrismRun; treatment:PrismRun; varied?:string[] }
export type PrismManifest = { title:string; blindSeed:string; pairs:PrismPair[] }
const fields=['provider','model','loras','seed','steps','cfg','width','height','sampler','scheduler'] as const
const hash=(s:string)=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0}
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
const canonical=(v:unknown):unknown=>v && typeof v==='object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,canonical(x)])) : Array.isArray(v)?v.map(canonical):v
const stable=(v:unknown):string=>JSON.stringify(canonical(v))
function safeImage(path:string):boolean {
  if (/^(?:https?:|data:|javascript:|\/\/)/i.test(path)) return false
  return /^[a-zA-Z0-9_./ -]+\.(?:png|jpe?g|webp)$/i.test(path) && !path.split(/[\/\\]/).includes('..') && !path.startsWith('/')
}
export function validatePrism(manifest:PrismManifest):string[] {
  const errors:string[]=[], ids=new Set<string>()
  if(!manifest || !Array.isArray(manifest.pairs) || !manifest.pairs.length) return ['Supply at least one paired case.']
  if(!manifest.blindSeed) errors.push('Missing fixed blinding seed.')
  for(const pair of manifest.pairs) {
    if(!pair.id || ids.has(pair.id)) errors.push('Duplicate or missing case ID.'); ids.add(pair.id)
    if(!pair.source?.trim()) errors.push(`${pair.id}: missing frozen source.`)
    if(pair.control?.id===pair.treatment?.id || pair.control?.imageId===pair.treatment?.imageId) errors.push(`${pair.id}: two distinct outputs are required.`)
    for(const run of [pair.control,pair.treatment]) {
      if(!run?.actual || !run.prompt?.trim() || typeof run.negativePrompt !== 'string' || !run.imageId || !run.variant) {errors.push(`${pair.id}: incomplete output evidence.`);continue}
      if(!safeImage(run.image)) errors.push(`${pair.id}: image must be a relative local PNG/JPEG/WebP path.`)
      if(!run.actual.provider || !run.actual.model || !run.actual.sampler || !run.actual.scheduler || !Array.isArray(run.actual.loras)) errors.push(`${pair.id}: missing actual provider/model/LoRA/sampler evidence.`)
      if(!Number.isSafeInteger(run.actual.seed) || run.actual.seed<0 || !Number.isInteger(run.actual.steps) || run.actual.steps<1 || !Number.isFinite(run.actual.cfg) || run.actual.cfg<=0) errors.push(`${pair.id}: invalid numeric generation evidence.`)
      if(!Number.isInteger(run.actual.width) || !Number.isInteger(run.actual.height) || run.actual.width<1 || run.actual.height<1) errors.push(`${pair.id}: missing actual resolution.`)
      if(run.actual.loras?.some(l=>!l.name || !Number.isFinite(l.weight))) errors.push(`${pair.id}: invalid LoRA evidence.`)
    }
    for(const field of fields) if(pair.control?.actual && pair.treatment?.actual && stable(pair.control.actual[field])!==stable(pair.treatment.actual[field]) && !pair.varied?.includes(field)) errors.push(`${pair.id}: uncontrolled ${field} differs. Declare the boundary or use matched outputs.`)
    if(pair.control?.negativePrompt!==pair.treatment?.negativePrompt && !pair.varied?.includes('negativePrompt')) errors.push(`${pair.id}: uncontrolled negative prompt differs.`)
    if(pair.varied?.some(f=>!fields.includes(f as any) && f!=='negativePrompt')) errors.push(`${pair.id}: unrecognized boundary.`)
  }
  return errors
}
export function prismSides(pair:PrismPair, seed:string):[PrismRun,PrismRun] { return hash(seed+':'+pair.id)%2 ? [pair.treatment,pair.control] : [pair.control,pair.treatment] }
export function renderPrism(manifest:PrismManifest):string {
  const errors=validatePrism(manifest);if(errors.length)throw Error(errors.join('\n'))
  const mapping=manifest.pairs.map(p=>({id:p.id,sides:prismSides(p,manifest.blindSeed).map(r=>({id:r.id,imageId:r.imageId,variant:r.variant,actual:r.actual}))}))
  const cards=manifest.pairs.map(pair=>`<section><h2>${esc(pair.id)}</h2><blockquote>${esc(pair.source)}</blockquote>${pair.varied?.length?`<p class="notice">Boundary test: ${esc(pair.varied.join(', '))}. This is not a matched settings control.</p>`:''}<div class="pair">${prismSides(pair,manifest.blindSeed).map((run,i)=>`<article><h3>${i?'B':'A'}</h3><img src="${esc(run.image)}" alt="Review output ${i?'B':'A'}"><fieldset>${PRISM_AXES.map((axis,j)=>`<label>${esc(axis)}<select data-case="${esc(pair.id)}" data-side="${i}" data-axis="${j}"><option value="">Unscored</option><option value="2">Faithful</option><option value="1">Partial</option><option value="0">Failed</option><option value="na">Not applicable</option></select></label>`).join('')}</fieldset><label>Notes<textarea data-notes="${esc(pair.id)}:${i}"></textarea></label><details><summary>Reveal prompt and treatment</summary><strong>${esc(run.variant)}</strong><pre>${esc(run.prompt)}</pre><pre>${esc(JSON.stringify(run.actual,null,2))}</pre></details></article>`).join('')}</div></section>`).join('')
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(manifest.title)}</title><style>body{color:#eee;background:#12101b;font:16px system-ui;max-width:1250px;margin:auto;padding:24px}h1{color:#f0b6df}section{border-top:1px solid #5c3555;padding:20px 0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:24px}article{background:#201a2a;border:1px solid #54435d;border-radius:16px;padding:16px}img{width:100%;max-height:620px;object-fit:contain;background:#100d17}label{display:flex;justify-content:space-between;gap:12px;margin:9px 0}select,textarea,button{background:#33273e;color:white;border:1px solid #876080;border-radius:7px;padding:8px}textarea{width:70%}pre{white-space:pre-wrap;overflow-wrap:anywhere}fieldset{border:0;padding:0}.notice{color:#ffcc83}button{cursor:pointer;position:sticky;top:10px}@media(max-width:650px){.pair{grid-template-columns:1fr}}</style><h1>${esc(manifest.title)} · Prism Lab</h1><p>Score the frozen story against each image before revealing treatments. Provider completion is not a quality pass. Blank and not applicable are separate. Review results are exported locally; nothing is sent to a model.</p><button id="save">Export review JSON</button>${cards}<script type="application/json" id="mapping">${JSON.stringify(mapping).replace(/</g,'\\u003c')}</script><script>document.getElementById('save').onclick=()=>{const scores=[...document.querySelectorAll('select')].map(e=>({case:e.dataset.case,side:e.dataset.side,axis:e.dataset.axis,score:e.value}));const notes=[...document.querySelectorAll('textarea')].map(e=>({key:e.dataset.notes,text:e.value}));const out={schema:'reverie-prism-review-v1',reviewedAt:new Date().toISOString(),mapping:JSON.parse(document.getElementById('mapping').textContent),scores,notes};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:'application/json'}));a.download='prism-review.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}</script>`
}
