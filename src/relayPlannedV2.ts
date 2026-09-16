export const RELAY_PLANNED_V2 = 'relay-planned-2' as const

export const RELAY_PLANNED_ASPECT_RATIOS = ['1:1', '4:3', '3:4', '16:9', '9:16', '4:5'] as const

export type RelayPlannedParagraph = { index: number; text: string }

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
  adultMode: boolean
  paragraphs: RelayPlannedParagraph[]
  subjects: RelayPlannedSubjectState[]
  referenceAssetIds: string[]
  locationReferenceAssetIds: string[]
  priorIllustrations: Array<Record<string, unknown>>
  globalNegativeRequirements: string[]
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
    negativeCore: text(raw.negativeCore),
    referenceAssetIds: list(raw.referenceAssetIds),
    locationReferenceAssetIds: list(raw.locationReferenceAssetIds),
  }
}

function key(value: string): string {
  return text(value).replace(/_/g, ' ').toLocaleLowerCase()
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
    for (const field of ['shotType', 'framing', 'blocking', 'location'] as const) {
      if (!illustration.composition[field]) issues.push({ code: `missing-composition-${field}`, message: `Composition is missing ${field}.`, repair: 'ambiguous' })
    }

    if (!(RELAY_PLANNED_ASPECT_RATIOS as readonly string[]).includes(illustration.aspectRatio)) {
      illustration.aspectRatio = (RELAY_PLANNED_ASPECT_RATIOS as readonly string[]).includes(context.defaultAspectRatio) ? context.defaultAspectRatio : '4:3'
      issues.push({ code: 'aspect-normalized', message: 'Relay normalized an unsupported aspect ratio.', repair: 'local' })
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
  options: { stylePrefix?: string; qualitySuffix?: string; globalNegative?: string } = {},
): RelayPlannedCompiledPrompt {
  const subjectMap = new Map(context.subjects.map(subject => [key(subject.name), subject]))
  const identity = illustration.namedSubjects.flatMap(name => subjectMap.get(key(name))?.identity || [])
  const current = illustration.namedSubjects.flatMap(name => subjectMap.get(key(name))?.current || [])
  const directives = illustration.subjectDirectives.flatMap(row => [
    ...row.appearanceOverrides,
    ...row.attireOverrides,
    ...row.temporaryTraits,
    row.expression,
    row.pose,
    row.action,
    row.contact,
    row.gaze,
  ])
  const composition = illustration.composition
  const ordered = dedupeOrdered([
    ...fragments(options.stylePrefix || context.promptStyle),
    ...identity,
    ...current,
    ...directives,
    ...fragments(illustration.promptCore),
    composition.shotType,
    composition.cameraAngle,
    composition.framing,
    composition.blocking,
    composition.foreground,
    composition.background,
    composition.location,
    composition.timeOfDay,
    composition.lighting,
    composition.mood,
    ...composition.importantProps,
    ...illustration.referenceAssetIds.map(id => `character reference ${id}`),
    ...illustration.locationReferenceAssetIds.map(id => `location reference ${id}`),
    ...fragments(options.qualitySuffix),
  ])
  const negative = dedupeOrdered([
    ...context.globalNegativeRequirements,
    ...fragments(options.globalNegative),
    ...fragments(illustration.negativeCore),
    ...(context.perspectiveMode === 'solo-scene' ? ['extra person', 'background people', 'crowd', 'reflection person', 'screen person', 'duplicate person'] : []),
  ])
  return {
    positivePrompt: ordered.join(', '),
    negativePrompt: negative.join(', '),
    warnings: [],
    identityFragments: dedupeOrdered(identity),
    currentStateFragments: dedupeOrdered(current),
  }
}
