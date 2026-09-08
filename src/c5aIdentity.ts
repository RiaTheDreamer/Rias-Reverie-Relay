export type C5AIdentityKind = 'character' | 'persona'

export type C5AIdentitySubject = {
  id?: string
  name?: string
}

export type C5ANativeIdentityBinding = {
  kind: C5AIdentityKind
  subjectId: string
  subjectName: string
  presetId: string
  presetName: string
  prompt: string
  negativePrompt: string
  source: 'active-binding' | 'snapshot-binding' | 'direct-snapshot' | 'unresolved'
  diagnostics: string[]
}

export type C5ACastRequirements = {
  character: boolean
  persona: boolean
}

export type C5AIdentityCorrection = {
  prompt: string
  corrections: string[]
}

type UnknownRecord = Record<string, unknown>

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function record(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : {}
}

function first(...values: unknown[]): string {
  for (const value of values) {
    const found = clean(value)
    if (found) return found
  }
  return ''
}

function normalized(value: unknown): string {
  return clean(value).toLocaleLowerCase().replace(/[\s_-]+/g, '')
}

function bindingFromValue(value: unknown, subjectId: string): UnknownRecord {
  const direct = record(value)
  if (Object.keys(direct).length) return direct
  if (!value || typeof value !== 'object') return {}
  const map = value as Record<string, unknown>
  return record(map[subjectId])
}

function findBinding(settings: UnknownRecord, kind: C5AIdentityKind, subjectId: string): UnknownRecord {
  const capitalized = kind === 'character' ? 'Character' : 'Persona'
  const candidates: unknown[] = [
    settings[`bound${capitalized}Preset`],
    settings[`active${capitalized}Preset`],
    settings[`${kind}PresetBinding`],
    record(settings.presetBindings)[kind],
    record(settings.activePresetBindings)[kind],
    record(settings.nativePresetBindings)[kind],
    record(settings.presetBindings)[subjectId],
    record(settings.activePresetBindings)[subjectId],
    record(settings.nativePresetBindings)[subjectId],
  ]
  for (const candidate of candidates) {
    const found = bindingFromValue(candidate, subjectId)
    if (Object.keys(found).length) return found
  }
  return {}
}

function findPreset(settings: UnknownRecord, kind: C5AIdentityKind, presetId: string): UnknownRecord {
  const presets = Array.isArray(settings.promptPresets) ? settings.promptPresets : []
  return presets.map(record).find(candidate =>
    normalized(candidate.id) === normalized(presetId)
    && normalized(candidate.kind) === normalized(kind),
  ) || {}
}

/**
 * Resolves a prompt only from the native preset bound to the active subject.
 * Intentionally does not select a singleton preset: a host may have any number
 * of Character or Persona presets, and only the host binding is authoritative.
 */
