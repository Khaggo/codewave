export const getCollectionsWorkflowGuidance = ({
  isTerminalInquiry = false,
  selectedActionState = {},
  selectedInquiry,
  selectedRow,
} = {}) => {
  const headline = !selectedInquiry
    ? 'Pick a collections case first'
    : isTerminalInquiry
      ? 'This case is read only'
      : selectedActionState.canMarkAsPaid
        ? 'Payment proof is ready for final confirmation'
        : selectedActionState.canReviewProofOfPayment
          ? 'Proof is ready for review'
          : selectedActionState.canSendPaymentReminder
            ? 'This case still needs collections follow-up'
            : 'Use this panel to keep payment metadata up to date'

  const detail = !selectedInquiry
    ? 'The workflow panel unlocks after you choose a live collections case from the queue.'
    : isTerminalInquiry
      ? 'Closed, cancelled, and rejected inquiries stay visible for history but cannot be edited here.'
      : selectedRow?.daysOverdue > 0
        ? `The case is already ${selectedRow.daysOverdue} day${selectedRow.daysOverdue === 1 ? '' : 's'} overdue, so overdue tagging and reminders should be your first check.`
        : selectedActionState.canReviewProofOfPayment
          ? 'Start verification when the uploaded proof looks complete, then mark the case paid only after staff confirmation.'
          : 'Save status, due date, and review notes together so the next collections handoff is easy to understand.'

  const tone =
    !selectedInquiry || isTerminalInquiry
      ? 'neutral'
      : selectedActionState.canSendPaymentReminder || selectedRow?.daysOverdue > 0
        ? 'warning'
        : selectedActionState.canReviewProofOfPayment ||
            selectedActionState.canMarkAsPaid
          ? 'positive'
          : 'neutral'

  return { detail, headline, tone }
}
