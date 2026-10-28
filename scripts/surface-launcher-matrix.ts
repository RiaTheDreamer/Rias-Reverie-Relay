// @ts-nocheck -- DOM presentation matrix; modern colors/blur need live checks.
import { mkdirSync, writeFileSync } from 'node:fs'
import { JSDOM, VirtualConsole } from 'jsdom'
import { shippedSurfaceDefinitions } from '../src/shippedSurfaceDefinitions'
import { r45SupplementalSurfaceDefinitions } from '../src/r45SurfaceCatalog'
import { renderNativeSurfaceMarkup } from '../src/nativeSurfaces'
import { narrativeRegexScripts, renderNarrativeRegex } from '../src/narrativeRegexAssets'

const output = new URL('../artifacts/surface-launcher-matrix-20261027/', import.meta.url)
mkdirSync(output, { recursive: true })
const modes = ['inline','plain','sparkling','glass','plain-glass']
const colors = ['realistic','primary','glass']
const definitions = [...shippedSurfaceDefinitions(1), ...r45SupplementalSurfaceDefinitions(1)]
const aliases = { 'Relationship Map':'relationship-map','Cast Sheet':'character-profile','Building Layout':'building-layout' }
const wardrobe = '[persona_wardrobe][title]Wardrobe[/title][subtitle]Five looks[/subtitle][wardrobe_context][character]Adult[/character][occasion]Dinner[/occasion][season]Autumn[/season][location]Studio[/location][style_note]Neutral[/style_note][/wardrobe_context]' + Array.from({length:5},(_,i)=>`[outfit_option][id]look-${i+1}[/id][name]Look ${i+1}[/name][style_tags]neutral[/style_tags][occasion_fit]Dinner[/occasion_fit][color_story]blue[/color_story][summary]A neutral outfit.[/summary][pieces][top]Shirt[/top][/pieces][wear_text]The adult wears a shirt and trousers.[/wear_text][media][/media][/outfit_option]`).join('') + '[/persona_wardrobe]'
const pool: string[] = [], styleIds = new Map<string,number>(), cases: any[] = []
function compact(html: string) {
  const dom = new JSDOM(html, { virtualConsole: new VirtualConsole() })
  const d = dom.window.document
  const styles = [...d.querySelectorAll('style')].map(e => {
    const text = e.textContent || ''
    if (!styleIds.has(text)) { styleIds.set(text, pool.length); pool.push(text) }
    return styleIds.get(text)
  })
  const launcher = d.querySelector('.rr-surface-launcher-iconized') || d.querySelector('summary')
  let shell = ''
  if (launcher) {
    let current = launcher.cloneNode(true)
    for (let parent = launcher.parentElement; parent && parent !== d.body; parent = parent.parentElement) {
      const clone = parent.cloneNode(false)
      for (const input of parent.children) if (input.tagName === 'INPUT') clone.appendChild(input.cloneNode(true))
      clone.appendChild(current); current = clone
    }
    shell = current.outerHTML
  }
  dom.window.close()
  return { styles, shell, hasLauncher: Boolean(launcher) }
}
for (const mode of modes) for (const color of colors) {
  for (const definition of definitions) {
    const rendered = renderNativeSurfaceMarkup(definition.sampleXml, { definitions:{[definition.surfaceId]:definition}, activePresetIds:{[definition.baseSurfaceId]:definition.surfaceId}, rendererMode:'relay', defaultShellMode:mode, colorMode:color } as any, { chatId:'matrix',messageId:definition.baseSurfaceId,autoGenerate:false }).content
    cases.push({ family:'core', id:definition.baseSurfaceId, mode,color,...compact(rendered) })
  }
  const variant = mode === 'plain' ? 'plain-button' : mode === 'sparkling' ? 'sparkle-button' : mode
  const scripts = narrativeRegexScripts(variant, color)
  cases.push({family:'narrative-native',id:'Persona Wardrobe',mode,color,...compact(renderNarrativeRegex(wardrobe,variant,'matrix',{},color))})
  for (const name of [...new Set(Object.keys(aliases).concat(scripts.flatMap(s => [...s.replace_string.matchAll(/data-rr-surface-icon="narrative:([^"]+)"/g)].map(m=>m[1]))))]) {
    if (aliases[name]) {
      const native = cases.find(c=>c.family==='core'&&c.id===aliases[name]&&c.mode===mode&&c.color===color)
      cases.push({ ...native, family:'narrative-native',id:name,aliasOf:aliases[name] }); continue
    }
    const script = scripts.find(s=>s.replace_string.includes(`data-rr-surface-icon="narrative:${name}"`) && /<(?:summary|label)\b/.test(s.replace_string))
    if (!script) continue
    cases.push({family:'narrative',id:name,mode,color,...compact(script.replace_string)})
  }
}
writeFileSync(new URL('inventory.json',output),JSON.stringify({cases:cases.length,styles:pool.length,byMode:Object.fromEntries(modes.map(m=>[m,cases.filter(c=>c.mode===m).length]))},null,2))
console.log(`DOM audit: ${cases.length} launcher cases / ${pool.length} style sheets`)
if(cases.length!==975 || modes.some(m=>cases.filter(c=>c.mode===m).length!==195))throw Error('Surface matrix inventory drift')
if (process.argv.includes('--dom')) {
  const rows = cases.map(c => {
    const markup = c.styles.map(i=>`<style>${pool[i]}</style>`).join('')+c.shell
    const dom = new JSDOM(markup.replaceAll('var(--lumiverse-font-mono,"Courier New",monospace)', '"Courier New",monospace').replaceAll('var(--lumiverse-font-mono,&quot;Courier New&quot;,monospace)', '&quot;Courier New&quot;,monospace'), {virtualConsole:new VirtualConsole()})
    const e = dom.window.document.querySelector('.rr-surface-launcher-iconized') || dom.window.document.querySelector('summary')
    if (!e) { dom.window.close(); return {...c,styles:undefined,shell:undefined,visible:false,missing:true} }
    const style=dom.window.getComputedStyle(e), icon=e.querySelector('.rr-surface-svg-icon')
    const fields=[...e.children].filter(n=>n.querySelector('i')&&n.matches('[class*=spark],[class*=particle]')).map(n=>({class:n.className,display:dom.window.getComputedStyle(n).display,count:n.querySelectorAll('i').length}))
    const result={family:c.family,id:c.id,mode:c.mode,color:c.color,visible:style.display!=='none'&&style.visibility!=='hidden',style:Object.fromEntries(['display','borderRadius','height','padding','gap','fontSize','fontWeight','lineHeight','letterSpacing'].map(k=>[k,style[k]])),icon:icon?{width:parseFloat(dom.window.getComputedStyle(icon).width),height:parseFloat(dom.window.getComputedStyle(icon).height),marginRight:parseFloat(dom.window.getComputedStyle(icon).marginRight)||0}:null,fields}
    dom.window.close(); return result
  })
  const failures=[]
  for(const row of rows){
    if(row.mode==='inline'){if(row.visible)failures.push({...row,reason:'inline launcher visible'});continue}
    if(!row.visible){failures.push({...row,reason:'launcher missing or hidden'});continue}
    const ref=rows.find(r=>r.id==='Plot Sparks'&&r.mode===row.mode&&r.color===row.color)
    if(ref){const diff=Object.keys(ref.style).filter(k=>row.style[k]!==ref.style[k]);if(JSON.stringify(row.icon)!==JSON.stringify(ref.icon))diff.push('icon');if(diff.length)failures.push({...row,reason:'presentation mismatch',diff})}
    const expected=row.mode==='sparkling'||row.mode==='glass', visible=row.fields.filter(f=>f.display!=='none')
    if(visible.length!==(expected?1:0))failures.push({...row,reason:'wrong sparkle fields'})
  }
  const report={cases:rows.length,failures:failures.length,byMode:Object.fromEntries(modes.map(m=>[m,failures.filter(f=>f.mode===m).length])),references:rows.filter(r=>r.id==='Plot Sparks'),details:failures,rows}
  writeFileSync(new URL('dom-results.json',output),JSON.stringify(report,null,2))
  console.log(JSON.stringify({cases:report.cases,failures:report.failures,byMode:report.byMode,references:report.references.filter(r=>r.color==='realistic'),examples:failures.slice(0,5)},null,2))
  if(failures.length)process.exitCode=1
}
