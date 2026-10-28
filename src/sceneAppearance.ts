import type { AppearanceVaultFact, ContinuityVaultState } from './contracts'

/** A scene projection, never an edit to the user's canonical Appearance sheet. */
export type SceneAppearanceSubject = { name: string; aliases: string[]; wardrobe: string[]; appearance: string[]; replaces: string[]; excluded?: string[] }
export type SceneAppearanceChange = { subject: string; paragraphIndex: number; evidence: string; wardrobe?: string[]; appearance?: string[]; replaces?: string[] }
export type SceneAppearanceTurn = { messageId: string; swipeId: number; fingerprint: string; lineage?: string; baseline: SceneAppearanceSubject[]; changes: SceneAppearanceChange[] }
export type SceneAppearanceSource = { messageId: string; swipeId: number; paragraphs: string[]; content: string }
export const SCENE_APPEARANCE_GUIDANCE = `SCENE APPEARANCE CONTINUITY: Full Appearance scans may be scheduled infrequently. Track explicit visual changes in this response using your existing planning/authoring call. The saved sheet is a starting identity, not permission to restore an outfit removed in the story. Each image must depict the clothing and temporary appearance at its own paragraph, including distinct before/after states in the same response. Carry forward unchanged clothes; never infer a change merely from a room, mood or earlier image request. Preserve stable identity and manual exclusions. Do not add a separate model call. When an explicit change occurs, report a sceneAppearance array: {"subject":"exact known name","paragraphIndex":0,"evidence":"exact short quote from that story paragraph","wardrobe":["complete current outfit after this change"],"appearance":["complete temporary appearance after this change"],"replaces":["exact stored appearance descriptor replaced by this change"]}. Zero-based paragraphs count story paragraphs separated by blank lines, excluding image controls and Surfaces. Include only fields that change. wardrobe must be a nonempty complete snapshot, including retained garments; an explicitly unclothed subject needs an explicit visual descriptor, not an empty array. appearance may be empty to clear temporary traits; replaces is optional and names exact old descriptors, never broad categories. Do not record poses, actions, hypothetical changes, dialogue suggestions or other people's traits. Changes apply at and after that paragraph only. No change means an empty array.`
export const STORY_SCENE_APPEARANCE_GUIDANCE = `${SCENE_APPEARANCE_GUIDANCE}\nFor Story Model Planned, emit a hidden <reverie-scene-state>{"changes":[...]}</reverie-scene-state> immediately after each paragraph with a visual change, BEFORE any following illustration request so Instant generation receives it in time. Emit it even if no illustration depicts the change. Use the same event fields as sceneAppearance above. This is Relay metadata, never image prompt text, narrative prose or a Surface. Keep each visual_prompt self-contained and faithful to its illustrated instant. Do not put this metadata in visual_prompt.`

const key = (value: string) => value.trim().replace(/_/g, ' ').replace(/\s+/g, ' ').toLocaleLowerCase()
const record = (value: unknown): Record<string, any> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}
const safeText = (value: unknown, max = 240): string => typeof value === 'string' && value.trim().length <= max && !/[<>\[\]{}\u0000-\u001f]/.test(value) ? value.trim() : ''
function descriptors(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.length > 24 || value.some(row => !safeText(row))) return undefined
  return [...new Set(value.map(row => safeText(row)))]
}

