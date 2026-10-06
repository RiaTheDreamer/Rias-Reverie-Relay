import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

// Story is now explicitly authorized for Private Staging. Verify the complete
// subsystem and its scene contract, not the former exclusion-only release.
for (const path of ['src/storyState.ts', 'src/storyReel.ts', 'src/storyBackfill.ts', 'src/livingCharacterPhone.ts', 'src/eventConstellationContext.ts', 'src/eventConstellationSidecar.ts', 'src/storyPresentation.ts', 'src/illustrationSceneContract.ts']) {
  assert.equal(existsSync(path), true, `Story subsystem missing: ${path}`)
}
for (const path of ['src/backend.ts', 'src/frontend.ts', 'dist/backend.js', 'dist/frontend.js']) {
  const source = readFileSync(path, 'utf8')
  assert(source.includes('storyConstellations'), `Story state contract missing from ${path}`)
}
assert(readFileSync('src/contracts.ts', 'utf8').includes("'persona-pov' | 'storyboard'"), 'both planning modes must retain the shared Storyboard framing type')
const frontend = readFileSync('src/frontend.ts', 'utf8')
assert.match(frontend, /id: 'story', icon: '✺', label: 'Story'/, 'Story navigation must be visible')
for (const view of ['renderStoryView()', 'renderPhonePage()', 'renderStoryReel()']) assert(frontend.includes(view), `View missing: ${view}`)
assert.match(frontend,/story: \[\['story-constellations', 'Constellations'\], \['story-reel', 'Story Reel'\]\]/,'Phone must no longer live in Story navigation')
assert.match(frontend, /Storyboard/, 'Storyboard illustration framing must remain available')
const backend = readFileSync('src/backend.ts', 'utf8')
for (const setting of ['storyConstellationsEnabled', 'autoConfirmStoryEvents', 'injectStoryEventContext']) assert(backend.includes(`${setting}: false`), `${setting} must remain opt-in`)
assert.match(backend, /const STATE_SCHEMA_VERSION = 37/, 'Story release must preserve its reviewed schema migration')
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
assert(pkg.scripts['smoke:hygiene'].includes('smoke:story-state'), 'full release suite must retain all Story acceptance gates')
assert(pkg.scripts['smoke:phase6'].includes('smoke:scene-contract'), 'scene contract must be integrated into normal release validation')
for (const path of ['docs/NEXT-UPDATE-FIXES.md', 'docs/EVENT-CONSTELLATIONS-COMPLETION-REPORT.md', 'docs/DREAM-REMOTE-DESIGN-HANDOVER-20260926.md']) assert.equal(existsSync(path), false, `Internal maintainer document must stay local: ${path}`)
console.log('Staging scope passed: complete Story tab and shared Storyboard scene contract included; opt-in defaults, schema migration, release gates, and local-only docs retained.')