export function resolveC5ANativeIdentityBinding(
  nativeSettings: Record<string, unknown> | undefined,
  kind: C5AIdentityKind,
  subject: C5AIdentitySubject | null | undefined,
): C5ANativeIdentityBinding {
  const settings = record(nativeSettings)
  const subjectId = clean(subject?.id)
  const subjectName = clean(subject?.name) || `active ${kind}`
  const capitalized = kind === 'character' ? 'Character' : 'Persona'
  const diagnostics: string[] = []
  const binding = findBinding(settings, kind, subjectId)
  const presetId = first(
    binding.preset_id,
    binding.presetId,
    binding.id,
    settings[`bound${capitalized}PresetId`],
    settings[`active${capitalized}PresetId`],
    settings[`resolved${capitalized}PresetId`],
  )
  const preset = presetId ? findPreset(settings, kind, presetId) : {}
  const directPrompt = first(
    binding.prompt,
    binding.resolvedPrompt,
    binding.visualPrompt,
    settings[`bound${capitalized}Prompt`],
    settings[`resolved${capitalized}Prompt`],
  )
  const prompt = first(preset.prompt, directPrompt)
  const directNegativePrompt = first(
    binding.negativePrompt,
    binding.negative_prompt,
    binding.resolvedNegativePrompt,
    settings[`bound${capitalized}NegativePrompt`],
    settings[`resolved${capitalized}NegativePrompt`],
  )
  const negativePrompt = first(preset.negativePrompt, preset.negative_prompt, preset.negative, directNegativePrompt)
  const presetName = first(preset.name, binding.preset_name, binding.presetName, presetId)

  if (presetId && prompt) {
    return {
      kind, subjectId, subjectName, presetId, presetName, prompt, negativePrompt,
      source: Object.keys(binding).length ? 'active-binding' : 'snapshot-binding',
      diagnostics,
    }
  }
  if (directPrompt) {
    diagnostics.push(`${kind} binding exposed a resolved prompt without a preset id.`)
    return {
      kind, subjectId, subjectName, presetId: '', presetName: '', prompt: directPrompt, negativePrompt: directNegativePrompt,
      source: 'direct-snapshot', diagnostics,
    }
  }
  if (presetId) diagnostics.push(`Bound ${kind} preset "${presetId}" was not present in the native snapshot.`)
  else diagnostics.push(`No active ${kind} preset binding was available in the native snapshot.`)
  return { kind, subjectId, subjectName, presetId, presetName, prompt: '', negativePrompt, source: 'unresolved', diagnostics }
}

export function c5aCastRequirements(cast: string | undefined): C5ACastRequirements {
  return {
    character: cast === 'char' || cast === 'char+user',
    persona: cast === 'user' || cast === 'char+user',
  }
}

function promptHasIdentity(prompt: string, identity: string): boolean {
  const normalizedPrompt = normalized(prompt)
  const normalizedIdentity = normalized(identity)
  return normalizedIdentity.length > 12 && normalizedPrompt.includes(normalizedIdentity)
}

/**
 * Keeps scene language intact while removing only cardinality/gender phrases
 * that contradict known active cast identities. Native identity anchors are
 * appended once, so a Story Model visual_prompt cannot erase them.
 */
export function enforceC5AKnownIdentity(
  prompt: string,
  bindings: C5ANativeIdentityBinding[],
): C5AIdentityCorrection {
  const known = bindings.filter(binding => Boolean(binding.prompt))
  if (!known.length) return { prompt, corrections: [] }
  let next = prompt
  const corrections: string[] = []
  const character = known.find(binding => binding.kind === 'character')
  const persona = known.find(binding => binding.kind === 'persona')
  if (character && persona) {
    const before = next
    next = next
      // Story Model shorthand frequently describes a pairing instead of the
      // authoritative active Character + Persona. Remove the shorthand, not
      // the surrounding setting, action, camera, or independently named NPCs.
      .replace(/\b(?:(?:a\s+)?pair\s+of|(?:2|two))\s+(?:(?:young|adult|teenage|female|male|beautiful|handsome|slender|tall|short|two)\s+){0,4}(?:girls?|boys?|women|men|female(?:\s+(?:figures?|subjects?|people))?|male(?:\s+(?:figures?|subjects?|people))?)\b/gi, '')
      .replace(/\b(?:2girls?|2boys?|1girl\s*,\s*1girl|1boy\s*,\s*1boy)\b/gi, '')
      .replace(/\s*,\s*,+/g, ', ')
      .replace(/^\s*,\s*|\s*,\s*$/g, '')
      .trim()
    if (next !== before) corrections.push('Removed a Story Model gender/cardinality phrase that conflicted with the active Character + Persona bindings.')
  }
  const anchors = known
    .filter(binding => !promptHasIdentity(next, binding.prompt))
    .map(binding => `${binding.kind === 'character' ? 'Active Character' : 'Active Persona'} (${binding.subjectName}): ${binding.prompt}`)
  if (anchors.length) {
    next = `${anchors.join(', ')}, ${next}`.replace(/\s*,\s*,+/g, ', ').trim()
    corrections.push(`Applied ${anchors.length} authoritative native identity anchor${anchors.length === 1 ? '' : 's'}.`)
  }
  return { prompt: next, corrections }
}
