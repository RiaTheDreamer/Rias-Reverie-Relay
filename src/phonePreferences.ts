import type {PhoneDeviceState} from './phoneDevice'
import {normalizePhoneIncoming, type PhoneIncomingSettings} from './phoneIncomingSettings'

/** User preferences only. Never store an inbox, owner, scene or RP record here. */
export type PhonePreferences = {
  connectionId: string | null
  autoReply: boolean
  contextMode: 'automatic' | 'manual'
  incoming: PhoneIncomingSettings
}
export function normalizePhonePreferences(value: Partial<PhonePreferences>): PhonePreferences {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Phone preferences are damaged. Existing inboxes were preserved.')
  if(value.connectionId!==undefined&&value.connectionId!==null&&(typeof value.connectionId!=='string'||value.connectionId.length>150))throw new Error('Choose a valid phone reply connection.')
  if(value.contextMode!==undefined&&!['automatic','manual'].includes(value.contextMode))throw new Error('Choose Automatic or Manual phone context.')
  if(value.autoReply!==undefined&&typeof value.autoReply!=='boolean')throw new Error('Choose Automatic or Manual phone replies.')
  return {connectionId:value.connectionId||null,autoReply:value.autoReply!==false,contextMode:value.contextMode||'automatic',incoming:normalizePhoneIncoming(value.incoming)}
}
export function applyPhonePreferences(state: PhoneDeviceState, preferences?: PhonePreferences): PhoneDeviceState {
  return preferences?{...state,...normalizePhonePreferences(preferences)}:state
}
