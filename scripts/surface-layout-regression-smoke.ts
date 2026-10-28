// @ts-nocheck -- renderer/CSS regressions in Bun/jsdom; pixel geometry requires a browser.
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { renderNativeSurfaceMarkup, lifecycleRuntimeCss } from '../src/nativeSurfaces'
import { completeSurfaceSpecs } from '../src/surfaceXml'
import { SHIPPED_SURFACE_SPECS } from '../src/shippedSurfaceDefinitions'
import { regexSurfaceParityScripts } from '../src/regexSurfaceParity'
const specs = completeSurfaceSpecs(SHIPPED_SURFACE_SPECS)
const studio = { definitions: {}, activePresetIds: {}, defaultShellMode: 'inline', colorMode: 'realistic' } as any
const lifecycle = new JSDOM(`<style>${lifecycleRuntimeCss()}</style>`).window.document
const rules = [...lifecycle.styleSheets].flatMap(sheet => [...sheet.cssRules]) as any[]
assert(rules.some(rule => rule.selectorText === '.rrl-card' && rule.style.position === 'relative'), 'An absolute lifecycle status badge needs its own media card as its containing block')
for (const shell of ['inline', 'plain', 'sparkling', 'glass'] as const) {
  for (const id of ['public-bulletin', 'music-player']) {
    const spec = specs.find(spec => spec.id === id)!
    const markup = id === 'music-player' ? spec.sampleXml.replace('Night Signal', 'Track_089_JAE_0340_'.repeat(12)).replace('Afterglow', 'APEX PRIVATE SERVER — FOR REHEARSAL '.repeat(6)) : spec.sampleXml
    const { content } = renderNativeSurfaceMarkup(markup, { ...studio, defaultShellMode: shell }, { chatId: 'layout', messageId: `${id}-${shell}`, swipeId: 0, autoGenerate: false })
    const document = new JSDOM(content).window.document
    const card = document.querySelector('.rrl-card')!
    assert.equal(card.querySelector('.rrl-main')?.parentElement, card, `${id}/${shell}: status stays owned by the media card`)
    const emittedRules = [...document.styleSheets].flatMap(sheet => [...sheet.cssRules]) as any[]
    assert(emittedRules.some(rule => rule.selectorText === '.rrl-card' && rule.style.position === 'relative'), `${id}/${shell}: emitted lifecycle CSS must retain the status containing block`)
    if (id === 'music-player') {
      const css = [...document.styleSheets].flatMap(sheet => [...sheet.cssRules]).map(rule => rule.cssText).join('\n')
      assert(/minmax\(0,\s*1fr\)/.test(css), 'Now Playing text track must be allowed to shrink below its long title width')
      assert(/\.rrsp-meta[^{}]*\{[^}]*min-width:\s*0/.test(css), 'Track metadata must not impose an intrinsic minimum width')
      assert(/overflow-wrap:\s*anywhere/.test(css), 'Long underscore-separated track names must wrap')
      assert(css.includes('container-type: inline-size') && css.includes('@container'), 'Layout follows the actual chat/phone card width, including narrow panes on desktop')
      assert(document.querySelector('.rrsp-meta h2')?.textContent?.includes('Track_089_JAE_0340_'), 'Responsive layout must preserve the full title')
    }
  }
}
for (const source of ['bracket', 'legacy-xml'] as const) {
  const players = regexSurfaceParityScripts('plain', 'realistic', source).filter(script => script.replace.includes('rrsp-card'))
  assert(players.length, `${source}: the registered Now Playing renderer exists`)
  for (const player of players) assert(player.replace.includes('data-reverie-player-layout'), `${source}: installed Regex templates must receive the same responsive layout as native rendering`)
}
console.log('Surface layout regressions passed: owned status badge and responsive long-track Now Playing in four shells (renderer/CSS, not pixel geometry)')
