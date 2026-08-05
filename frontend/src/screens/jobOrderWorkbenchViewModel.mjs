import { getSuggestedJobOrderWorkspaceStage } from '../lib/jobOrderWorkspaceStage.mjs'
import { getBookingReference, getJobOrderReference } from '../lib/businessReferenceDisplay.mjs'

export const STATUS_META = {
  draft: { label: 'Draft', cls: 'badge-gray' },
  assigned: { label: 'Assigned', cls: 'badge-blue' },
  in_progress: { label: 'In Progress', cls: 'badge-orange' },
  ready_for_qa: { label: 'Ready For QA', cls: 'badge-green' },
  blocked: { label: 'Blocked', cls: 'badge-orange' },
  finalized: { label: 'Finalized', cls: 'badge-green' },
  cancelled: { label: 'Cancelled', cls: 'badge-gray' },
}

export const WORKSHOP_STATUS_ACTION_LABELS = {
  in_progress: 'Start work',
  blocked: 'Mark blocked',
  ready_for_qa: 'Send to QA',
  cancelled: 'Cancel job order',
}

export const getSuggestedControlCenterStage = getSuggestedJobOrderWorkspaceStage

export function formatBookingReference(record) {
  return getBookingReference(record)
}

export function formatJobOrderReference(record) {
  return getJobOrderReference(record)
}

export const initialCreateState = {
  status: 'create_ready',
  message: '',
}

export const emptyCreateDraft = {
  notes: '',
  items: [],
  assignedTechnicianId: '',
  assignedSpecialty: '',
}

export const initialReadState = {
  status: 'detail_loaded',
  message: '',
}

export const initialStatusState = {
  status: 'status_update_ready',
  message: '',
}

export const initialAssignmentState = {
  status: 'assignment_ready',
  message: '',
}

export const initialProgressState = {
  status: 'progress_ready',
  message: '',
}

export const emptyProgressDraft = {
  workItemId: '',
  entryType: 'note',
  message: '',
  completedItemIds: [],
}

export const emptyPhotoDraft = {
  file: null,
  caption: '',
  linkedEntityType: 'job_order',
  linkedEntityId: '',
}

export const initialPhotoState = {
  status: 'photo_ready',
  message: '',
}

export const initialFinalizeState = {
  status: 'finalize_ready',
  message: '',
}

export const initialPaymentState = {
  status: 'payment_ready',
  message: '',
}

export const paymentMethodOptions = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'check', label: 'Check' },
  { value: 'other', label: 'Other' },
]

export const WORKBENCH_STAGE_META = {
  queue: { label: 'Queue' },
  overview: { label: 'Overview' },
  assignments: { label: 'Assignments' },
  progress: { label: 'Progress' },
  evidence: { label: 'Evidence' },
  qa: { label: 'QA handoff' },
  finalize: { label: 'Finalize' },
}

export const CONTROL_CENTER_STEP_ORDER = [
  { key: 'intake', label: 'Intake', workbenchStage: 'queue' },
  { key: 'job_order', label: 'Job order', workbenchStage: 'overview' },
  { key: 'assignments', label: 'Assignments', workbenchStage: 'assignments' },
  { key: 'progress', label: 'Progress', workbenchStage: 'progress' },
  { key: 'evidence', label: 'Evidence', workbenchStage: 'evidence' },
  { key: 'qa_audit', label: 'QA audit', workbenchStage: 'qa' },
  { key: 'finalize', label: 'Finalize', workbenchStage: 'finalize' },
  { key: 'payment', label: 'Payment', workbenchStage: 'finalize' },
]

export const assignmentRequiredStatuses = ['assigned', 'in_progress', 'blocked', 'ready_for_qa', 'finalized']

