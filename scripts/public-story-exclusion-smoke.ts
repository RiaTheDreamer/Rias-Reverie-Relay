// @ts-nocheck -- offline source and built-distribution release boundary.
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
for (const path of ['src/frontend.ts', 'src/backend.ts', 'dist/frontend.js', 'dist/backend.js']) {
  const source = read(path)
  for (const token of ['story-constellations', 'story-reel', 'renderStoryView', 'renderStoryReel', 'handleStoryAction', 'scheduleStoryAnalysis', 'runStoryBackfill', 'story_backfill_status', 'STORY KNOWLEDGE BOUNDARIES', 'sidecar.events.', 'proposeStoryEvents', 'confirmStoryEchoProposal', 'applyStoryKnowledge', 'updateStoryReelOverride']) {
    assert(!source.includes(token), `${path}: private Story feature leaked: ${token}`)
  }
  assert(!source.includes('Private Reverie'), `${path}: private display branding leaked`)
}
for (const path of ['src/storyReel.ts', 'src/storyBackfill.ts', 'src/storyPresentation.ts', 'src/eventConstellationSidecar.ts', 'src/eventConstellationContext.ts']) {
  assert(!existsSync(new URL(`../${path}`, import.meta.url)), `Private Story module shipped: ${path}`)
}
const protocols = read('src/protocols.ts')
assert(!protocols.includes('sidecar.events.'), 'private Story prompts must not appear in the public prompt editor')
const legacyReader = read('src/storyState.ts')
for (const name of ['proposeStoryEvents', 'confirmStoryProposal', 'confirmStoryEchoProposal', 'applyStoryKnowledge', 'resolveStoryKnowledgeConflict', 'storyReelItems', 'updateStoryReelOverride', 'mergeStoryActors']) {
  assert(!legacyReader.includes(`function ${name}`), `Story authoring remains in the legacy phone reader: ${name}`)
}
const frontend = read('src/frontend.ts')
assert(frontend.includes('renderPhonePage()'), 'Phone must remain independently available')
assert(frontend.includes('renderProseIllustrator()'), 'Illustration planning must remain available')
assert(frontend.includes('Storyboard'), 'Storyboard framing must remain available')
for (const id of ["id: 'private-relay'", "id: 'open-private-relay'", "id: 'open-private-relay-surfaces'"]) assert(frontend.includes(id), 'preserve existing public main drawer/action identity: ' + id)
const manifest = JSON.parse(read('spindle.json'))
assert.equal(manifest.name, "Ria's Reverie Relay")
assert.equal(manifest.identifier, 'reverie_relay', 'preserve public main installation identity')
assert.equal(manifest.github, 'https://github.com/RiaTheDreamer/Rias-Reverie-Relay')
console.log('PASS public distribution boundary: Story UI, actions, analyzer, backfill and knowledge injection absent; Phone, Storyboard and illustration planning retained.')
