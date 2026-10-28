// @ts-nocheck
import assert from 'node:assert/strict'
import {readPortraitAvatar} from '../src/portraitInsightFrontend'
globalThis.window={location:{origin:'http://127.0.0.1:7861'}}
let calls=0
const fetcher=async(url,options)=>{calls++;assert.equal(options.credentials,'same-origin');assert.equal(options.redirect,'error');return new Response(new Uint8Array([137,80,78,71,13,10,26,10,1,2,3,4]),{headers:{'content-type':'image/png'}})}
assert(await readPortraitAvatar('/api/images/avatar',fetcher));assert.equal(calls,1)
assert(await readPortraitAvatar('/api/v1/images/avatar',fetcher));assert.equal(calls,2)
assert.equal(await readPortraitAvatar('https://elsewhere.invalid/api/images/avatar',fetcher),null)
assert.equal(await readPortraitAvatar('/api/settings',fetcher),null)
assert.equal(await readPortraitAvatar('/api/images/../../settings',fetcher),null)
assert.equal(calls,2,'non-avatar URLs must never reach fetch')
assert.equal(await readPortraitAvatar('/api/images/avatar',async()=>new Response('text',{headers:{'content-type':'text/html'}})),null)
assert.equal(await readPortraitAvatar('/api/images/avatar',async()=>new Response('',{headers:{'content-type':'image/png','content-length':'9999999'}})),null)
assert.equal(await readPortraitAvatar('/api/images/avatar',async()=>{throw Error('timeout')}),null)
console.log('Portrait client: same-origin avatar-only fetch, no redirects, authenticated bounded request, MIME/size/failure handling passed.')
