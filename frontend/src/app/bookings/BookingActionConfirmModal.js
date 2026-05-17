'use client'

import ConfirmDialog from '@/components/ui/ConfirmDialog'

export default function BookingActionConfirmModal({
  visible,
  title = 'Confirm booking action',
  message,
  confirmLabel = 'Confirm',
  submitting = false,
  onCancel,
  onConfirm,
}) {
  return (
    <ConfirmDialog
      visible={visible}
      title={title}
      message={message}
      confirmLabel={confirmLabel}
      cancelLabel="Keep booking"
      tone="warning"
      submitting={submitting}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}
