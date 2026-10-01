// @ts-nocheck -- deterministic offline package and runtime label gate.
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { r45SurfaceAuthorityPack, r45LegacyXmlSurfaceAuthorityPack } from '../src/r45SurfaceAuthority'
import { narrativeRegexScripts } from '../src/narrativeRegexAssets'

let count = 0
for (const category of ['Core', 'Narrative']) {
  for (const filename of readdirSync(`regex-packs/${category}`).filter(name => name.endsWith('.json'))) {
    const pack = JSON.parse(readFileSync(`regex-packs/${category}/${filename}`, 'utf8'))
    for (const script of pack.scripts || pack.regex_scripts || []) {
      assert.match(script.name, new RegExp(`^${category} - .+? - .+ - (Inline|Button)$`), `${filename}/${script.script_id}`)
      assert(!/R4\.5|FINAL|BULLETPROOF|[\[\]•]| -  - /.test(script.name), script.name)
      if (script.folder) assert.equal(script.folder, `${category} / ${script.name.split(' - ')[1]}`, script.name)
      count++
    }
  }
}
for (const presentation of ['inline', 'plain', 'sparkling', 'glass'] as const) {
  const suffix = presentation === 'inline' ? 'Inline' : 'Button'
  for (const color of ['realistic', 'primary', 'glass'] as const) {
    for (const pack of [r45SurfaceAuthorityPack(presentation, color), r45LegacyXmlSurfaceAuthorityPack(presentation, color)]) {
      assert(pack.scripts.every(script => script.name?.endsWith(` - ${suffix}`)), `${presentation}/${color}: wrong Core presentation label`)
      for (const part of ['UI Shell', 'Carousel Slide', 'Carousel Media', 'Comment Reply', 'Rich Comment']) {
        assert(pack.scripts.some(script => script.name === `Core - Instagram - ${part} - ${suffix}`), `Instagram ${part} label missing`)
      }
    }
  }
}
for (const variant of ['inline', 'plain-button', 'sparkle-button', 'glass', 'plain-glass'] as const) {
  const suffix = variant === 'inline' ? 'Inline' : 'Button'
  assert(narrativeRegexScripts(variant).every(script => script.name.endsWith(` - ${suffix}`)), `${variant}: wrong Narrative presentation label`)
}
assert(!existsSync('regex-packs/r45') && !existsSync('regex-packs/narrative-final'), 'Retired package directories returned')
console.log(`Regex labels smoke passed: ${count} packaged scripts, component-specific Instagram labels, and Core/Narrative runtime presentation names.`)
