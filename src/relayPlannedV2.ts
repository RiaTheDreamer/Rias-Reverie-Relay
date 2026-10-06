import type { ProseIllustrationPlan, ProsePromptComposition } from './contracts'
import { normalizeBooruTagPrompt } from './booruTags'
import { normalizeIllustrationViewWording } from './illustrationViewWording'
import { buildIllustrationSceneContract, enforceIllustrationSceneContract, ownedSceneRequirementPresent, sceneActionTagRepairPreservesFacts, type IllustrationSceneContract } from './illustrationSceneContract'

export const RELAY_PLANNED_V2 = 'relay-planned-2' as const

export const RELAY_PLANNED_ASPECT_RATIOS = ['1:1', '4:3', '3:4', '16:9', '9:16', '4:5'] as const

export type RelayPlannedParagraph = { index: number; text: string; sourceText?: string }

export type RelayPlannedSubjectState = {
  name: string
  role?: string
  identity: string[]
  current: string[]
  pinned: string[]
  superseded: string[]
  activeFactIds?: string[]
}

export type RelayPlannedContext = {
  version: typeof RELAY_PLANNED_V2
  chatId: string
  messageId: string
  swipeId: number
  maximumIllustrations: number
  maximumCharacters: number
  maximumPromptCharacters: number
  perspectiveMode: string
  defaultAspectRatio: string
  promptStyle: string
  promptFormat?: 'natural-language' | 'danbooru-tags'
  adultMode: boolean
  paragraphs: RelayPlannedParagraph[]
  latestUserVisualContext?: string
  subjects: RelayPlannedSubjectState[]
  referenceAssetIds: string[]
  locationReferenceAssetIds: string[]
  priorIllustrations: Array<Record<string, unknown>>
  globalNegativeRequirements: string[]
}

export function previousSequenceShotContext(
  plans: ProseIllustrationPlan[],
  chatId: string,
  messageId: string,
  perspectiveMode: string,
): Record<string, unknown> | null {
  if (perspectiveMode !== 'sequence') return null
  const previous = plans
    .filter(plan => plan.chatId === chatId && plan.messageId !== messageId && plan.status === 'generated')
    .sort((a, b) => b.planningTimestamp - a.planningTimestamp)[0]
  if (!previous) return null
  const composition = previous.promptComposition
  return {
    scope: 'previous-completed-shot',
    planId: previous.planId,
    title: previous.title,
    namedSubjects: composition?.namedSubjects || previous.namedSubjects,
    sceneBrief: (composition?.sceneBrief || previous.sceneBrief).slice(0, 900),
    framing: (composition?.framing || '').slice(0, 900),
    location: composition?.location || previous.location,
    importantProps: (composition?.importantProps || previous.importantProps).slice(0, 12),
  }
}

export type RelayPlannedSubjectDirective = {
  name: string
  role: string
  appearanceOverrides: string[]
  attireOverrides: string[]
  temporaryTraits: string[]
  expression: string
  pose: string
  action: string
  gaze: string
  contact: string
}

export type RelayPlannedIllustration = {
  rank: number
  title: string
  reason: string
  anchor: { paragraphIndex: number; insertionSide: 'before' | 'after' | 'end'; anchorExcerpt: string }
  aspectRatio: string
  expectedPeopleCount: number
  namedSubjects: string[]
  omittedSubjects: string[]
  subjectDirectives: RelayPlannedSubjectDirective[]
  composition: {
    shotType: string
    cameraAngle: string
    framing: string
    blocking: string
    foreground: string
    background: string
    location: string
    timeOfDay: string
    lighting: string
    mood: string
    importantProps: string[]
    backgroundPeople: string
  }
  promptCore: string
  /** Director-authored visual concepts. Used only in Booru Tag Mode. */
  booruTags?: string[]
  negativeCore: string
  referenceAssetIds: string[]
  locationReferenceAssetIds: string[]
}

export type RelayPlannedValidationIssue = {
  code: string
  message: string
  repair: 'local' | 'ambiguous' | 'fatal'
}

export type RelayPlannedValidatedIllustration = {
  illustration: RelayPlannedIllustration
  issues: RelayPlannedValidationIssue[]
  requiresRepair: boolean
  rejected: boolean
}

export type RelayPlannedValidationResult = {
  shouldIllustrate: boolean
  reason: string
  illustrations: RelayPlannedValidatedIllustration[]
  warnings: string[]
}

export type RelayPlannedCompiledPrompt = {
  positivePrompt: string
  negativePrompt: string
  warnings: string[]
  identityFragments: string[]
  currentStateFragments: string[]
  sceneContract?: IllustrationSceneContract
}

