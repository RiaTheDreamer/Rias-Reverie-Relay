export type PhoneIncomingSettings = { frequency: 'model' | 'every' | 'every-n'; everyN: number; maxNotifications: number }
export const DEFAULT_PHONE_INCOMING: PhoneIncomingSettings = { frequency: 'model', everyN: 3, maxNotifications: 3 }
export function normalizePhoneIncoming(value: unknown): PhoneIncomingSettings {
  if (value === undefined) return { ...DEFAULT_PHONE_INCOMING }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Incoming phone settings are damaged. Existing messages were preserved.')
  const row = value as Partial<PhoneIncomingSettings>
  if (!['model', 'every', 'every-n'].includes(row.frequency || '') || !Number.isInteger(row.everyN) || row.everyN! < 1 || row.everyN! > 100
    || !Number.isInteger(row.maxNotifications) || row.maxNotifications! < 0 || row.maxNotifications! > 10) throw new Error('Choose a valid phone frequency, interval (1–100) and notification limit (0–10).')
  return { frequency: row.frequency!, everyN: row.everyN!, maxNotifications: row.maxNotifications! }
}
/** Read-only ordinal: preview/retries never increment a hidden generation counter. */
export function phoneIncomingDirective(settings: PhoneIncomingSettings, completedReplies: number): string {
  const ordinal = Math.max(0, Math.floor(completedReplies)) + 1
  const due = settings.frequency !== 'every-n' || ordinal % settings.everyN === 0
  const cadence = settings.frequency === 'model' ? 'Model determined: decide whether an incoming text fits this scene.'
    : settings.frequency === 'every' ? 'Every eligible story response: include at least one plausible incoming text when an established sender can text a recipient.'
    : `Every ${settings.everyN} eligible story responses. This is response ${ordinal}: ${due ? 'an incoming-text opportunity is due' : 'no incoming texts are due; do not output incoming-text controls in this response'}.`
  return `<incoming_text_settings frequency="${settings.frequency}" interval="${settings.everyN}" max_notifications="${settings.maxNotifications}" response="${ordinal}" due="${due && settings.maxNotifications > 0}">\n${settings.maxNotifications === 0 ? 'Incoming text notifications are disabled. Do not output incoming-text controls.' : cadence}\nNever exceed ${settings.maxNotifications} incoming text notifications in one response. Use established participants and plausible scene facts, not repeated filler notifications.\n</incoming_text_settings>`
}
