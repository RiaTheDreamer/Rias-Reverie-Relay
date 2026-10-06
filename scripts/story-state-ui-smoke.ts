// @ts-nocheck -- Structural UI and responsive guard checks; runtime boot is covered separately.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const [frontend, backend] = await Promise.all([
  readFile(new URL('../src/frontend.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/backend.ts', import.meta.url), 'utf8'),
])
for (const token of ["'story-constellations'", "'phone'", "'story-reel'", 'renderStoryView()', 'renderPhonePage()', 'renderStoryReel()', 'renderStoryEvent(', 'Link as Event Echo', 'Confirm Revision & Supersede', 'Go to Source', 'merge-actors', 'link-phone-asset', 'Link Echo Asset', 'Show Older Proposals', 'Show Older Events', 'Load Earlier Records', 'pendingStoryEventNavigation', 'Confirmed Echo that explains character knowledge']) {
  assert(frontend.includes(token) || backend.includes(token), `Story UI action is missing: ${token}`)
}
assert(frontend.includes('dg-story-constellation') && frontend.includes('grid-template-columns:repeat(2,minmax(0,1fr))'), 'constellation actor layout must stay within narrow side panels')
assert(frontend.includes('Open Constellation') && frontend.includes('dg-story-lines line[data-belief="suspects"]') && frontend.includes('dg-story-lines line[data-belief="misinformed"]'), 'populated Event detail needs a central node and non-color-only knowledge links')
assert(frontend.includes('min-width:0') && frontend.includes('overflow-wrap:anywhere'), 'Story cards must constrain long prose and identities')
assert(frontend.includes('dg-story-merge summary { cursor:pointer'), 'actor merge disclosure must remain keyboard-operable native details')
assert(frontend.includes('prefers-reduced-motion: reduce') && frontend.includes('activeTab.startsWith(\'story-\')'), 'story panel must honor reduced motion and shared tab routing')
assert(backend.includes("if (!config.storyConstellationsEnabled) return finish({ status: 'skipped', reason: 'feature-off' })") && backend.includes("case 'story_action'"), 'analysis is feature-gated and user actions route through backend')
assert(frontend.includes('Choose Parser Connection') && frontend.includes('terminal ·'), 'Story UI must expose missing analyzer configuration and honest backfill accounting')
console.log('PASS Story UI structure: Constellations/Phones/Reel routes, narrow layout guards, keyboard disclosure, reduced-motion')