export const toDateKey = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const formatDate = (value) => {
  if (!value) return 'Unscheduled'
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export const formatDateTime = (value) => {
  if (!value) return 'Not available'
  return new Date(value).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const formatPesoAmount = (amountCents) => {
  if (!Number.isFinite(amountCents)) return 'PHP 0'
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(Math.round(amountCents / 100))
}

export const formatDateTimeInputValue = (value) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  const offset = parsed.getTimezoneOffset() * 60 * 1000
  return new Date(parsed.getTime() - offset).toISOString().slice(0, 16)
}

export const buildSuggestedFinalizationSummary = (jobOrder) => {
  if (!jobOrder) return ''
  if (jobOrder.invoiceRecord?.summary) return jobOrder.invoiceRecord.summary
  if (jobOrder.finalizationReadiness?.suggestedSummary) {
    return jobOrder.finalizationReadiness.suggestedSummary
  }

  const completedItems = Array.isArray(jobOrder.items)
    ? jobOrder.items.filter((item) => item?.isCompleted)
    : []
  if (completedItems.length === 0) return ''
  return completedItems
    .map((item) => item?.name)
    .filter(Boolean)
    .join(', ')
}

export const buildJobOrderNextAction = ({
  activeJobOrder,
  isTechnician,
  activeJobOrderNeedsAssignmentRepair,
  canFinalizeOrPay,
  isReadyForQaChecklistSatisfied,
}) => {
  if (!activeJobOrder) {
    return {
      title: 'Load a job order',
      body: 'Choose an active work order first so the workspace can show the correct operational actions for your role.',
      toneClass: 'border-surface-border bg-surface-raised/70 text-ink-primary',
    }
  }

  if (activeJobOrderNeedsAssignmentRepair) {
    return {
      title: 'Repair technician assignment first',
      body: 'This job order has no saved technician assignment. Save the team before trying to move it through live execution states.',
      toneClass: 'border-amber-500/20 bg-amber-500/10 text-amber-100',
    }
  }

  if (isTechnician) {
    if (activeJobOrder.status === 'assigned') {
      return {
        title: 'Start workshop execution',
        body: 'Start the first service so the adviser can see which workshop task is active.',
        toneClass: 'border-blue-500/20 bg-blue-500/10 text-blue-100',
      }
    }

    if (activeJobOrder.status === 'in_progress') {
      return {
        title: isReadyForQaChecklistSatisfied ? 'Send the completed work to QA' : 'Keep progress and evidence current',
        body: isReadyForQaChecklistSatisfied
          ? 'Workshop execution looks complete. Use the execution control to hand this job order off to QA now.'
          : 'Complete each service and its required photo proof, then send the visit to QA.',
        toneClass: isReadyForQaChecklistSatisfied
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100'
          : 'border-brand-orange/20 bg-brand-orange/10 text-amber-100',
      }
    }

    if (activeJobOrder.status === 'blocked') {
      return {
        title: 'Document the blocker',
        body: 'Open the affected service and record the blocker so the next handoff knows what must be cleared.',
        toneClass: 'border-red-500/20 bg-red-500/10 text-red-100',
      }
    }

    if (activeJobOrder.status === 'ready_for_qa') {
      return {
        title: 'Hand off to QA',
        body: 'Workshop execution is complete. Leave further release verdicts to QA Audit and avoid extra technician edits unless the work is sent back.',
        toneClass: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100',
      }
    }
  }

  if (activeJobOrder.status === 'assigned') {
    return {
      title: 'Start workshop execution',
      body: 'This job order is still Assigned. Move it to In Progress before QA handoff can unlock, even if progress notes or photos already exist.',
      toneClass: 'border-blue-500/20 bg-blue-500/10 text-blue-100',
    }
  }

  if (activeJobOrder.status === 'in_progress') {
    return {
      title: isReadyForQaChecklistSatisfied ? 'Send the completed work to QA' : 'Review execution and send to QA when complete',
      body: isReadyForQaChecklistSatisfied
        ? 'This job order already has the required work completion and evidence. Use the execution control to send it to QA now.'
        : 'Keep service updates and evidence current, then send the job order to QA once all services are complete.',
      toneClass: isReadyForQaChecklistSatisfied
        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100'
        : 'border-brand-orange/20 bg-brand-orange/10 text-amber-100',
    }
  }

  if (activeJobOrder.status === 'blocked') {
    return {
      title: 'Resolve the blocker before QA',
      body: 'The job order is currently blocked. Resume In Progress after documenting the issue and unblocking workshop work.',
      toneClass: 'border-red-500/20 bg-red-500/10 text-red-100',
    }
  }

  if (activeJobOrder.status === 'ready_for_qa') {
    return {
      title: 'Open QA review next',
      body: 'This job order is staged for QA. Use QA Audit for the release verdict before trying to finalize billing.',
      toneClass: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100',
    }
  }

  if (activeJobOrder.status === 'finalized' && !canFinalizeOrPay) {
    return {
      title: 'Invoice record is locked to adviser/admin',
      body: 'This work order is finalized. Payment recording and invoice actions stay with the responsible service adviser or a super admin.',
      toneClass: 'border-surface-border bg-surface-raised/70 text-ink-primary',
    }
  }

  if (activeJobOrder.status === 'finalized' && canFinalizeOrPay) {
    return {
      title: activeJobOrder.invoiceRecord?.paymentStatus === 'paid' ? 'Invoice is already settled' : 'Record or verify payment',
      body: activeJobOrder.invoiceRecord?.paymentStatus === 'paid'
        ? 'You can export the invoice PDF or refresh online settlement state if you need a fresh record copy.'
        : 'This job order is finalized. Use the finalization and payment panel to settle the invoice or start hosted checkout.',
      toneClass: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100',
    }
  }

  return {
    title: 'Use the active execution controls',
    body: 'Follow the role-filtered controls below: keep workshop progress current first, then move to QA and finance only when the work record is actually ready.',
    toneClass: 'border-surface-border bg-surface-raised/70 text-ink-primary',
  }
}

function getRoleBadgeClassName(roleKey) {
  switch (roleKey) {
    case 'qa':
      return 'badge-blue'
    case 'admin':
      return 'badge-orange'
    case 'workshop':
      return 'badge-green'
    default:
      return 'badge-gray'
  }
}

export function getControlCenterRoleMeta(roleKey) {
  const badgeClass = getRoleBadgeClassName(roleKey)
  switch (roleKey) {
    case 'qa':
    case 'admin':
    case 'workshop':
      return { label: 'Service adviser / admin', badgeClass }
    default:
      return { label: 'View only', badgeClass }
  }
}

export const formatStatusLabel = (value) =>
  STATUS_META[value]?.label ??
  String(value ?? '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
