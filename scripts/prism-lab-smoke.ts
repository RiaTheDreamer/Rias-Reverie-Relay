// @ts-nocheck
import assert from 'node:assert/strict'
import {JSDOM} from 'jsdom'
import {validatePrism,renderPrism,prismSides,PRISM_AXES} from '../src/prismLab'
const actual={provider:'swarm',model:'Anima Turbo',loras:[{name:'test',weight:1}],seed:123,steps:4,cfg:1,width:1280,height:720,sampler:'euler',scheduler:'normal'}
const run={id:'control',image:'images/a.png',imageId:'a',prompt:'Frozen neutral adult scene',negativePrompt:'',actual,variant:'baseline'}
const pair={id:'hands',source:'Ada holds the blue mug in her right hand.',control:run,treatment:{...run,id:'treatment',image:'images/b.png',imageId:'b',variant:'Sightline'}}
const manifest={title:'Prism <test>',blindSeed:'fixed',pairs:[pair]}
assert.deepEqual(validatePrism(manifest),[])
assert(validatePrism({...manifest,pairs:[{...pair,control:{...run,actual:{...actual,seed:-1}},treatment:{...pair.treatment,actual:{...actual,seed:-1}}}]}).some(e=>e.includes('numeric generation evidence')),'two random/unknown seeds are not a controlled comparison')
assert.deepEqual(prismSides(pair,'fixed'),prismSides(pair,'fixed'))
assert(validatePrism({...manifest,pairs:[{...pair,treatment:{...pair.treatment,actual:{...actual,seed:999}}}]}).some(e=>e.includes('uncontrolled seed')))
assert.deepEqual(validatePrism({...manifest,pairs:[{...pair,varied:['seed'],treatment:{...pair.treatment,actual:{...actual,seed:999}}}]}),[])
assert(validatePrism({...manifest,pairs:[{...pair,treatment:{...pair.treatment,image:'https://tracker.invalid/a.png'}}]}).length)
assert(validatePrism({...manifest,pairs:[{...pair,treatment:{...pair.treatment,image:'../a.png'}}]}).length)
assert(validatePrism({...manifest,pairs:[{...pair,treatment:{...pair.treatment,imageId:'a'}}]}).length)
const html=renderPrism({...manifest,title:'</title><script>evil()</script>',pairs:[{...pair,source:'<img src=x onerror=evil()>',treatment:{...pair.treatment,prompt:'</pre><script>evil()</script>'}}]})
const dom=new JSDOM(html)
assert.equal(dom.window.document.querySelectorAll('script').length,2,'escaped evidence must not become executable HTML')
assert.equal(dom.window.document.querySelectorAll('select').length,PRISM_AXES.length*2)
assert.equal(dom.window.document.querySelectorAll('option[value="na"]').length,14)
assert.equal(dom.window.document.querySelectorAll('details[open]').length,0,'treatments start blinded')
assert.equal(dom.window.document.querySelector('h1').textContent,'</title><script>evil()</script> · Prism Lab')
console.log('Prism: matched parameters, deliberate boundaries, distinct evidence, stable blinding, 7 quality axes, unscored/NA and escaped offline HTML passed.')