/** Strip complete and currently streaming private controls only from projections. */
export function stripSceneAppearanceMarkup(content: string): string {
  return content.replace(/<reverie-scene-state\b[^>]*>[\s\S]*?(?:<\/reverie-scene-state\s*>|$)/gi, '')
    .replace(/<\/reverie-scene-state\s*>/gi, '')
}
export function sceneAppearanceFingerprint(paragraphs: string[]): string {
  const text = JSON.stringify(paragraphs.map(value => value.replace(/\s+/g, ' ').trim()))
  let hash = 2166136261
  for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619)
  return `${text.length}:${(hash >>> 0).toString(16)}`
}
export function validateSceneAppearanceChanges(raw: unknown, paragraphs: string[], subjects: SceneAppearanceSubject[]): SceneAppearanceChange[] {
  if (!Array.isArray(raw)) return []
  return raw.slice(0, 64).flatMap(value => {
    const row = record(value)
    const owners = subjects.filter(subject => [subject.name, ...subject.aliases].some(name => key(name) === key(String(row.subject || ''))))
    const paragraphIndex = row.paragraphIndex
    const evidence = safeText(row.evidence, 600)
    if (owners.length !== 1 || !Number.isInteger(paragraphIndex) || !paragraphs[paragraphIndex] || evidence.length < 8
      || !key(paragraphs[paragraphIndex]).includes(key(evidence))) return []
    const wardrobe = row.wardrobe === undefined ? undefined : descriptors(row.wardrobe)
    const appearance = row.appearance === undefined ? undefined : descriptors(row.appearance)
    const replaces = row.replaces === undefined ? undefined : descriptors(row.replaces)
    if ((row.wardrobe !== undefined && !wardrobe?.length) || (row.appearance !== undefined && !appearance)
      || (row.replaces !== undefined && !replaces) || wardrobe === undefined && appearance === undefined) return []
    if ([...(wardrobe || []), ...(appearance || [])].some(value => owners[0].excluded?.some(excluded => key(excluded) === key(value)))) return []
    return [{ subject: owners[0].name, paragraphIndex, evidence, ...(wardrobe ? { wardrobe } : {}), ...(appearance ? { appearance } : {}), ...(replaces ? { replaces } : {}) }]
  }).sort((left, right) => left.paragraphIndex - right.paragraphIndex)
}
export function parseSceneAppearanceChanges(content: string, paragraphs: string[], subjects: SceneAppearanceSubject[]): SceneAppearanceChange[] {
  const changes: SceneAppearanceChange[] = []
  for (const match of content.matchAll(/<reverie-scene-state\b[^>]*>([\s\S]*?)<\/reverie-scene-state\s*>/gi)) {
    try { changes.push(...validateSceneAppearanceChanges(JSON.parse(match[1]).changes, paragraphs, subjects)) } catch { /* Optional malformed metadata must not fail images or issue a repair call. */ }
  }
  return changes.slice(0, 64).sort((left, right) => left.paragraphIndex - right.paragraphIndex)
}
export function normalizeSceneAppearanceTimeline(raw: unknown): SceneAppearanceTurn[] {
  if (!Array.isArray(raw)) return []
  return raw.slice(-128).flatMap(value => {
    const row = record(value)
    if (!safeText(row.messageId) || !Number.isInteger(row.swipeId) || row.swipeId < 0 || !safeText(row.fingerprint)) return []
    const baseline: SceneAppearanceSubject[] = (Array.isArray(row.baseline) ? row.baseline : []).slice(0, 24).flatMap((item: unknown) => {
      const subject = record(item)
      return safeText(subject.name) ? [{ name: safeText(subject.name), aliases: descriptors(subject.aliases) || [], wardrobe: descriptors(subject.wardrobe) || [], appearance: descriptors(subject.appearance) || [], replaces: descriptors(subject.replaces) || [], excluded: descriptors(subject.excluded) || [] }] : []
    })
    // Grounding is rechecked against the active saved source before use.
    const changes = (Array.isArray(row.changes) ? row.changes : []).slice(0, 64)
    return [{ messageId: row.messageId, swipeId: row.swipeId, fingerprint: row.fingerprint, lineage: safeText(row.lineage) || undefined, baseline, changes }]
  })
}
export function sceneAppearanceAt(baseline: SceneAppearanceSubject[], changes: SceneAppearanceChange[], paragraphIndex = Infinity): SceneAppearanceSubject[] {
  const result = structuredClone(baseline)
  for (const change of changes) {
    if (change.paragraphIndex > paragraphIndex) continue
    const subject = result.find(row => key(row.name) === key(change.subject))
    if (!subject) continue
    if (change.wardrobe) subject.wardrobe = [...change.wardrobe]
    if (change.appearance) subject.appearance = [...change.appearance]
    if (change.replaces) subject.replaces = [...new Set([...subject.replaces, ...change.replaces])]
  }
  for (const subject of result) {
    const allowed = (value: string) => !subject.excluded?.some(excluded => key(excluded) === key(value))
    subject.wardrobe = subject.wardrobe.filter(allowed)
    subject.appearance = subject.appearance.filter(allowed)
  }
  return result
}
export function sceneAppearanceSubjects(facts: AppearanceVaultFact[]): SceneAppearanceSubject[] {
  const subjects = new Map<string, SceneAppearanceSubject>()
  for (const fact of facts) {
    if (fact.status !== 'active' && !fact.manuallyExcluded) continue
    const subject = subjects.get(key(fact.canonicalCharacterName)) || { name: fact.canonicalCharacterName, aliases: fact.aliases || [], wardrobe: [], appearance: [], replaces: [], excluded: [] }
    if (fact.manuallyExcluded) {
      subject.excluded = [...(subject.excluded || []), fact.value]
      subjects.set(key(subject.name), subject)
      continue
    }
    if (fact.active === false) continue
    if (fact.layer === 'wardrobe') subject.wardrobe.push(fact.value)
    if (fact.layer === 'current-appearance') subject.appearance.push(fact.value)
    subjects.set(key(subject.name), subject)
  }
  return [...subjects.values()].slice(0, 24)
}
/** Replace only the mutable projection. Canonical facts/sheets remain byte-for-byte intact. */
export function projectSceneAppearanceFacts(facts: AppearanceVaultFact[], subjects: SceneAppearanceSubject[]): AppearanceVaultFact[] {
  const owned = (fact: AppearanceVaultFact) => subjects.find(subject => [subject.name, ...subject.aliases].some(name => [fact.canonicalCharacterName, ...(fact.aliases || [])].some(alias => key(alias) === key(name))))
  const result = facts.filter(fact => {
    const subject = owned(fact)
    if (!subject) return true
    if (fact.manuallyExcluded || fact.status && fact.status !== 'active' || fact.active === false) return true
    if (fact.layer === 'visual-identity') return fact.pinned || fact.userConfirmed || !subject.replaces.some(value => key(value) === key(fact.value))
    return (fact.layer === 'wardrobe' ? subject.wardrobe : subject.appearance).some(value => key(value) === key(fact.value))
  })
  for (const subject of subjects) {
    const template = facts.find(fact => owned(fact) === subject && !fact.manuallyExcluded && fact.status !== 'rejected')
    if (!template) continue
    for (const [layer, values] of [['wardrobe', subject.wardrobe], ['current-appearance', subject.appearance]] as const) {
      for (const value of values) {
        if (facts.some(fact => owned(fact) === subject && fact.manuallyExcluded && key(fact.value) === key(value))) continue
        if (result.some(fact => owned(fact) === subject && fact.layer === layer && key(fact.value) === key(value))) continue
        result.push({ ...template, factId: `scene:${template.canonicalCharacterId}:${layer}:${key(value)}`, layer, category: layer === 'wardrobe' ? 'current-outfit' : 'other', value, valueKind: 'visual-phrase', sourceType: 'inferred', sourceReference: { sourceType: 'inferred', sourceReference: 'scene-appearance:source-grounded' }, pinned: false, userConfirmed: false, status: 'active', active: true })
      }
    }
  }
  return result
}