export function relayPlannedSceneContract(illustration: RelayPlannedIllustration, context: RelayPlannedContext): IllustrationSceneContract {
  const paragraph = context.paragraphs.find(row => row.index === illustration.anchor.paragraphIndex)
  return buildIllustrationSceneContract({
    sourceParagraph: paragraph?.sourceText || paragraph?.text || '',
    anchorExcerpt: illustration.anchor.anchorExcerpt,
    actors: illustration.subjectDirectives.map(row => {
      const subject = context.subjects.find(subject => key(subject.name) === key(row.name))
      return { name: row.name, identity: subject?.identity || [], current: subject?.current || [], action: row.action, contact: row.contact }
    }),
  })
}

/** Synthetic slot dispatch and later regeneration must use the same source as
 * the plan/compiler. Unversioned output or a mismatched excerpt is not proof.
 */
export function relayPlannedAuthoritativeParagraph(composition: ProsePromptComposition | undefined, selectedExcerpt: string): string {
  const raw = composition?.rawOutput
  const contract = raw?.sceneContract as Partial<IllustrationSceneContract> | undefined
  const excerpt = selectedExcerpt.trim().replace(/\s+/g, ' ')
  if (raw?.plannerVersion !== RELAY_PLANNED_V2 || contract?.version !== 'scene-contract-1'
    || typeof contract.sourceParagraph !== 'string' || !excerpt) return ''
  return contract.sourceParagraph.replace(/\s+/g, ' ').includes(excerpt) ? contract.sourceParagraph : ''
}

/** Action-only repair cannot buy its way out by selecting an easier anchor or
 * changing cast/wardrobe. Other structural repairs retain their existing path.
 */
export function sceneOnlyRepairPreservesPlan(original: RelayPlannedIllustration, repaired: RelayPlannedIllustration): boolean {
  const fixed = (row: RelayPlannedIllustration) => {
    const { promptCore, booruTags, ...rest } = row
    return rest
  }
  return JSON.stringify(fixed(original)) === JSON.stringify(fixed(repaired))
    && sceneActionTagRepairPreservesFacts(original.booruTags, repaired.booruTags)
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
}

function list(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map(text).filter(Boolean))]
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function integer(value: unknown, fallback = 0): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.trunc(numeric) : fallback
}

function parseJsonObject(raw: string): Record<string, unknown> {
  const clean = String(raw || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  const start = clean.indexOf('{')
  const end = clean.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('Illustration Director returned no JSON object.')
  const parsed = JSON.parse(clean.slice(start, end + 1))
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Illustration Director result must be a JSON object.')
  return parsed as Record<string, unknown>
}

function normalizeDirective(value: unknown): RelayPlannedSubjectDirective {
  const raw = record(value)
  return {
    name: text(raw.name),
    role: text(raw.role) || 'character',
    appearanceOverrides: list(raw.appearanceOverrides),
    attireOverrides: list(raw.attireOverrides),
    temporaryTraits: list(raw.temporaryTraits),
    expression: text(raw.expression),
    pose: text(raw.pose),
    action: text(raw.action),
    gaze: text(raw.gaze),
    contact: text(raw.contact),
  }
}

function normalizeIllustration(value: unknown, context: RelayPlannedContext, ordinal: number): RelayPlannedIllustration {
  const raw = record(value)
  const anchor = record(raw.anchor)
  const composition = record(raw.composition)
  const side = text(anchor.insertionSide)
  return {
    rank: Math.max(1, integer(raw.rank, ordinal + 1)),
    title: text(raw.title) || `Illustration ${ordinal + 1}`,
    reason: text(raw.reason),
    anchor: {
      paragraphIndex: integer(anchor.paragraphIndex, -1),
      insertionSide: side === 'before' || side === 'end' ? side : 'after',
      anchorExcerpt: text(anchor.anchorExcerpt),
    },
    aspectRatio: text(raw.aspectRatio) || context.defaultAspectRatio,
    expectedPeopleCount: Math.max(0, integer(raw.expectedPeopleCount)),
    namedSubjects: list(raw.namedSubjects),
    omittedSubjects: list(raw.omittedSubjects),
    subjectDirectives: Array.isArray(raw.subjectDirectives) ? raw.subjectDirectives.map(normalizeDirective) : [],
    composition: {
      shotType: text(composition.shotType),
      cameraAngle: text(composition.cameraAngle),
      framing: text(composition.framing),
      blocking: text(composition.blocking),
      foreground: text(composition.foreground),
      background: text(composition.background),
      location: text(composition.location),
      timeOfDay: text(composition.timeOfDay),
      lighting: text(composition.lighting),
      mood: text(composition.mood),
      importantProps: list(composition.importantProps).slice(0, 12),
      backgroundPeople: text(composition.backgroundPeople),
    },
    promptCore: text(raw.promptCore),
    booruTags: list(raw.booruTags),
    negativeCore: text(raw.negativeCore),
    referenceAssetIds: list(raw.referenceAssetIds),
    locationReferenceAssetIds: list(raw.locationReferenceAssetIds),
  }
}

function key(value: string): string {
  return text(value).replace(/_/g, ' ').toLocaleLowerCase()
}

const STORYBOARD_PROP_STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'from', 'by',
  'one', 'two', 'three', 'single', 'same', 'central', 'important', 'main', 'visible', 'scene',
  'image', 'moment', 'shot', 'still', 'view', 'crop', 'camera', 'portrait', 'macro', 'detail',
  'close', 'closeup', 'close-up', 'tight', 'framing', 'foreground', 'background', 'focus',
  'soft', 'softly', 'blurred', 'lit', 'lighting', 'complete', 'unbroken', 'circular', 'raised',
  'solid', 'small', 'tiny', 'large', 'silver', 'coated', 'black', 'white', 'red', 'blue', 'green',
  'yellow', 'cyan', 'dark', 'bright', 'graphite', 'optical', 'carbon', 'textured', 'texture',
])

