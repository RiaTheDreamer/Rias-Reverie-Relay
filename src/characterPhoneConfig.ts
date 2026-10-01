export const CHARACTER_PHONE_APPS = [
  ['messages', 'Messages'],
  ['photos', 'Photos'],
  ['browser', 'Browser'],
  ['diary', 'Diary'],
  ['contacts', 'Contacts'],
  ['banking', 'Banking'],
  ['vault', 'Vault'],
  ['wardrobe', 'Wardrobe'],
  ['music', 'Music'],
  ['calendar', 'Calendar'],
  ['maps', 'Maps'],
  ['mail', 'Mail'],
  ['voice-memos', 'Voice Memos'],
  ['social', 'Social'],
  ['shopping', 'Shopping'],
  ['delivery', 'Delivery'],
  ['ride-history', 'Ride History'],
  ['files', 'Files'],
  ['health', 'Health'],
] as const

export type CharacterPhoneAppId = typeof CHARACTER_PHONE_APPS[number][0]

export const ORIGINAL_CHARACTER_PHONE_DEFAULT_APPS: CharacterPhoneAppId[] = [
  'messages', 'photos', 'browser', 'diary', 'contacts', 'banking', 'vault', 'wardrobe',
]

const APP_IDS = new Set<CharacterPhoneAppId>(CHARACTER_PHONE_APPS.map(([id]) => id))
const APP_LABELS = new Map<CharacterPhoneAppId, string>(CHARACTER_PHONE_APPS)

export function isCharacterPhoneAppId(value: unknown): value is CharacterPhoneAppId {
  return typeof value === 'string' && APP_IDS.has(value as CharacterPhoneAppId)
}

/**
 * Missing configuration is an upgrade state and intentionally restores the
 * historical eight-app phone. An explicit empty array is a real preference:
 * Relay then asks the Story Model to choose all eight apps contextually.
 */
export function normalizeCharacterPhoneDefaultApps(
  value: unknown,
  options: { migrateMissing?: boolean } = {},
): CharacterPhoneAppId[] {
  if (!Array.isArray(value)) return options.migrateMissing === false ? [] : [...ORIGINAL_CHARACTER_PHONE_DEFAULT_APPS]
  const unique: CharacterPhoneAppId[] = []
  for (const candidate of value) {
    if (!isCharacterPhoneAppId(candidate) || unique.includes(candidate)) continue
    unique.push(candidate)
    if (unique.length === 8) break
  }
  return unique
}

export function characterPhoneAppLabel(id: CharacterPhoneAppId): string {
  return APP_LABELS.get(id) || id
}

export function buildCharacterPhoneRuntimeDirective(defaultAppsInput: unknown): string {
  const defaults = normalizeCharacterPhoneDefaultApps(defaultAppsInput)
  const contextual = CHARACTER_PHONE_APPS.map(([id]) => id).filter(id => !defaults.includes(id))
  const defaultLines = defaults.map((id, index) => `${index + 1}. ${characterPhoneAppLabel(id)}`).join('\n')
  const common = [
    'Rules:',
    '- exactly 8 cp_app blocks total;',
    '- cp_slot 1–8 exactly once;',
    '- never duplicate an app;',
    '- use only the canonical app catalog;',
    '- ground contextual apps in established story facts, traits, relationships, routine, and ordinary plausible off-screen activity;',
    '- do not invent major unseen events merely to justify an app;',
    '- recent RP is continuity context, not content that must be copied into every app.',
  ].join('\n')
  let layout: string
  if (defaults.length === 8) {
    layout = `All eight app slots are user-defined. Keep these apps exactly in slots 1–8:\n${defaultLines}\n\nDo not replace any app contextually.`
  } else if (defaults.length === 0) {
    layout = `Choose exactly eight distinct apps from the complete canonical Character Phone app catalog according to current story relevance.\n\nAllowed contextual app pool:\n${CHARACTER_PHONE_APPS.map(([, label]) => label).join(' · ')}`
  } else {
    const firstContextSlot = defaults.length + 1
    layout = `The user has configured these mandatory Character Phone default apps, in slot order:\n${defaultLines}\n\nKeep those apps exactly in slots 1–${defaults.length}. Fill slots ${firstContextSlot}–8 with exactly ${8 - defaults.length} distinct context-relevant apps.\n\nAllowed contextual app pool:\n${contextual.map(characterPhoneAppLabel).join(' · ')}`
  }
  return `<reverie_character_phone_layout defaults="${defaults.length}" context_slots="${8 - defaults.length}">\nCHARACTER PHONE — ACTIVE APP LAYOUT\n\n${layout}\n\n${common}\n</reverie_character_phone_layout>`
}

export type CharacterPhoneAppAudit = {
  appCount: number
  slots: number[]
  duplicateSlots: number[]
  missingSlots: number[]
  appNames: string[]
  duplicateApps: string[]
  missingMandatoryDefaults: string[]
  unexpectedDefaultSlot: Array<{ app: string; expectedSlot: number; actualSlot: number | null }>
  unknownApps: string[]
  valid: boolean
}

function bracketValue(source: string, tag: string): string {
  return new RegExp(`\\[${tag}\\]\\s*([\\s\\S]*?)\\s*\\[\\/${tag}\\]`, 'i').exec(source)?.[1]?.trim() || ''
}

export function auditCharacterPhoneApps(markup: string, defaultsInput: unknown): CharacterPhoneAppAudit {
  const defaults = normalizeCharacterPhoneDefaultApps(defaultsInput)
  const apps = [...String(markup || '').matchAll(/\[cp_app\]([\s\S]*?)\[\/cp_app\]/gi)].map(match => match[1])
  const slots = apps.map(app => Number(bracketValue(app, 'cp_slot'))).filter(Number.isFinite)
  const appNames = apps.map(app => bracketValue(app, 'cp_name')).filter(Boolean)
  const normalizedNames = appNames.map(name => name.trim().toLocaleLowerCase())
  const duplicateValues = <T extends string | number>(values: T[]) => [...new Set(values.filter((value, index) => values.indexOf(value) !== index))]
  const duplicateSlots = duplicateValues(slots)
  const duplicateApps = duplicateValues(normalizedNames)
  const missingSlots = Array.from({ length: 8 }, (_, index) => index + 1).filter(slot => !slots.includes(slot))
  const knownLabels = new Set(CHARACTER_PHONE_APPS.map(([, label]) => label.toLocaleLowerCase()))
  const unknownApps = appNames.filter(name => !knownLabels.has(name.toLocaleLowerCase()))
  const missingMandatoryDefaults = defaults
    .filter((id, index) => normalizedNames[index] !== characterPhoneAppLabel(id).toLocaleLowerCase())
    .map(characterPhoneAppLabel)
  const unexpectedDefaultSlot = defaults.flatMap((id, index) => {
    const expected = index + 1
    const actual = normalizedNames.indexOf(characterPhoneAppLabel(id).toLocaleLowerCase())
    return actual === index ? [] : [{ app: characterPhoneAppLabel(id), expectedSlot: expected, actualSlot: actual < 0 ? null : slots[actual] || null }]
  })
  const valid = apps.length === 8 && slots.length === 8 && duplicateSlots.length === 0 && missingSlots.length === 0
    && duplicateApps.length === 0 && unknownApps.length === 0 && missingMandatoryDefaults.length === 0 && unexpectedDefaultSlot.length === 0
  return { appCount: apps.length, slots, duplicateSlots, missingSlots, appNames, duplicateApps, missingMandatoryDefaults, unexpectedDefaultSlot, unknownApps, valid }
}
