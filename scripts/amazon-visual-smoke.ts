// @ts-nocheck -- Bun/JSDOM test harness; renderer and Phone modules are strictly typechecked.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {JSDOM} from 'jsdom'
import {AMAZON_SAMPLE,AMAZON_UTILITY} from '../src/amazonDefinition'
import {parseAmazon} from '../src/amazon-contract.mjs'
import {renderAmazonSurface} from '../src/amazonSurface'
import {mountAmazonPhone,amazonNavigation} from '../src/amazonPhoneControls'
import {applyPhoneAppDarkTheme} from '../src/phoneAppPresentation'
import {renderNativeSurfaceMarkup} from '../src/nativeSurfaces'
const dom=new JSDOM('<main></main>',{pretendToBeVisual:true});Object.assign(globalThis,{document:dom.window.document,window:dom.window})
const root=document.querySelector('main').attachShadow({mode:'open'}),snapshot=parseAmazon(AMAZON_SAMPLE),requests=[]
root.innerHTML=renderAmazonSurface(AMAZON_SAMPLE,raw=>{requests.push(raw);return '<span>Owned product media fixture</span>'})
assert.equal(requests.length,1);assert.equal(requests[0],snapshot.products[0].media)
assert(root.querySelector('.amz-query'));assert(root.querySelector('.amz-sidebar'));assert(root.querySelector('.amz-stars').getAttribute('style').includes('94%'));assert.equal(root.querySelector('.amz-price').textContent,'€49.90')
const calls=[],navigation=amazonNavigation();mountAmazonPhone(root,{snapshot,scopeKey:'visual-only'},[],'persona:test',navigation,false,false,command=>calls.push(command))
assert.equal(root.querySelector('.rr-amazon').dataset.mode,'phone');assert.equal(root.querySelector('.amz-top').nextElementSibling.className,'amz-search')
assert.equal(root.querySelectorAll('.amz-phone-nav button').length,4);assert.equal(root.querySelectorAll('.amz-phone-nav svg').length,4)
assert.equal(root.querySelector('.rr-amazon').lastElementChild.className,'amz-phone-nav')
assert(root.querySelector('button[aria-label="Open shopping cart"]'));assert(root.querySelector('button[aria-label="Search"] svg'))
assert.equal(calls.length,0,'Visual rendering cannot mutate shopping state or call a provider')
const unrelated=document.createElement('div');unrelated.className='other-phone-app';root.append(unrelated)
const original=dom.window.getComputedStyle;dom.window.getComputedStyle=()=>({backgroundColor:'rgb(255, 255, 255)',color:'rgb(15, 17, 17)'})
applyPhoneAppDarkTheme(root);dom.window.getComputedStyle=original
assert(!root.querySelector('.rr-amazon [data-reverie-phone-darkened]'),'Amazon brand cannot be recolored')
assert(!root.querySelector('.rr-amazon').hasAttribute('data-reverie-phone-darkened'))
assert.equal(unrelated.dataset.reveriePhoneDarkened,'true','Existing darkening still applies to other apps')
for(const mode of ['Inline','Collapsible']){const script=JSON.parse(readFileSync(`regex-packs/Amazon/Reverie-Amazon-${mode}.json`,'utf8')).scripts[0],html=AMAZON_SAMPLE.replace(new RegExp(script.find_regex,script.flags),script.replace_string);assert(html.includes('amz-resultbar')&&html.includes('amz-query'));assert(!html.includes('Find your next little upgrade'));assert.equal((html.match(/<image_request /g)||[]).length,1)}
assert.equal(AMAZON_UTILITY.replace(/\r\n/g,'\n'),readFileSync('assets/Amazon-Utility.txt','utf8').replace(/\r\n/g,'\n'))
for(const colorMode of ['realistic','primary','glass'])for(const mode of ['inline','plain','collapsible','sparkling','glass','plain-glass']){
  const content=renderNativeSurfaceMarkup(AMAZON_SAMPLE,{definitions:{},activePresetIds:{},rendererMode:'relay',defaultShellMode:mode,colorMode},{chatId:'launcher-fixture',messageId:'launcher-fixture'}).content
  const fragment=JSDOM.fragment(content),launcher=fragment.querySelector('.amz-regex-launcher')
  assert.equal(Boolean(launcher),mode!=='inline',`${mode}: only collapsed presentations have a launcher`)
  assert.equal(fragment.querySelectorAll('.rr-amazon').length,1,`${mode}: catalog is neither lost nor duplicated`)
  assert.equal(fragment.querySelectorAll('[data-rr-surface-icon="core:amazon"]').length,1,`${mode}: Amazon has exactly one shared SVG icon`)
  if(!launcher)continue
  assert(launcher.querySelector(':scope > style[data-reverie-amazon-launcher]'),`${mode}: button styles remain inside the isolated Surface`)
  assert.equal(launcher.dataset.amzPresentation,mode==='collapsible'?'plain':mode)
  assert.equal(launcher.dataset.amzColor,colorMode,'the launcher follows the selected theme without recoloring the catalog')
  assert.equal(launcher.hasAttribute('data-reverie-glass-button'),mode==='glass'||mode==='plain-glass')
  assert.equal(launcher.querySelectorAll(':scope > summary .rr-surface-sparks').length,mode==='glass'||mode==='sparkling'?1:0)
  assert(launcher.querySelector(':scope > summary').textContent.includes('Open Amazon'))
  assert(!launcher.open,`${mode}: launcher starts closed`)
  launcher.open=true;assert(launcher.querySelector('.amz-query'),'opening the button retains the full catalog')
}
console.log('PASS Amazon visual contracts: shared desktop/Regex chrome, mobile header/search + four icon tabs, truthful rating/price, exact media count, isolated brand-theme exemption and unchanged rendering side effects.')
