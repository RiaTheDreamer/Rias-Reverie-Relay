// @ts-nocheck -- offline deterministic feature regression.
import assert from 'node:assert/strict'
import { guardSightline, chooseSceneFlow, validDreamcutFocus } from '../src/sightline'

const cases = [
  ['Ada plants both feet flat on the floor.', 'portrait, Ada seated', 'full body'],
  ['Ada rests her palms on her thighs.', 'waist-up, Ada seated', 'knees-up'],
  ['Ada grips the mug in her right hand.', 'close-up of her face, Ada grips the mug', 'medium shot'],
  ['Ada smiles at Ben.', 'from behind, portrait, Ada smiles', 'three-quarter view'],
] as const
for (const [source, prompt, required] of cases) {
  const checked = guardSightline(prompt, source)
  assert(checked.prompt.includes(required), checked.prompt)
  assert(checked.notes.length)
  assert.equal(guardSightline(checked.prompt, source).prompt, checked.prompt, 'idempotent camera correction')
  assert.equal(guardSightline(prompt, source, false).prompt, prompt)
}
assert.equal(guardSightline('portrait, Ada smiles', 'Ada owns boots.').notes.length, 0, 'wardrobe is not an action')
assert.equal(guardSightline('portrait, Ada smiles', '"Put your feet on the floor," Ben says.').notes.length, 0, 'dialogue is not performed action')
assert.equal(guardSightline('from behind, Ada smiles', 'From behind, Ada smiles.').prompt, 'from behind, Ada smiles', 'source camera wins')
assert.equal(guardSightline('close-up, Ada holds a mug', 'Ada grips a mug.', true, true).prompt.includes('medium_shot'), true)
assert.equal(chooseSceneFlow('Ada holds a cup.', 1, undefined), 'blocking-fidelity')
assert.equal(chooseSceneFlow('The brass key lies on the table.', 0, { kind: 'object', quote: 'brass key' }), 'dreamcut')
assert.equal(chooseSceneFlow('Ada waits by the window.', 1, { kind: 'object', quote: 'window' }), 'scene-snapshot')
assert.equal(validDreamcutFocus({ kind: 'object', quote: 'red key' }, 'The blue key lies on the table.'), false)
assert.equal(validDreamcutFocus({ kind: 'object', quote: 'blue key' }, 'The blue key lies on the table.'), true)
console.log('Sightline: action visibility, owner-preserving camera repair, idempotence, dialogue/wardrobe exclusions, source camera, tags and Scene Flow routing passed.')
