import type {PhoneDeviceState} from './phoneDevice'

export const phoneArchivePath=(chatId:string)=>`phone-archive/${encodeURIComponent(chatId)}.json`
/** An older general-state writer must not own or erase the phone archive. */
export function latestPhoneArchive(primary:PhoneDeviceState|undefined,checkpoint:PhoneDeviceState|null):PhoneDeviceState|undefined {
  if(!checkpoint)return primary
  if(!primary||Number(checkpoint.revision)>Number(primary.revision))return checkpoint
  return primary
}
