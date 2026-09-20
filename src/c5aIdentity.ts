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
  rawPrompt: string
  removedSceneFragments: string[]
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
  appliedIdentityBindingIds: string[]
  identityAnchorChars: number
  duplicateIdentityFragmentsRemoved: number
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

const C5A_SCENE_DEPENDENT_FRAGMENT_PATTERNS: RegExp[] = [
  /^(?:solo|[1-9]\s*(?:boy|girl|man|woman|person|people)s?|[1-9](?:boy|girl)s?)$/i,
  /\b(?:looking (?:at|toward|into|away|up|down)|direct (?:camera )?gaze|eye contact|gaze direction|facing (?:the )?camera)\b/i,
  /\b(?:smirk(?:ing)?|smil(?:e|ing)|frown(?:ing)?|temporary expression|charismatic expression|angry expression|sad expression|happy expression)\b/i,
  /\b(?:swimming|standing|sitting|seated|kneeling|lying|reclining|walking|running|jumping|fighting|dancing|holding|gripping|reaching|gesture|dynamic pose|graceful pose|action pose)\b/i,
  /\b(?:powerful|graceful|dynamic)\s+(?:tail|body|silhouette)\s+(?:curve|arc|motion)\b/i,
  /\b(?:flowing|floating|billowing|windblown)\s+(?:hair|fabric|clothes?|garments?|ribbons?|accessories)\b/i,
  /\b(?:close[- ]?up|medium shot|wide shot|full body shot|cowboy shot|over[- ]the[- ]shoulder|low angle|high angle|camera angle|composition|framing|portrait)\b/i,
  /\b(?:background|environment|cave|cavern|palace|kingdom|forest|cityscape|bedroom|beach|coral|plants?)\b/i,
  /^(?:underwater|indoors?|outdoors?)$/i,
  /\b(?:bubbles?|glowing particles?|floating particles?|warm volcanic rock|highly detailed water|water surface|ocean backdrop)\b/i,
  /\b(?:lighting|rim light|light rays?|bokeh|depth of field|atmosphere|backlit|volumetric light|cinematic light)\b/i,
  /\b(?:ethereal glow|beautiful detailed eyes|detailed hair|intricate scales|high detail)\b/i,
  /\b(?:luxurious royal appearance|fantasy royal aesthetic|regal masculine styling|presentation styling)\b/i,
  /\b(?:anime|manga|manhwa|photorealistic|illustration style|art style|oil painting|watercolor)\b/i,
  /\b(?:masterpiece|best quality|high quality|ultra[- ]detailed|absurdres|highres|8k|4k)\b/i,
  // Native generation presets also contain mutable form, dress, accessories,
  // and temporary state. None of those are durable identity anchors; the
  // authored/current scene owns them.
  /\b(?:merman|mermaid|merfolk|siren form|human form|humanoid form|transformed form)\b/i,
  /\b(?:tail|tailfin|tail fins?|fins?|scales?|gills?|webbed (?:hands?|feet)|legs? (?:fully )?fused|no (?:human )?legs?|no knees?|no feet|human legs?|bipedal legs?)\b/i,
  /\b(?:wearing|clothing|clothes?|outfit|wardrobe|dress|robe|wrap|shirt|top|trousers|pants|skirt|uniform|armor|jacket|coat|sea[- ]silk|fabric|embroidery)\b/i,
  /\b(?:jewelry|jewellery|ear cuffs?|earrings?|necklace|bracelets?|arm cuffs?|chains?|hair ornaments?|crown(?:-like)? ornament|pearls?|rub(?:y|ies)|accessories?)\b/i,
  /\b(?:topless|shirtless|nude|naked|bare[- ]chested|open[- ]chest|wet|damp|soaked|injured|bruised|bleeding|wounded)\b/i,
  /\b(?:bioluminescen\w*|luminous scales?|iridescen\w*|metallic sheen|royal markings?|scale texture)\b/i,
  /\b(?:crown prince|siren prince|sea prince|princess|king|queen|royal title)\b/i,
]

/** Project a native Character/Persona preset down to facts that remain true
 * when the scene, camera, action, expression, and rendering style change. */