const STORYBOARD_PROP_INTERACTION_ACTION = /\b(?:pick(?:s|ed|ing)?\s+up|hold(?:s|ing)?|held|grip(?:s|ped|ping)?|carry|carries|carried|carrying|lift(?:s|ed|ing)?|take(?:s|n|ing)?|took|put|place(?:s|d|ing)?|set(?:s|ting)?\s+down|touch(?:es|ed|ing)?|turn(?:s|ed|ing)?|rotat(?:e|es|ed|ing)|move(?:s|d|ing)?|slide(?:s|d|ing)?|push(?:es|ed|ing)?|pull(?:s|ed|ing)?|reach(?:es|ed|ing)?\s+(?:for|toward|towards)|write(?:s|ing)?|wrote|draw(?:s|ing)?|drew|mark(?:s|ed|ing)?|trace(?:s|d|ing)?|hand(?:s|ed|ing)?|pass(?:es|ed|ing)?|align(?:s|ed|ing)?|adjust(?:s|ed|ing)?|press(?:es|ed|ing)?|tap(?:s|ped|ping)?|handle(?:s|d|ing)?)\b/i
const STORYBOARD_EXPLICIT_AUTONOMY = /\b(?:by itself|on its own|self[- ](?:forming|moving|writing)|(?:unknown|unexplained) (?:source|cause|mechanism)|source (?:is )?unknown|without (?:a|any|the) (?:visible )?(?:person|hand|tool|mechanism)|no (?:visible )?(?:person|hand|tool|mechanism) (?:is )?(?:present|involved|visible))\b/i

