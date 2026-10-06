import { createStorySourceRef, storyFingerprint, type StoryEventCandidate } from '../src/storyState'

export const storyLine = 'Minho revealed the leaked photograph to Jaehyun during the press conference.'
export const storySource = (messageId = 'message-1', content = storyLine, swipeId = 0) => createStorySourceRef({
  chatId: 'story-smoke-chat', messageId, swipeId, role: 'assistant', content, excerpt: content.slice(0, 200), createdAt: 100,
})

export const eventCandidate = (patch: Partial<StoryEventCandidate> = {}): StoryEventCandidate => ({
  title: 'The photograph is revealed',
  summary: 'Minho reveals the leaked photograph to Jaehyun during a press conference.',
  eventType: 'public', importance: 'major', confidence: 0.96,
  anchor: 'Minho revealed the leaked photograph to Jaehyun',
  participants: [{ name: 'Minho', role: 'source' }, { name: 'Jaehyun', role: 'recipient' }],
  ...patch,
})

export function phoneFixture(source = storySource('phone-turn', 'Jaehyun opened his phone.')): string {
  return `[character_phone]
[cp_owner]Jaehyun[/cp_owner]
[cp_app]
[cp_name]Messages[/cp_name]
[cp_content]
[cp_msg][cp_side]other[/cp_side][cp_name]Minho[/cp_name][cp_time]21:04[/cp_time][cp_text]The local paper published the photograph.[/cp_text][/cp_msg]
[cp_photo][cp_title]Press conference photo[/cp_title][cp_meta]21:05 · Seoul[/cp_meta][cp_media]<image_request id="phone-photo-1" target="smartphone.message-image" slot="message-image-1"></image_request>[/cp_media][/cp_photo]
[/cp_content]
[/cp_app]
[/character_phone]`
}

export const fingerprintFor = (value: string) => storyFingerprint(value)