export function sanitizeC5AIdentityPrompt(prompt: string): { prompt: string; removed: string[] } {
  const kept: string[] = []
  const removed: string[] = []
  const seen = new Set<string>()
  for (const rawFragment of clean(prompt).split(/[,;\n]+/)) {
    const fragment = rawFragment.trim().replace(/\s+/g, ' ')
    if (!fragment) continue
    if (C5A_SCENE_DEPENDENT_FRAGMENT_PATTERNS.some(pattern => pattern.test(fragment))) {
      removed.push(fragment)
      continue
    }
    const key = normalized(fragment)
    if (!key || seen.has(key)) continue
    seen.add(key)
    kept.push(fragment)
  }
  return { prompt: kept.join(', '), removed }
}

export function c5aIdentityBindingId(binding: Pick<C5ANativeIdentityBinding, 'kind' | 'presetId' | 'subjectId' | 'subjectName'>): string {
  return `${binding.kind}:${normalized(binding.presetId) || normalized(binding.subjectId) || normalized(binding.subjectName)}`
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
  const rawPrompt = first(preset.prompt, directPrompt)
  const identityProjection = sanitizeC5AIdentityPrompt(rawPrompt)
  const prompt = identityProjection.prompt
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
      kind, subjectId, subjectName, presetId, presetName, prompt, rawPrompt, removedSceneFragments: identityProjection.removed, negativePrompt,
      source: Object.keys(binding).length ? 'active-binding' : 'snapshot-binding',
      diagnostics,
    }
  }
  if (directPrompt) {
    diagnostics.push(`${kind} binding exposed a resolved prompt without a preset id.`)
    return {
      kind, subjectId, subjectName, presetId: '', presetName: '', prompt, rawPrompt, removedSceneFragments: identityProjection.removed, negativePrompt: directNegativePrompt,
      source: 'direct-snapshot', diagnostics,
    }
  }
  if (presetId) diagnostics.push(`Bound ${kind} preset "${presetId}" was not present in the native snapshot.`)
  else diagnostics.push(`No active ${kind} preset binding was available in the native snapshot.`)
  return { kind, subjectId, subjectName, presetId, presetName, prompt: '', rawPrompt, removedSceneFragments: identityProjection.removed, negativePrompt, source: 'unresolved', diagnostics }
}

export function c5aCastRequirements(cast: string | undefined): C5ACastRequirements {
  return {
    character: cast === 'char' || cast === 'char+user',
    persona: cast === 'user' || cast === 'char+user',
  }
}

/**
 * Keeps scene language intact while removing only cardinality/gender phrases
 * that contradict known active cast identities. Native identity anchors are
 * appended once, so a Story Model visual_prompt cannot erase them.
 */
export function enforceC5AKnownIdentity(
  prompt: string,
  bindings: C5ANativeIdentityBinding[],
  appliedIdentityBindingIds: Iterable<string> = [],
): C5AIdentityCorrection {
  const known = bindings.filter(binding => Boolean(binding.prompt))
  const structurallyApplied = new Set(appliedIdentityBindingIds)
  if (!known.length) return { prompt, corrections: [], appliedIdentityBindingIds: [...structurallyApplied], identityAnchorChars: 0, duplicateIdentityFragmentsRemoved: 0 }
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
  const duplicateIdentityFragmentsRemoved = known
    .filter(binding => structurallyApplied.has(c5aIdentityBindingId(binding)))
    .reduce((total, binding) => total + binding.prompt.length, 0)
  const anchors = known
    .filter(binding => !structurallyApplied.has(c5aIdentityBindingId(binding)))
    .map(binding => `${binding.kind === 'character' ? 'Active Character' : 'Active Persona'} (${binding.subjectName}): ${binding.prompt}`)
  if (anchors.length) {
    next = `${next}, ${anchors.join(', ')}`.replace(/\s*,\s*,+/g, ', ').trim()
    corrections.push(`Applied ${anchors.length} authoritative native identity anchor${anchors.length === 1 ? '' : 's'}.`)
  }
  for (const binding of known) structurallyApplied.add(c5aIdentityBindingId(binding))
  return {
    prompt: next,
    corrections,
    appliedIdentityBindingIds: [...structurallyApplied],
    identityAnchorChars: anchors.join(', ').length,
    duplicateIdentityFragmentsRemoved,
  }
}
