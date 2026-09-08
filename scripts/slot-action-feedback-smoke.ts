import { SlotActionFeedbackCoordinator } from '../src/slotActionFeedback'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function fixture(action: 'reparse' | 'regenerate' | 'regenerate-with-direction' | 'repair-placement', shouldThrow = false, closeParent = false) {
  const events: string[] = []
  let disabled = false
  let popupOpen = true
  let parentLightboxOpen = true
  let popupError = ''
  let busyText = ''
  let preservedIntent: unknown
  const coordinator = new SlotActionFeedbackCoordinator()
  const submissionId = `${action}-1`
  const intent = action === 'regenerate-with-direction' ? { id: 'custom', label: 'Custom Direction', customText: 'Use the rainy angle.', negativeDelta: 'avoid a tight crop', aspectRatio: '3:4' } : undefined
  const submission = {
    submissionId, key: 'slot-1', action, statusText: action === 'reparse' ? 'Reparsing…' : action === 'repair-placement' ? 'Repairing placement…' : 'Applying direction…', intent,
    dispatch: () => { events.push('dispatch'); if (shouldThrow) throw new Error('Dispatch unavailable') },
    closePopup: () => { popupOpen = false; if (closeParent) parentLightboxOpen = false; events.push('close') },
    setDisabled: (value: boolean) => { disabled = value; events.push(value ? 'disabled' : 'enabled') },
    showPopupError: (message: string) => { popupError = message },
    setBusy: (_key: string, text: string, submittedIntent?: unknown) => { busyText = text; preservedIntent = submittedIntent; events.push('busy') },
    finishBusy: (_key: string, status: 'completed' | 'failed', message?: string) => { busyText = status === 'completed' ? 'Completed.' : message || 'Failed.'; events.push(status) },
  }
  return { coordinator, submission, submissionId, intent, events, read: () => ({ disabled, popupOpen, parentLightboxOpen, popupError, busyText, preservedIntent }) }
}

for (const action of ['reparse', 'regenerate', 'regenerate-with-direction', 'repair-placement'] as const) {
  const test = fixture(action, false, true)
  assert(test.coordinator.submit(test.submission), `${action} should dispatch once`)
  assert(!test.coordinator.submit({ ...test.submission, submissionId: `${test.submissionId}-duplicate` }), `${action} should prevent duplicate submission clicks`)
  assert(test.read().disabled && test.read().popupOpen, `${action} should disable while awaiting acceptance without closing early`)
  test.coordinator.handle({ submissionId: test.submissionId, key: 'slot-1', action, status: 'accepted', statusText: test.submission.statusText, intent: test.intent })
  assert(!test.read().popupOpen && !test.read().parentLightboxOpen, `${action} should close the accepting popup and its owning lightbox after accepted dispatch`)
  assert(Boolean(test.read().busyText), `${action} should immediately expose a slot busy state`)
  if (action === 'regenerate-with-direction') assert(JSON.stringify(test.read().preservedIntent) === JSON.stringify(test.intent), 'direction submission should preserve the selected intent')
  test.coordinator.handle({ submissionId: test.submissionId, key: 'slot-1', action, status: 'completed' })
  assert(test.read().busyText === 'Completed.', `${action} final success should replace the temporary busy state`)
}

const rejected = fixture('reparse')
assert(rejected.coordinator.submit(rejected.submission), 'failed dispatch fixture should initially submit')
rejected.coordinator.handle({ submissionId: rejected.submissionId, key: 'slot-1', action: 'reparse', status: 'rejected', message: 'Request metadata missing' })
assert(rejected.read().popupOpen && !rejected.read().disabled && rejected.read().popupError === 'Request metadata missing', 'rejected dispatch should keep popup open, show error, and permit retry')

const unrelated = fixture('regenerate')
assert(unrelated.coordinator.submit(unrelated.submission), 'normal slot action should submit')
unrelated.coordinator.handle({ submissionId: unrelated.submissionId, key: 'slot-1', action: 'regenerate', status: 'accepted' })
assert(!unrelated.read().popupOpen && unrelated.read().parentLightboxOpen, 'a normal slot action must not close an unrelated parent popup')

const failed = fixture('regenerate-with-direction')
failed.coordinator.submit(failed.submission)
failed.coordinator.handle({ submissionId: failed.submissionId, key: 'slot-1', action: 'regenerate-with-direction', status: 'accepted' })
failed.coordinator.handle({ submissionId: failed.submissionId, key: 'slot-1', action: 'regenerate-with-direction', status: 'failed', message: 'Generation failed' })
assert(failed.read().busyText === 'Generation failed', 'final action error should replace the temporary busy state')

const repairFailed = fixture('repair-placement')
repairFailed.coordinator.submit(repairFailed.submission)
repairFailed.coordinator.handle({ submissionId: repairFailed.submissionId, key: 'slot-1', action: 'repair-placement', status: 'accepted', statusText: 'Repairing placement…' })
assert(repairFailed.read().busyText === 'Repairing placement…', 'repair placement should expose an immediate repairing busy state')
repairFailed.coordinator.handle({ submissionId: repairFailed.submissionId, key: 'slot-1', action: 'repair-placement', status: 'failed', message: 'No deterministic slot anchor found' })
assert(repairFailed.read().busyText === 'No deterministic slot anchor found', 'repair placement failure should replace the temporary busy state with a clear reason')

for (let iteration = 0; iteration < 200; iteration += 1) {
  const soak = fixture('reparse')
  assert(soak.coordinator.submit(soak.submission), `listener soak ${iteration} should submit once`)
  soak.coordinator.handle({ submissionId: soak.submissionId, key: 'slot-1', action: 'reparse', status: 'accepted' })
  soak.coordinator.handle({ submissionId: soak.submissionId, key: 'slot-1', action: 'reparse', status: 'completed' })
  assert(soak.events.filter(event => event === 'dispatch').length === 1, `listener soak ${iteration} must not duplicate dispatch`)
}

console.log('Slot action feedback smoke passed.')
