export type SlotActionKind = 'reparse' | 'regenerate' | 'regenerate-with-direction' | 'repair-placement'
export type SlotActionFeedbackStatus = 'accepted' | 'rejected' | 'completed' | 'failed'

export type SlotActionFeedback = {
  submissionId: string
  key: string
  action: SlotActionKind
  status: SlotActionFeedbackStatus
  statusText?: string
  message?: string
  intent?: unknown
}

export type SlotActionSubmission = {
  submissionId: string
  key: string
  action: SlotActionKind
  statusText: string
  intent?: unknown
  dispatch: () => void
  closePopup: () => void
  setDisabled: (disabled: boolean) => void
  showPopupError: (message: string) => void
  restorePending?: () => void
  setBusy: (key: string, statusText: string, intent?: unknown) => void
  finishBusy: (key: string, status: 'completed' | 'failed', message?: string) => void
}

export class SlotActionFeedbackCoordinator {
  private readonly pending = new Map<string, SlotActionSubmission>()
  private readonly activeKeys = new Set<string>()

  submit(submission: SlotActionSubmission): boolean {
    if (this.activeKeys.has(submission.key)) return false
    this.activeKeys.add(submission.key)
    this.pending.set(submission.submissionId, submission)
    submission.setDisabled(true)
    submission.showPopupError('')
    try {
      submission.dispatch()
      return true
    } catch (error) {
      this.pending.delete(submission.submissionId)
      this.activeKeys.delete(submission.key)
      submission.setDisabled(false)
      submission.restorePending?.()
      submission.showPopupError(error instanceof Error ? error.message : String(error))
      return false
    }
  }

  handle(feedback: SlotActionFeedback): boolean {
    const submission = this.pending.get(feedback.submissionId)
    if (!submission || submission.key !== feedback.key || submission.action !== feedback.action) return false
    if (feedback.status === 'accepted') {
      submission.setBusy(feedback.key, feedback.statusText || submission.statusText, feedback.intent ?? submission.intent)
      submission.closePopup()
      return true
    }
    this.pending.delete(feedback.submissionId)
    this.activeKeys.delete(feedback.key)
    if (feedback.status === 'rejected') {
      submission.setDisabled(false)
      submission.restorePending?.()
      submission.showPopupError(feedback.message || 'Relay could not accept this action. Please retry.')
      return true
    }
    submission.finishBusy(feedback.key, feedback.status, feedback.message)
    return true
  }

  clear(): void {
    this.pending.clear()
    this.activeKeys.clear()
  }
}