function storyboardVisiblePropActors(illustration: RelayPlannedIllustration, context: RelayPlannedContext): Array<{ name: string; paragraphIndex: number }> {
  if (context.perspectiveMode !== 'storyboard' || !illustration.composition.importantProps.length) return []
  const anchor = context.paragraphs.find(row => row.index === illustration.anchor.paragraphIndex)
  if (anchor && STORYBOARD_EXPLICIT_AUTONOMY.test(anchor.text)) return []

  const propTokenGroups = illustration.composition.importantProps.map(prop => key(prop)
    .match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) || [])
    .map(tokens => tokens.filter(token => token.length > 3 && !STORYBOARD_PROP_STOP_WORDS.has(token)))
    .filter(tokens => tokens.length > 0)
  if (!propTokenGroups.length) return []

  const nearby = context.paragraphs.filter(row => Math.abs(row.index - illustration.anchor.paragraphIndex) <= 2)
  const matches: Array<{ name: string; paragraphIndex: number }> = []
  const subjects = context.subjects.filter(subject => key(subject.role || 'character') !== 'animal')
  for (const paragraph of nearby) {
    // A paragraph can contain several actors doing unrelated things. Bind the
    // verb to its nearest preceding named subject, not every name in the prose.
    // Unknown/pronominal owners remain unproven; this heuristic must not invent
    // cast members. Coordinated subjects (A and B lift...) retain both owners.
    for (const sentence of key(paragraph.text).split(/[.!?](?:\s+|$)|[;\n]+/)) {
      const sentenceTokens = new Set(sentence.match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) || [])
      if (!propTokenGroups.some(tokens => tokens.filter(token => sentenceTokens.has(token)).length >= Math.min(2, tokens.length))) continue
      const nameMentions = subjects.flatMap(subject => {
        const escapedName = key(subject.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        if (!escapedName) return []
        const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapedName}(?![\\p{L}\\p{N}])`, 'gu')
        return [...sentence.matchAll(pattern)].map(match => ({ name: subject.name, start: match.index!, end: match.index! + match[0].length }))
      }).sort((left, right) => left.start - right.start)
      for (const action of sentence.matchAll(new RegExp(STORYBOARD_PROP_INTERACTION_ACTION.source, 'gi'))) {
        const actionPrefix = sentence.slice(Math.max(0, action.index! - 48), action.index)
        if (/\b(?:not|never|without|doesn't|didn't|cannot|can't|couldn't|wouldn't|won't)(?:\s+\w+){0,3}\s*$/i.test(actionPrefix)) continue
        const preceding = nameMentions.filter(mention => mention.end <= action.index!)
        const actor = preceding.at(-1)
        if (!actor) continue
        if (/\b(?:she|he|they)\b/.test(sentence.slice(actor.end, action.index))) continue
        if (/\b(?:at|toward|towards|beside|behind|about|with)\s*$/.test(sentence.slice(0, actor.start))) continue
        const actors = [actor]
        for (let index = preceding.length - 2; index >= 0; index--) {
          const earlier = preceding[index]
          const next = actors[0]
          if (!/^(?:\s*(?:,|and|&|both)\s*)+$/.test(sentence.slice(earlier.end, next.start))) break
          actors.unshift(earlier)
        }
        for (const owner of actors) matches.push({ name: owner.name, paragraphIndex: paragraph.index })
      }
    }
  }
  return matches.filter((row, index, rows) => rows.findIndex(other => key(other.name) === key(row.name)) === index)
}

function overlapScore(left: RelayPlannedIllustration, right: RelayPlannedIllustration): number {
  const subjectsA = new Set(left.namedSubjects.map(key))
  const subjectsB = new Set(right.namedSubjects.map(key))
  const intersection = [...subjectsA].filter(name => subjectsB.has(name)).length
  const union = new Set([...subjectsA, ...subjectsB]).size || 1
  let score = intersection / union
  if (key(left.composition.location) === key(right.composition.location)) score += 0.25
  if (key(left.composition.shotType) === key(right.composition.shotType)) score += 0.25
  if (left.anchor.paragraphIndex === right.anchor.paragraphIndex) score += 0.5
  return score
}

export function validateRelayPlannedDirectorResult(rawText: string, context: RelayPlannedContext): RelayPlannedValidationResult {
  const parsed = parseJsonObject(rawText)
  const overallReason = text(parsed.reason)
  if (!Array.isArray(parsed.illustrations)) throw new Error('Illustration Director JSON must include an illustrations array.')
  const requested = parsed.illustrations
    .slice(0, Math.max(0, context.maximumIllustrations))
    .map((row, index) => normalizeIllustration(row, context, index))
  const allowedSubjects = new Map(context.subjects.map(subject => [key(subject.name), subject]))
  const allowedRefs = new Set(context.referenceAssetIds)
  const allowedLocationRefs = new Set(context.locationReferenceAssetIds)
  const accepted: RelayPlannedValidatedIllustration[] = []
  const warnings: string[] = []

  for (const illustration of requested) {
    const issues: RelayPlannedValidationIssue[] = []
    const paragraph = context.paragraphs.find(row => row.index === illustration.anchor.paragraphIndex)
    if (!paragraph) issues.push({ code: 'anchor-missing', message: `Paragraph ${illustration.anchor.paragraphIndex} does not exist.`, repair: 'ambiguous' })
    else if (!illustration.anchor.anchorExcerpt) {
      illustration.anchor.anchorExcerpt = paragraph.text.slice(0, 180).trim()
      issues.push({ code: 'anchor-excerpt-filled', message: 'Relay filled the omitted anchor excerpt from the authoritative paragraph.', repair: 'local' })
    } else if (!key(paragraph.text).includes(key(illustration.anchor.anchorExcerpt))) {
      issues.push({ code: 'anchor-excerpt-mismatch', message: 'The anchor excerpt is not present in the authoritative paragraph.', repair: 'ambiguous' })
    }

    const unknownSubjects = illustration.namedSubjects.filter(name => !allowedSubjects.has(key(name)))
    if (unknownSubjects.length) issues.push({ code: 'unknown-subject', message: `Unknown visible subject(s): ${unknownSubjects.join(', ')}.`, repair: 'ambiguous' })
    if (context.maximumCharacters > 0 && illustration.namedSubjects.length > context.maximumCharacters) {
      issues.push({ code: 'character-limit', message: `The shot names ${illustration.namedSubjects.length} subjects; the limit is ${context.maximumCharacters}.`, repair: 'ambiguous' })
    }
    if (context.perspectiveMode === 'solo-scene' && (illustration.namedSubjects.length !== 1 || illustration.expectedPeopleCount !== 1 || illustration.composition.backgroundPeople)) {
      issues.push({ code: 'solo-scene-cast', message: 'Character Only requires exactly one visible person and no background people.', repair: 'ambiguous' })
    }
    if (context.perspectiveMode === 'storyboard') {
      const missingPropActors = storyboardVisiblePropActors(illustration, context)
        .filter(row => !illustration.namedSubjects.some(name => key(name) === key(row.name)))
      if (missingPropActors.length) {
        const names = [...new Set(missingPropActors.map(row => row.name))]
        const paragraphs = [...new Set(missingPropActors.map(row => row.paragraphIndex))].join(', ')
        issues.push({
          code: 'storyboard-visible-prop-action',
          message: `Nearby source paragraph(s) ${paragraphs} show ${names.join(', ')} physically interacting with the same central prop. Do not frame only the prop or its result: re-anchor to the supported action or show the named actor visibly performing it, with confirmed identity and current outfit. Preserve explicit autonomous events; never invent a person or action.`,
          repair: 'ambiguous',
        })
      }
    }

    const directiveCounts = new Map<string, number>()
    for (const directive of illustration.subjectDirectives) directiveCounts.set(key(directive.name), (directiveCounts.get(key(directive.name)) || 0) + 1)
    const missingDirectives = illustration.namedSubjects.filter(name => directiveCounts.get(key(name)) !== 1)
    if (missingDirectives.length) issues.push({ code: 'subject-directive-count', message: `Each named subject needs exactly one directive: ${missingDirectives.join(', ')}.`, repair: 'ambiguous' })
    const unexpectedDirectives = illustration.subjectDirectives.filter(row => !illustration.namedSubjects.some(name => key(name) === key(row.name)))
    if (unexpectedDirectives.length) {
      illustration.subjectDirectives = illustration.subjectDirectives.filter(row => illustration.namedSubjects.some(name => key(name) === key(row.name)))
      issues.push({ code: 'extra-directive-removed', message: 'Relay removed directives for subjects not present in the shot.', repair: 'local' })
    }

    const humanSubjects = illustration.namedSubjects.filter(name => key(allowedSubjects.get(key(name))?.role || 'character') !== 'animal').length
    if (illustration.expectedPeopleCount !== humanSubjects) issues.push({ code: 'people-count', message: `expectedPeopleCount is ${illustration.expectedPeopleCount}; authoritative visible people count is ${humanSubjects}.`, repair: 'ambiguous' })

    for (const directive of illustration.subjectDirectives) {
      const subject = allowedSubjects.get(key(directive.name))
      if (!subject) continue
      const overrides = [...directive.appearanceOverrides, ...directive.attireOverrides, ...directive.temporaryTraits]
      const revived = overrides.filter(value => subject.superseded.some(old => key(old) === key(value)))
      if (revived.length) issues.push({ code: 'superseded-appearance', message: `${directive.name} revives superseded appearance: ${revived.join(', ')}.`, repair: 'fatal' })
      const pinnedConflict = overrides.filter(value => subject.pinned.length && !subject.pinned.some(pinned => key(pinned) === key(value)))
      if (pinnedConflict.length && directive.appearanceOverrides.length) issues.push({ code: 'pinned-appearance-conflict', message: `${directive.name} overrides pinned appearance without authoritative support.`, repair: 'ambiguous' })
    }

    if (!illustration.promptCore) issues.push({ code: 'missing-prompt-core', message: 'The shot has no promptCore.', repair: 'ambiguous' })
    if (illustration.promptCore.length > context.maximumPromptCharacters) issues.push({ code: 'prompt-core-limit', message: `promptCore exceeds ${context.maximumPromptCharacters} characters.`, repair: 'ambiguous' })
    if (context.promptFormat === 'danbooru-tags') {
      try { normalizeBooruTagPrompt((illustration.booruTags || []).join(', ')) }
      catch (error) { issues.push({ code: 'invalid-booru-tags', message: error instanceof Error ? error.message : String(error), repair: 'ambiguous' }) }
    }
    if (context.perspectiveMode === 'storyboard' && paragraph && !issues.some(issue => issue.code === 'anchor-excerpt-mismatch')) {
      const tagMode = context.promptFormat === 'danbooru-tags'
      const candidate = tagMode ? (illustration.booruTags || []).join(', ')
        : [illustration.promptCore, ...illustration.subjectDirectives.map(row => `${row.name}: ${row.action}, ${row.contact}`)].join('. ')
      const checked = enforceIllustrationSceneContract(candidate, tagMode ? 'danbooru-tags' : 'natural-language', relayPlannedSceneContract(illustration, context))
      if (tagMode) illustration.booruTags = checked.prompt.split(',').map(text).filter(Boolean)
      issues.push(...checked.issues)
    }
    for (const field of ['shotType', 'framing', 'blocking', 'location'] as const) {
      if (!illustration.composition[field]) issues.push({ code: `missing-composition-${field}`, message: `Composition is missing ${field}.`, repair: 'ambiguous' })
    }

    if (!(RELAY_PLANNED_ASPECT_RATIOS as readonly string[]).includes(illustration.aspectRatio)) {
      illustration.aspectRatio = (RELAY_PLANNED_ASPECT_RATIOS as readonly string[]).includes(context.defaultAspectRatio) ? context.defaultAspectRatio : '4:3'
      issues.push({ code: 'aspect-normalized', message: 'Relay normalized an unsupported aspect ratio.', repair: 'local' })
    }
    if ((RELAY_PLANNED_ASPECT_RATIOS as readonly string[]).includes(context.defaultAspectRatio)
      && illustration.aspectRatio !== context.defaultAspectRatio) {
      illustration.aspectRatio = context.defaultAspectRatio
      issues.push({ code: 'aspect-policy-applied', message: 'Relay applied the selected fixed aspect policy.', repair: 'local' })
    }
    const badRefs = illustration.referenceAssetIds.filter(id => !allowedRefs.has(id))
    const badLocationRefs = illustration.locationReferenceAssetIds.filter(id => !allowedLocationRefs.has(id))
    illustration.referenceAssetIds = illustration.referenceAssetIds.filter(id => allowedRefs.has(id))
    illustration.locationReferenceAssetIds = illustration.locationReferenceAssetIds.filter(id => allowedLocationRefs.has(id))
    if (badRefs.length || badLocationRefs.length) issues.push({ code: 'unknown-reference-removed', message: 'Relay removed reference IDs that were not supplied in context.', repair: 'local' })

    const duplicate = accepted.find(row => !row.rejected && overlapScore(row.illustration, illustration) >= 1.25)
    if (duplicate) {
      issues.push({ code: 'near-duplicate', message: `Shot is too similar to "${duplicate.illustration.title}" and was omitted.`, repair: 'fatal' })
      warnings.push(`Omitted near-duplicate shot: ${illustration.title}.`)
    }
    const requiresRepair = issues.some(issue => issue.repair === 'ambiguous')
    const rejected = issues.some(issue => issue.repair === 'fatal')
    accepted.push({ illustration, issues, requiresRepair, rejected })
  }

  return {
    shouldIllustrate: parsed.shouldIllustrate === true && accepted.some(row => !row.rejected),
    reason: overallReason || (accepted.length ? 'Illustration Director selected visual beats.' : 'No illustration was warranted.'),
    illustrations: accepted,
    warnings,
  }
}

function fragments(value: unknown): string[] {
  return String(value || '').split(/[,;\n]+/).map(text).filter(Boolean)
}

function dedupeOrdered(values: string[]): string[] {
  const seen = new Set<string>()
  const output: string[] = []
  for (const value of values.map(text).filter(Boolean)) {
    const normalized = key(value)
    if (seen.has(normalized)) continue
    seen.add(normalized)
    output.push(value)
  }
  return output
}

export function compileRelayPlannedPrompt(
  illustration: RelayPlannedIllustration,
  context: RelayPlannedContext,
  options: { stylePrefix?: string; qualitySuffix?: string; globalNegative?: string; tagMode?: boolean } = {},
): RelayPlannedCompiledPrompt {
  const subjectMap = new Map(context.subjects.map(subject => [key(subject.name), subject]))
  const identity = illustration.namedSubjects.flatMap(name => subjectMap.get(key(name))?.identity || [])
  const current = illustration.namedSubjects.flatMap(name => subjectMap.get(key(name))?.current || [])
  const composition = illustration.composition
  // Keep each person's identity, current outfit, pose, hands, props, gaze, and
  // contact attached to their name in every framing mode. Flattening these
  // fields into one anonymous tag list makes ownership easy for image models
  // to swap, even when the shot is an ordinary Scene Snapshot.
  const subjectClauses = illustration.subjectDirectives.map(row => {
    const subject = subjectMap.get(key(row.name))
    const details = dedupeOrdered([
      ...(subject?.identity || []),
      ...(subject?.current || []),
      ...row.appearanceOverrides,
      ...row.attireOverrides,
      ...row.temporaryTraits,
      row.expression,
      row.pose,
      row.action,
      row.contact,
      row.gaze,
    ])
    return `${row.name}: ${details.join(', ')}`
  })
  const storyboardSourceText = [
    illustration.promptCore,
    ...illustration.subjectDirectives.flatMap(row => [row.pose, row.action, row.contact]),
  ].join(' ')
  const storyboardNearbySourceText = context.paragraphs
    .filter(row => Math.abs(row.index - illustration.anchor.paragraphIndex) <= 2)
    .map(row => row.text)
    .join(' ')
  const storyboardEventText = `${storyboardSourceText} ${storyboardNearbySourceText}`
  const storyboardSingleNamedPerson = context.perspectiveMode === 'storyboard'
    && illustration.expectedPeopleCount === 1
    && illustration.namedSubjects.length === 1
  const storyboardNamedPerson = storyboardSingleNamedPerson ? illustration.namedSubjects[0] : ''
  const storyboardCameraFields = [composition.shotType, composition.cameraAngle, composition.framing].map(value => {
    let field = text(value)
    if (storyboardNamedPerson) {
      field = field
        .replace(/\b(?:a|the)\s+standing\s+observer\b/gi, `${storyboardNamedPerson} standing`)
        .replace(/\b(?:a|the)\s+observer\b/gi, storyboardNamedPerson)
        .replace(/\b(?:a|the)\s+unnamed\s+figure\b/gi, storyboardNamedPerson)
    }
    return field
  }).filter(Boolean)
  const storyboardCastClause = storyboardSingleNamedPerson
    ? `Exactly one visible person: ${storyboardNamedPerson} only.`
    : ''
  const storyboardTapeDiscMarking = context.perspectiveMode === 'storyboard'
    && /\b(?:mark|draw|write|tick)\w*\b/i.test(storyboardSourceText)
    && /\b(?:drafting\s+)?tape\b/i.test(storyboardSourceText)
    && /\b(?:marker|pen|pencil)\b/i.test(storyboardSourceText)
    && /\b(?:disc|disk)\b/i.test(storyboardSourceText)
    && /\b(?:on|onto)\s+(?:the\s+)?(?:yellow\s+)?(?:drafting\s+)?tape\b/i.test(storyboardSourceText)
  const storyboardTapeDiscMarkingClarifier = storyboardTapeDiscMarking
    ? `${storyboardNamedPerson || 'The subject'} marks only the tape: the marker tip touches only the yellow drafting tape, not the silver disc. Keep both hands and the marker outside the disc surface; do not hold, brace, touch, trace, or write on it. The tape lies on the desk outside the disc rim. The existing graphite ring stays unchanged with its tiny open gap clearly visible; the alignment tick remains on the tape and does not cross onto the disc.`
    : ''
  const noContactPattern = /\b(?:without\s+(?:any\s+)?contact|without\s+touching|no\s+contact|not\s+touching|does\s+not\s+touch|doesn't\s+touch|stops?\s+short\s+of|hover(?:s|ing)?\s+(?:just\s+)?above)\b/i
  const storyboardNoContactDetail = context.perspectiveMode === 'storyboard'
    ? [
      ...text(illustration.promptCore).split(/[.;\n]+/).map(value => ({ owner: '', value })),
      ...illustration.subjectDirectives.flatMap(row => [row.pose, row.action, row.contact].map(value => ({ owner: row.name, value }))),
    ].find(row => noContactPattern.test(row.value))
    : undefined
  const storyboardNoContactText = storyboardNoContactDetail?.value || ''
  const interpersonalNoContact = /\b(?:without|not)\s+touching\s+(?:him|her|them|each other|one another)\b/i.test(storyboardNoContactText)
    || illustration.namedSubjects.some(name => {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return new RegExp(`\\b(?:touching|touch)\\s+${escapedName}\\b`, 'i').test(storyboardNoContactText)
    })
  const storyboardNoContactClarifier = storyboardTapeDiscMarking
    ? storyboardTapeDiscMarkingClarifier
    : storyboardNoContactDetail
    ? interpersonalNoContact
      ? `${storyboardNoContactDetail.owner ? `${storyboardNoContactDetail.owner}: ` : ''}${storyboardNoContactText}. Preserve this stated person-to-person separation without changing either person's contact with their tools or props.`
      : /\b(?:finger(?:tip)?|thumb)\b/i.test(storyboardNoContactText)
      ? 'Keep the fingertip visibly separated from the object by a clear, unobstructed gap of air; avoid overlap or foreshortening that makes them appear to touch.'
      : /\bhand\b/i.test(storyboardNoContactText)
        ? 'Keep the hand visibly separated from the object by a clear, unobstructed gap of air; avoid overlap or foreshortening that makes them appear to touch.'
        : `${storyboardNoContactDetail.owner ? `${storyboardNoContactDetail.owner}: ` : ''}${storyboardNoContactText}. Preserve the stated separation with a visible gap, without adding a different subject or target.`
    : ''
  const storyboardUnknownCause = /\b(?:unexplained|unknown (?:source|cause|mechanism)|source (?:is )?unknown|no physical tool|there is no (?:physical )?tool|no (?:visible )?(?:writing )?(?:tool|instrument|implement|stylus)|without (?:a |any )?(?:physical )?(?:writing )?(?:tool|instrument|implement|stylus)|without (?:anyone|any person|any tool) (?:approaching|near))\b/i.test(storyboardEventText)
  const storyboardDescribesEffect = /\b(?:graphite|mark|line|stroke|arc|writing|letter|symbol)\b/i.test(storyboardEventText)
  const storyboardToollessEffect = context.perspectiveMode === 'storyboard' && !options.tagMode
    && storyboardUnknownCause && storyboardDescribesEffect
  const storyboardToollessClarifier = storyboardToollessEffect
    ? /\bgraphite\b/i.test(storyboardEventText) && /\bdisc\b/i.test(storyboardEventText)
      ? 'The graphite line emerges directly from the disc surface; no writing implement or mechanism touches or traces it.'
      : 'Show the unexplained effect directly at its source; no unsupported implement or mechanism creates it.'
    : ''
  const storyboardTinyGap = context.perspectiveMode === 'storyboard'
    && /\b(?:hair[- ]thin|(?:tiny|small)\s+open\s+gap|open\s+gap|(?:one|1)\s*millimet(?:er|re)|sub[- ]?millimet(?:er|re)|millimeter[- ]size|millimetre[- ]size)\b/i.test(storyboardEventText)
  const storyboardGapClarifier = storyboardTinyGap
    ? 'Keep the stated narrow gap visibly open between both ends; show it clearly in-frame and do not join, cross, or close the line.'
    : ''
  // Storyboard shots need one readable composition, not a second recital of
  // every Director field after promptCore. Long, repeated clause lists pushed
  // the actual two-person action out of focus for the image provider.
  const storyboardPrompt = context.perspectiveMode === 'storyboard' && !options.tagMode
    ? [
      storyboardCameraFields.join(', '),
      storyboardCastClause,
      text(illustration.promptCore),
      storyboardNoContactClarifier,
      storyboardToollessClarifier,
      storyboardGapClarifier,
      ...illustration.subjectDirectives.map(row => {
        const subject = subjectMap.get(key(row.name))
        const actionFallback = [row.pose, row.action, row.contact].filter(requirement =>
          !ownedSceneRequirementPresent(illustration.promptCore, row.name, requirement, illustration.namedSubjects))
        const owned = dedupeOrdered([
          ...(subject?.identity || []), ...(subject?.current || []),
          ...row.appearanceOverrides, ...row.attireOverrides, ...row.temporaryTraits,
          ...actionFallback,
        ])
        return owned.length ? `${row.name}: ${owned.join(', ')}` : ''
      }),
      [composition.background, composition.location, composition.lighting, ...composition.importantProps].map(text).filter(Boolean).join(', '),
      ...fragments(options.stylePrefix || context.promptStyle),
      ...illustration.referenceAssetIds.map(id => `character reference ${id}`),
      ...illustration.locationReferenceAssetIds.map(id => `location reference ${id}`),
      ...fragments(options.qualitySuffix),
    ].map(value => value.replace(/[\s.;,]+$/g, '')).filter(Boolean).join('. ')
    : ''
  const ordered = dedupeOrdered([
    ...fragments(illustration.promptCore),
    composition.blocking,
    ...subjectClauses,
    composition.shotType,
    composition.cameraAngle,
    composition.framing,
    composition.foreground,
    composition.background,
    composition.location,
    composition.timeOfDay,
    composition.lighting,
    composition.mood,
    ...composition.importantProps,
    ...fragments(options.stylePrefix || context.promptStyle),
    ...illustration.referenceAssetIds.map(id => `character reference ${id}`),
    ...illustration.locationReferenceAssetIds.map(id => `location reference ${id}`),
    ...fragments(options.qualitySuffix),
  ])
  const negative = dedupeOrdered([
    ...context.globalNegativeRequirements,
    ...fragments(options.globalNegative),
    ...fragments(illustration.negativeCore),
    ...(storyboardToollessEffect ? ['stylus tracing the mark', 'mechanical arm over the surface', 'writing implement touching the mark'] : []),
    ...(storyboardTapeDiscMarking ? ['marker tip on disc', 'pen on disc', 'writing on disc', 'hand touching disc', 'hand resting on disc', 'hand holding disc', 'hand bracing disc', 'added marks on disc', 'closed graphite ring', 'line drawn across graphite gap'] : []),
    ...(storyboardSingleNamedPerson ? ['additional person', 'second person', 'extra people', 'duplicate character', 'background bystander'] : []),
    ...(context.perspectiveMode === 'solo-scene' ? ['extra person', 'background people', 'crowd', 'reflection person', 'screen person', 'duplicate person'] : []),
  ])
  const sceneContract = context.perspectiveMode === 'storyboard' ? relayPlannedSceneContract(illustration, context) : undefined
  const viewPrompt = normalizeIllustrationViewWording(options.tagMode ? (illustration.booruTags || []).join(', ') : storyboardPrompt || ordered.join(', '), context.perspectiveMode, options.tagMode ? 'danbooru-tags' : 'natural-language')
  const candidate = options.tagMode ? normalizeBooruTagPrompt(viewPrompt) : viewPrompt
  const checked = sceneContract ? enforceIllustrationSceneContract(candidate, options.tagMode ? 'danbooru-tags' : 'natural-language', sceneContract) : { prompt: candidate, issues: [] }
  if (checked.issues.some(issue => issue.repair === 'ambiguous')) throw new Error(`Storyboard scene contract: ${checked.issues.filter(issue => issue.repair === 'ambiguous').map(issue => issue.message).join(' ')}`)
  return {
    positivePrompt: checked.prompt,
    negativePrompt: negative.join(', '),
    warnings: checked.issues.map(issue => issue.message),
    identityFragments: dedupeOrdered(identity),
    currentStateFragments: dedupeOrdered(current),
    sceneContract,
  }
}
