// @ts-nocheck -- no provider calls; inspect the actual Director message builder.
import assert from 'node:assert/strict'
import { STORYBOARD_DIRECTOR_GUIDANCE, STORYBOARD_BOORU_PARSER_GUIDANCE } from '../src/protocols'
globalThis.spindle = { on() {}, onFrontendMessage() {}, registerInterceptor() {}, registerMacro() {}, registerMessageContentProcessor() {}, permissions: { has: () => true }, log: { info() {}, warn() {}, error() {} } }
const backend = await import('../src/backend')
const settings = backend.normalizeProseIllustratorSettings({ perspectiveMode: 'storyboard', promptFormat: 'danbooru-tags' })
const context = { version: 'relay-planned-2', chatId: 'budget', messageId: 'message', swipeId: 0, maximumIllustrations: 5, maximumCharacters: 8,
  perspectiveMode: 'storyboard', defaultAspectRatio: '4:3', adultMode: false, promptStyle: '',
  subjects: [{ name: 'Mira', identity: ['black hair', 'violet eyes'], current: ['green cardigan'], activeFactIds: ['fact-1'], pinned: [], superseded: [] }],
  paragraphs: [{ index: 0, text: 'Mira holds the folder.\nHer left hand remains flat on the cover.' }],
  referenceAssetIds: ['ref-1'], locationReferenceAssetIds: ['loc-1'], priorIllustrations: [], globalNegativeRequirements: ['bad anatomy'] }
const messages = backend.relayPlannedDirectorMessages(settings, context)
const shared = STORYBOARD_DIRECTOR_GUIDANCE.split(/\n\s*\n/).map(s => s.trim()).filter(s => s && STORYBOARD_BOORU_PARSER_GUIDANCE.includes(s))
for (const paragraph of shared) assert.equal(messages[0].content.split(paragraph).length - 1, 1, 'exact shared Storyboard guidance must not be sent twice')
const custom = { ...settings, promptRegistry: { ...settings.promptRegistry, 'relay-planned.director.system': 'CUSTOM\n\nCUSTOM', 'relay-planned.director.request': '{{characterContextJson}}' } }
const customMessages = backend.relayPlannedDirectorMessages(custom, context)
assert(customMessages[0].content.startsWith('CUSTOM\n\nCUSTOM'), 'do not rewrite saved custom prompt text')
const serializedSubjects = customMessages[1].content.split('\n\n')[0]
assert.equal(serializedSubjects, JSON.stringify(context.subjects), 'runtime JSON must be compact without losing any facts')
assert.deepEqual(JSON.parse(serializedSubjects), context.subjects)
const sourceOnly = backend.relayPlannedDirectorMessages({ ...custom, promptRegistry: { ...custom.promptRegistry, 'relay-planned.director.request': '{{paragraphsJson}}' } }, context)[1].content.split('\n\n')[0]
assert.deepEqual(JSON.parse(sourceOnly), context.paragraphs, 'source text/newlines/indices must remain byte-for-byte equivalent after decoding')
console.log(`PASS Director message budget: no duplicate stock Storyboard paragraphs, lossless compact runtime JSON, custom templates intact; system ${messages[0].content.length} chars, user ${messages[1].content.length} chars. No providers.`)
