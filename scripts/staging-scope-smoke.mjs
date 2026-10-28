import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
await import('./public-story-exclusion-smoke.ts')
const read = path => readFileSync(path, 'utf8')
assert(read('src/contracts.ts').includes("'persona-pov' | 'storyboard'"), 'shared Storyboard framing remains available')
assert.match(read('src/backend.ts'), /const STATE_SCHEMA_VERSION = 37/, 'legacy data schema remains readable')
const pkg = JSON.parse(read('package.json'))
assert(pkg.scripts['smoke:phase6'].includes('smoke:scene-contract'), 'scene validation remains in the full suite')
assert(pkg.scripts['smoke:hygiene'].includes('smoke:public-distribution'), 'public exclusion must gate releases')
for (const path of ['docs/NEXT-UPDATE-FIXES.md', 'docs/EVENT-CONSTELLATIONS-COMPLETION-REPORT.md', 'docs/DREAM-REMOTE-DESIGN-HANDOVER-20260926.md']) assert(!existsSync(path), 'Private maintainer document shipped: '+path)
console.log('PASS public scope: Story feature excluded, legacy phone data compatible, illustration and public-distribution gates retained.')
