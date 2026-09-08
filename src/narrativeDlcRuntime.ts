import type { RegexScriptCreateDTO, RegexScriptDTO, RegexScriptUpdateDTO, SpindleAPI } from 'lumiverse-spindle-types'
import {
  NARRATIVE_REGEX_VARIANTS,
  NARRATIVE_UTILITY_PACK,
  applyNarrativeDisplayNames,
  narrativeRegexScripts,
  narrativeUtilityItems,
  narrativeUtilityNames,
  type NarrativeRegexScript,
  type NarrativeRegexVariant,
} from './narrativeRegexAssets'

export const NARRATIVE_DLC_FOLDER = 'Reverie Relay · Narrative DLC'
export const NARRATIVE_DLC_NAMESPACE = 'reverie-relay:narrative-dlc'
export const NARRATIVE_DLC_VERSION = String(NARRATIVE_UTILITY_PACK.version || '6.1')

export type NarrativeDlcSyncStatus = 'not-installed' | 'healthy' | 'drifted' | 'failed' | 'removed'

export type NarrativeDlcHealth = {
  status: NarrativeDlcSyncStatus
  variant: NarrativeRegexVariant
  expected: number
  installed: number
  healthy: number
  drifted: number
  blocked: number
  updatedAt: number
  message: string
}

export type NarrativeRegexApi = Pick<SpindleAPI['regex_scripts'], 'list' | 'create' | 'update' | 'delete'>
type NarrativeRegexMutationInput = RegexScriptCreateDTO & { actions?: Array<Record<string, unknown>>; target?: unknown }

function selectedTarget(script: NarrativeRegexScript): 'prompt' | 'response' | 'display' {
  const target = Array.isArray(script.target) ? script.target[0] : script.target
  return target === 'prompt' || target === 'response' ? target : 'display'
}

export function narrativeRegexCreateInput(script: NarrativeRegexScript, variant: NarrativeRegexVariant): NarrativeRegexMutationInput {
  return {
    name: String(script.name || script.script_id),
    script_id: script.script_id,
    find_regex: script.find_regex,
    replace_string: script.replace_string,
    flags: script.flags || '',
    placement: script.placement?.length ? [...script.placement] : ['ai_output'],
    scope: script.scope || 'global',
    scope_id: script.scope_id ?? null,
    target: selectedTarget(script),
    min_depth: script.min_depth ?? null,
    max_depth: script.max_depth ?? null,
    trim_strings: [...(script.trim_strings || [])],
    run_on_edit: script.run_on_edit === true,
    substitute_macros: script.substitute_macros || 'none',
    disabled: script.disabled === true,
    sort_order: Number(script.sort_order) || 0,
    description: String(script.description || ''),
    folder: NARRATIVE_DLC_FOLDER,
    folder_version: NARRATIVE_DLC_VERSION,
    metadata: {
      ...(script.metadata || {}),
      reverie_namespace: NARRATIVE_DLC_NAMESPACE,
      reverie_narrative_dlc: true,
      reverie_narrative_variant: variant,
      reverie_narrative_source_version: NARRATIVE_DLC_VERSION,
    },
    actions: (script.actions || []).map(action => ({ ...action })),
  }
}