export function projectSceneAppearanceVault(vault: ContinuityVaultState, subjects: SceneAppearanceSubject[]): ContinuityVaultState {
  const facts = projectSceneAppearanceFacts([...Object.values(vault.visualIdentity), ...Object.values(vault.wardrobe), ...Object.values(vault.currentAppearance)], subjects)
  const layer = (name: AppearanceVaultFact['layer']) => Object.fromEntries(facts.filter(fact => fact.layer === name).map(fact => [fact.factId, fact]))
  return { ...vault, visualIdentity: layer('visual-identity'), wardrobe: layer('wardrobe'), currentAppearance: layer('current-appearance') }
}

function sourceLineage(sources: SceneAppearanceSource[], index: number): string {
  return sceneAppearanceFingerprint(sources.slice(0, index).map(source => `${source.messageId}:${source.swipeId}:${sceneAppearanceFingerprint(source.paragraphs)}`))
}
function validTurn(vault: ContinuityVaultState, sources: SceneAppearanceSource[], index: number): SceneAppearanceTurn | undefined {
  const source = sources[index]
  return vault.sceneAppearance?.find(turn => turn.messageId === source.messageId && turn.swipeId === source.swipeId
    && turn.fingerprint === sceneAppearanceFingerprint(source.paragraphs) && turn.lineage === sourceLineage(sources, index))
}
export function sceneAppearanceForHistory(vault: ContinuityVaultState, sources: SceneAppearanceSource[], messageId: string, paragraphIndex = Infinity, includeCurrent = true): SceneAppearanceSubject[] {
  const index = sources.findIndex(source => source.messageId === messageId)
  if (index < 0) return []
  const canonical = sceneAppearanceSubjects([...Object.values(vault.visualIdentity), ...Object.values(vault.wardrobe), ...Object.values(vault.currentAppearance)])
  const turn = validTurn(vault, sources, index)
  const refreshIndex = sources.findIndex(source => source.messageId === vault.appearanceSidecar.lastFullRefreshMessageId)
  let subjects = turn ? structuredClone(turn.baseline) : canonical
  if (!turn) {
    // An end-of-turn full scan is not evidence of clothing in an earlier frame.
    // If no pre-scan snapshot exists, leave those mutable details to the actual
    // source/author instead of appending facts from the future.
    if (refreshIndex >= index) subjects = canonical.map(subject => ({ ...subject, wardrobe: [], appearance: [] }))
    else for (let prior = Math.max(0, refreshIndex + 1); prior < index; prior++) {
      const source = sources[prior]
      const saved = validTurn(vault, sources, prior)
      const changes = [...validateSceneAppearanceChanges(saved?.changes, source.paragraphs, subjects), ...parseSceneAppearanceChanges(source.content, source.paragraphs, subjects)]
      subjects = sceneAppearanceAt(subjects, changes)
    }
  }
  // Newly resolved card identities may not have existed before mandatory setup.
  for (const subject of canonical) {
    const existing = subjects.find(row => key(row.name) === key(subject.name))
    if (!existing) subjects.push({ ...subject, wardrobe: [], appearance: [] })
    else existing.excluded = [...new Set([...(existing.excluded || []), ...(subject.excluded || [])])]
  }
  if (!includeCurrent) return subjects
  const source = sources[index]
  const changes = [...validateSceneAppearanceChanges(turn?.changes, source.paragraphs, subjects), ...parseSceneAppearanceChanges(source.content, source.paragraphs, subjects)]
  // A fresh full scan remains authoritative when this response reports no
  // intra-response changes. Retain the pre-scan snapshot for explicit timing.
  if (refreshIndex === index && !changes.length) return canonical
  return sceneAppearanceAt(subjects, changes, paragraphIndex)
}
export function recordSceneAppearanceTurn(vault: ContinuityVaultState, sources: SceneAppearanceSource[], messageId: string, rawChanges?: unknown): void {
  const index = sources.findIndex(source => source.messageId === messageId)
  if (index < 0) return
  const source = sources[index]
  const existing = validTurn(vault, sources, index)
  const baseline = sceneAppearanceForHistory(vault, sources, messageId, Infinity, false)
  const changes = rawChanges === undefined
    ? [...validateSceneAppearanceChanges(existing?.changes, source.paragraphs, baseline), ...parseSceneAppearanceChanges(source.content, source.paragraphs, baseline)]
    : validateSceneAppearanceChanges(rawChanges, source.paragraphs, baseline)
  const deduped = [...new Map(changes.map(change => [JSON.stringify(change), change])).values()]
  const turn: SceneAppearanceTurn = { messageId, swipeId: source.swipeId, fingerprint: sceneAppearanceFingerprint(source.paragraphs), lineage: sourceLineage(sources, index), baseline, changes: deduped }
  vault.sceneAppearance = [...(vault.sceneAppearance || []).filter(row => row.messageId !== messageId || row.swipeId !== source.swipeId), turn].slice(-128)
}