function comparable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(comparable).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => `${JSON.stringify(key)}:${comparable(child)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function createInputFromDto(script: RegexScriptDTO): NarrativeRegexMutationInput {
  return {
    name: script.name,
    script_id: script.script_id,
    find_regex: script.find_regex,
    replace_string: script.replace_string,
    flags: script.flags,
    placement: [...script.placement],
    scope: script.scope,
    scope_id: script.scope_id,
    target: Array.isArray((script as any).target) ? (script as any).target[0] : script.target,
    min_depth: script.min_depth,
    max_depth: script.max_depth,
    trim_strings: [...script.trim_strings],
    run_on_edit: script.run_on_edit,
    substitute_macros: script.substitute_macros,
    disabled: script.disabled,
    sort_order: script.sort_order,
    description: script.description,
    folder: script.folder,
    folder_version: script.folder_version,
    metadata: { ...script.metadata },
    actions: Array.isArray((script as any).actions) ? (script as any).actions.map((action: Record<string, unknown>) => ({ ...action })) : [],
  }
}

function comparableMutationInput(input: NarrativeRegexMutationInput): NarrativeRegexMutationInput {
  const metadata = { ...(input.metadata || {}) }
  delete metadata._lumiverse_spindle_extension
  return {
    ...input,
    target: Array.isArray(input.target) ? input.target[0] : input.target,
    metadata,
    actions: Array.isArray(input.actions) ? input.actions : [],
  }
}

function scriptMatches(script: RegexScriptDTO, desired: NarrativeRegexMutationInput): boolean {
  const actual = createInputFromDto(script)
  return comparable(comparableMutationInput(actual)) === comparable(comparableMutationInput(desired))
}

function scriptPayloadMatches(script: RegexScriptDTO, desired: NarrativeRegexMutationInput): boolean {
  const actual = comparableMutationInput(createInputFromDto(script))
  const expected = comparableMutationInput(desired)
  const omitOwnership = (input: NarrativeRegexMutationInput) => {
    const { folder: _folder, folder_version: _folderVersion, metadata: _metadata, ...payload } = input
    return payload
  }
  return comparable(omitOwnership(actual)) === comparable(omitOwnership(expected))
}

function isOwnedNarrativeScript(script: RegexScriptDTO): boolean {
  return script.can_mutate === true && (
    script.folder === NARRATIVE_DLC_FOLDER
    || script.metadata?.reverie_namespace === NARRATIVE_DLC_NAMESPACE
    || script.metadata?.reverie_narrative_dlc === true
  )
}

async function listAllScripts(api: NarrativeRegexApi, userId?: string): Promise<RegexScriptDTO[]> {
  const output: RegexScriptDTO[] = []
  let offset = 0
  while (true) {
    const page = await api.list({ limit: 200, offset, userId })
    output.push(...page.data)
    offset += page.data.length
    if (!page.data.length || offset >= page.total) return output
  }
}

function healthMessage(health: Omit<NarrativeDlcHealth, 'message'>): string {
  if (health.blocked) return `${health.blocked} Narrative script ID${health.blocked === 1 ? '' : 's'} collide with scripts Relay does not own.`
  if (health.status === 'healthy') return `${health.healthy}/${health.expected} ${health.variant} Narrative scripts are installed and current.`
  if (health.status === 'not-installed') return 'Narrative Regex scripts are not installed.'
  if (health.status === 'removed') return 'Relay-owned Narrative Regex scripts were removed.'
  if (health.status === 'failed') return 'Narrative Regex reconciliation failed and prior owned state was restored.'
  return `${health.installed}/${health.expected} Narrative scripts are installed; ${health.drifted} require repair.`
}

export async function inspectNarrativeRegex(api: NarrativeRegexApi, variant: NarrativeRegexVariant, userId?: string): Promise<NarrativeDlcHealth> {
  const all = await listAllScripts(api, userId)
  const desired = narrativeRegexScripts(variant).map(script => narrativeRegexCreateInput(script, variant))
  const owned = all.filter(isOwnedNarrativeScript)
  let healthy = 0
  let drifted = 0
  let blocked = 0
  for (const input of desired) {
    const candidates = all.filter(script => script.script_id === input.script_id)
    if (candidates.some(script => !isOwnedNarrativeScript(script))) { blocked += 1; continue }
    const existing = candidates.find(isOwnedNarrativeScript)
    if (!existing) { drifted += 1; continue }
    if (scriptMatches(existing, input)) healthy += 1
    else drifted += 1
  }
  drifted += owned.filter(script => !desired.some(input => input.script_id === script.script_id)).length
  const base = {
    status: (blocked || drifted ? (owned.length ? 'drifted' : 'not-installed') : 'healthy') as NarrativeDlcSyncStatus,
    variant,
    expected: desired.length,
    installed: owned.length,
    healthy,
    drifted,
    blocked,
    updatedAt: Date.now(),
  }
  return { ...base, message: healthMessage(base) }
}

export async function reconcileNarrativeRegex(api: NarrativeRegexApi, variant: NarrativeRegexVariant, userId?: string): Promise<NarrativeDlcHealth> {
  if (!NARRATIVE_REGEX_VARIANTS.includes(variant)) throw new Error(`Unsupported Narrative Regex variant: ${variant}`)
  const all = await listAllScripts(api, userId)
  const desired = narrativeRegexScripts(variant).map(script => narrativeRegexCreateInput(script, variant))
  const desiredIds = new Set(desired.map(script => String(script.script_id)))
  const blocked = desired.filter(input => {
    return all.some(script => script.script_id === input.script_id && !isOwnedNarrativeScript(script))
  })
  if (blocked.length) {
    const compatible = blocked.filter(input => all.some(script => script.script_id === input.script_id && !isOwnedNarrativeScript(script) && scriptPayloadMatches(script, input)))
    const migration = compatible.length
      ? ` ${compatible.length} match the selected Narrative presentation, but Lumiverse marks them as manually imported or foreign and does not permit Relay to adopt, update, or remove them. They may remain active if you manage that pack manually; enable the Narrative Utilities separately. For Relay-managed switching/repair/removal, delete the external pack once and retry.`
      : ' Lumiverse does not permit Relay to adopt, update, or remove manually imported or foreign scripts. Remove the conflicting external pack before retrying.'
    throw new Error(`Cannot install Narrative DLC because ${blocked.length} script ID${blocked.length === 1 ? '' : 's'} already exist outside Relay ownership: ${blocked.slice(0, 5).map(row => row.script_id).join(', ')}.${migration}`)
  }

  const snapshots = new Map<string, NarrativeRegexMutationInput>()
  const created: string[] = []
  try {
    for (const input of desired) {
      const existing = all.find(script => script.script_id === input.script_id && isOwnedNarrativeScript(script))
      if (existing) {
        if (scriptMatches(existing, input)) continue
        snapshots.set(existing.id, createInputFromDto(existing))
        await api.update(existing.id, input as RegexScriptUpdateDTO, userId)
      } else {
        const result = await api.create(input, userId)
        created.push(result.id)
      }
    }
    for (const stale of all.filter(script => isOwnedNarrativeScript(script) && !desiredIds.has(script.script_id))) {
      snapshots.set(stale.id, createInputFromDto(stale))
      await api.delete(stale.id, userId)
    }
  } catch (error) {
    for (const id of created.reverse()) await api.delete(id, userId).catch(() => false)
    for (const [id, snapshot] of [...snapshots.entries()].reverse()) {
      await api.update(id, snapshot, userId).catch(async () => { await api.create(snapshot, userId).catch(() => undefined) })
    }
    throw error
  }
  return inspectNarrativeRegex(api, variant, userId)
}

export async function removeNarrativeRegex(api: NarrativeRegexApi, variant: NarrativeRegexVariant, userId?: string): Promise<NarrativeDlcHealth> {
  const owned = (await listAllScripts(api, userId)).filter(isOwnedNarrativeScript)
  const removed: Array<{ id: string; snapshot: NarrativeRegexMutationInput }> = []
  try {
    for (const script of owned) {
      if (!await api.delete(script.id, userId)) throw new Error(`Host declined removal of ${script.script_id || script.id}`)
      removed.push({ id: script.id, snapshot: createInputFromDto(script) })
    }
  } catch (error) {
    for (const row of removed.reverse()) await api.create(row.snapshot, userId).catch(() => undefined)
    throw error
  }
  const base = { status: 'removed' as const, variant, expected: narrativeRegexScripts(variant).length, installed: 0, healthy: 0, drifted: 0, blocked: 0, updatedAt: Date.now() }
  return { ...base, message: healthMessage(base) }
}

export function buildNarrativeUtilityPrompt(selectedNames: string[] = narrativeUtilityNames()): { content: string; utilityNames: string[] } {
  const allow = new Set(selectedNames)
  const items = narrativeUtilityItems().filter(item => allow.has(item.loomName) && String(item.loomContent || '').trim())
  return {
    content: items.length
      ? `<reverie_narrative_utility contract="narrative" version="${NARRATIVE_DLC_VERSION}" utilities="${items.map(item => applyNarrativeDisplayNames(item.loomName)).join(', ')}">\n${items.map(item => applyNarrativeDisplayNames(item.loomContent)).join('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n')}\n</reverie_narrative_utility>`
      : '',
    utilityNames: items.map(item => item.loomName),
  }
}
