'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileStack,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Wrench,
} from 'lucide-react'

import { getDailySchedule } from '@/lib/bookingStaffClient'
import { ApiError } from '@/lib/authClient'
import { useUser } from '@/lib/userContext'
import {
  buildBookingJobOrderHandoffCandidate,
  buildJobOrderCreateDraftFromCandidate,
  getAllowedJobOrderStatusTargets,
  getJobOrderWorkbenchHandoffState,
  getSelectedJobOrderHandoffCandidate,
  staffJobOrderWorkbenchRoles,
} from '@/lib/api/generated/job-orders/staff-web-workbench'
import {
  canStaffAppendProgress,
  canStaffCreateEvidencePhoto,
  canStaffFinalizeOrRecordPayment,
  canStaffReadExecutionJobOrder,
  getJobOrderExecutionPhase,
} from '@/lib/api/generated/job-orders/staff-web-execution'
import {
  createJobOrderFromBooking,
  addJobOrderPhotoEvidence,
  addJobOrderProgressEntry,
  exportJobOrderInvoicePdf,
  finalizeJobOrder,
  getJobOrderById,
  listJobOrderWorkbenchCalendar,
  listJobOrderWorkbenchSummaries,
  recordJobOrderInvoicePayment,
  reconcileJobOrderInvoicePaymongoCheckout,
  replaceJobOrderAssignments,
  startJobOrderInvoicePaymongoCheckout,
  updateJobOrderStatus,
} from '@/lib/jobOrderWorkbenchClient'
import { listStaffAccounts } from '@/lib/authClient'
import PageHeader from '@/components/ui/PageHeader'

const STATUS_META = {
  draft: { label: 'Draft', cls: 'badge-gray' },
  assigned: { label: 'Assigned', cls: 'badge-blue' },
  in_progress: { label: 'In Progress', cls: 'badge-orange' },
  ready_for_qa: { label: 'Ready For QA', cls: 'badge-green' },
  blocked: { label: 'Blocked', cls: 'badge-orange' },
  finalized: { label: 'Finalized', cls: 'badge-green' },
  cancelled: { label: 'Cancelled', cls: 'badge-gray' },
}

const WORKSHOP_STATUS_ACTION_LABELS = {
  in_progress: 'Start work',
  blocked: 'Mark blocked',
  ready_for_qa: 'Send to QA',
  cancelled: 'Cancel job order',
}

const initialCreateState = {
  status: 'create_ready',
  message: '',
}

const emptyCreateDraft = {
  notes: '',
  items: [],
  assignedTechnicianId: '',
}

const initialReadState = {
  status: 'detail_loaded',
  message: '',
}

const initialStatusState = {
  status: 'status_update_ready',
  message: '',
}

const initialAssignmentState = {
  status: 'assignment_ready',
  message: '',
}

const initialProgressState = {
  status: 'progress_ready',
  message: '',
}

const emptyProgressDraft = {
  entryType: 'work_started',
  message: '',
  completedItemIds: [],
}

const emptyPhotoDraft = {
  file: null,
  caption: '',
  linkedEntityType: 'job_order',
  linkedEntityId: '',
}

const initialPhotoState = {
  status: 'photo_ready',
  message: '',
}

const initialFinalizeState = {
  status: 'finalize_ready',
  message: '',
}

const initialPaymentState = {
  status: 'payment_ready',
  message: '',
}

const progressEntryTypeOptions = [
  { value: 'work_started', label: 'Work Started' },
  { value: 'note', label: 'Progress Note' },
  { value: 'issue_found', label: 'Issue Found' },
  { value: 'work_completed', label: 'Work Completed' },
]

const paymentMethodOptions = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'check', label: 'Check' },
  { value: 'other', label: 'Other' },
]

const WORKBENCH_STAGE_META = {
  queue: { label: 'Queue' },
  overview: { label: 'Overview' },
  assignments: { label: 'Assignments' },
  progress: { label: 'Progress' },
  evidence: { label: 'Evidence' },
  finalize: { label: 'Finalize' },
}

const CONTROL_CENTER_STEP_ORDER = [
  { key: 'intake', label: 'Intake', workbenchStage: 'queue' },
  { key: 'job_order', label: 'Job order', workbenchStage: 'overview' },
  { key: 'assignments', label: 'Assignments', workbenchStage: 'assignments' },
  { key: 'progress', label: 'Progress', workbenchStage: 'progress' },
  { key: 'evidence', label: 'Evidence', workbenchStage: 'evidence' },
  { key: 'qa_audit', label: 'QA audit', workbenchStage: 'finalize' },
  { key: 'finalize', label: 'Finalize', workbenchStage: 'finalize' },
  { key: 'payment', label: 'Payment', workbenchStage: 'finalize' },
]

const assignmentRequiredStatuses = ['assigned', 'in_progress', 'blocked', 'ready_for_qa', 'finalized']

const toDateKey = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatDate = (value) => {
  if (!value) return 'Unscheduled'

  return new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

const formatDateTime = (value) => {
  if (!value) return 'Not available'

  return new Date(value).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatPesoAmount = (amountCents) => {
  if (!Number.isFinite(amountCents)) {
    return 'PHP 0'
  }

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(Math.round(amountCents / 100))
}

const formatDateTimeInputValue = (value) => {
  if (!value) return ''

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  const offset = parsed.getTimezoneOffset() * 60 * 1000
  return new Date(parsed.getTime() - offset).toISOString().slice(0, 16)
}

const buildSuggestedFinalizationSummary = (jobOrder) => {
  if (!jobOrder) {
    return ''
  }

  if (jobOrder.invoiceRecord?.summary) {
    return jobOrder.invoiceRecord.summary
  }

  if (jobOrder.finalizationReadiness?.suggestedSummary) {
    return jobOrder.finalizationReadiness.suggestedSummary
  }

  const completedItems = Array.isArray(jobOrder.items)
    ? jobOrder.items.filter((item) => item?.isCompleted)
    : []

  if (completedItems.length === 0) {
    return ''
  }

  return completedItems
    .map((item) => item?.name)
    .filter(Boolean)
    .join(', ')
}

const buildJobOrderNextAction = ({
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
        body: 'Move this job order into In Progress, then record your first technician progress note so the adviser sees live work has started.',
        toneClass: 'border-blue-500/20 bg-blue-500/10 text-blue-100',
      }
    }

    if (activeJobOrder.status === 'in_progress') {
      return {
        title: isReadyForQaChecklistSatisfied ? 'Send the completed work to QA' : 'Keep progress and evidence current',
        body: isReadyForQaChecklistSatisfied
          ? 'Workshop execution looks complete. Use the execution control to hand this job order off to QA now.'
          : 'Continue adding progress notes and photo proof, then mark the work Ready for QA only when the execution evidence is complete.',
        toneClass: isReadyForQaChecklistSatisfied
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100'
          : 'border-brand-orange/20 bg-brand-orange/10 text-amber-100',
      }
    }

    if (activeJobOrder.status === 'blocked') {
      return {
        title: 'Document the blocker',
        body: 'Use a progress note and updated status reason so the next handoff knows exactly what is blocking repair completion.',
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
        : 'Keep workshop notes and evidence current, then mark the job order Ready for QA once all work items are complete.',
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

const getSuggestedControlCenterStage = (jobOrder, fallbackStage = 'overview') => {
  if (!jobOrder) {
    return 'queue'
  }

  const hasSavedAssignments = Array.isArray(jobOrder.assignedTechnicianIds) && jobOrder.assignedTechnicianIds.length > 0
  const hasProgressEntries = Array.isArray(jobOrder.progressEntries) && jobOrder.progressEntries.length > 0
  const hasPhotoEvidence = Array.isArray(jobOrder.photos) && jobOrder.photos.length > 0
  const hasInvoiceRecord = Boolean(jobOrder.invoiceRecord)

  if (!hasSavedAssignments) {
    return 'assignments'
  }

  if (jobOrder.status === 'assigned' || jobOrder.status === 'in_progress' || jobOrder.status === 'blocked') {
    if (!hasProgressEntries) {
      return 'progress'
    }

    if (!hasPhotoEvidence) {
      return 'evidence'
    }

    return 'progress'
  }

  if (jobOrder.status === 'ready_for_qa') {
    return 'finalize'
  }

  if (hasInvoiceRecord) {
    return 'finalize'
  }

  return fallbackStage
}

const getRoleBadgeClassName = (roleKey) => {
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

const getControlCenterRoleMeta = (roleKey) => {
  switch (roleKey) {
    case 'qa':
      return { label: 'Head technician / admin', badgeClass: getRoleBadgeClassName(roleKey) }
    case 'admin':
      return { label: 'Service adviser / admin', badgeClass: getRoleBadgeClassName(roleKey) }
    case 'workshop':
      return { label: 'Technician / head tech', badgeClass: getRoleBadgeClassName(roleKey) }
    default:
      return { label: 'View only', badgeClass: getRoleBadgeClassName(roleKey) }
  }
}

const formatStatusLabel = (value) =>
  STATUS_META[value]?.label ??
  String(value ?? '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? { label: formatStatusLabel(status), cls: 'badge-gray' }
  return <span className={`badge ${meta.cls}`}>{meta.label}</span>
}

function ExecutionStatusPanel({
  activeJobOrder,
  nextStatuses,
  hasProgressEntries,
  hasPhotoEvidence,
  completedItemCount,
  isReadyForQaChecklistSatisfied,
  statusDraft,
  setStatusDraft,
  handleStatusUpdate,
  statusState,
  statusStateClassName,
  ownerLabel,
}) {
  if (!activeJobOrder) {
    return null
  }

  const currentStatus = activeJobOrder.status
  const currentStatusLabel =
    currentStatus === 'assigned'
      ? 'Start work first before QA handoff can unlock.'
      : currentStatus === 'in_progress'
        ? isReadyForQaChecklistSatisfied
          ? 'All execution checks look complete. Send this job order to QA now.'
          : 'Keep progress and required evidence current before sending this job order to QA.'
        : currentStatus === 'blocked'
          ? 'Resolve the blocker and move the job back into active workshop execution before QA can continue.'
          : currentStatus === 'ready_for_qa'
            ? 'This job order is already waiting on QA release.'
            : 'Use the next valid status action below.'

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-4 mt-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-ink-primary">Execution Control</p>
            <span className="badge badge-green">{ownerLabel}</span>
          </div>
          <p className="text-xs text-ink-muted mt-1">
            Move the loaded job order through valid execution states.
          </p>
        </div>
        <span className="badge badge-gray">
          Next states: {nextStatuses.length > 0 ? nextStatuses.join(', ') : 'none'}
        </span>
      </div>

      <div className="mt-4 rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Current execution status</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={currentStatus} />
              <span className="text-sm text-ink-secondary">{currentStatusLabel}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map((status) => (
              <button
                key={`shared-status-${status}`}
                type="button"
                onClick={() => handleStatusUpdate(status)}
                disabled={!activeJobOrder || statusState.status === 'status_update_submitting'}
                className={status === 'ready_for_qa' ? 'ops-action-primary' : 'ops-action-secondary'}
              >
                {WORKSHOP_STATUS_ACTION_LABELS[status] ?? `Mark as ${formatStatusLabel(status)}`}
              </button>
            ))}
          </div>
        </div>
        {currentStatus === 'assigned' && (hasProgressEntries || hasPhotoEvidence || completedItemCount > 0) ? (
          <div className="mt-3 rounded-lg border border-brand-orange/25 bg-brand-orange/10 px-3 py-2 text-[11px] leading-5 text-amber-100">
            Workshop activity already exists on this job order, but the status is still <span className="font-semibold">Assigned</span>. Use <span className="font-semibold">Start work</span> first, then use <span className="font-semibold">Send to QA</span> after completion.
          </div>
        ) : null}
        {currentStatus === 'in_progress' && isReadyForQaChecklistSatisfied ? (
          <div className="mt-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-[11px] leading-5 text-emerald-100">
            This job order already has the required work completion, progress trail, and evidence. Use <span className="font-semibold">Send to QA</span> now.
          </div>
        ) : null}
      </div>

      <div className="grid md:grid-cols-2 gap-3 mt-4">
        <label className="text-xs text-ink-muted">
          Next status
          <select
            value={statusDraft.status}
            onChange={(event) =>
              setStatusDraft((current) => ({
                ...current,
                status: event.target.value,
              }))
            }
            className="mt-1 select"
            disabled={!activeJobOrder || nextStatuses.length === 0}
          >
            {nextStatuses.length > 0 ? (
              nextStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatStatusLabel(status)}
                </option>
              ))
            ) : (
              <option value={activeJobOrder?.status ?? 'draft'}>
                {activeJobOrder ? 'No valid transition available' : 'Load a job order first'}
              </option>
            )}
          </select>
        </label>
        <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
            Transition guide
          </p>
          <p className="text-sm text-ink-primary mt-1">
            Choose the next allowed status.
          </p>
        </div>
        <label className="text-xs text-ink-muted md:col-span-2">
          Transition reason
          <textarea
            value={statusDraft.reason}
            onChange={(event) =>
              setStatusDraft((current) => ({
                ...current,
                reason: event.target.value,
              }))
            }
            rows={3}
            className="mt-1 textarea"
            placeholder="Optional reason for the selected transition."
          />
        </label>
      </div>

      {statusState.message ? <div className={`mt-4 ${statusStateClassName}`}>{statusState.message}</div> : null}

      <div className="flex flex-wrap gap-2 mt-4">
        <button
          onClick={() => handleStatusUpdate()}
          disabled={!activeJobOrder || nextStatuses.length === 0 || statusState.status === 'status_update_submitting'}
          className="ops-action-primary"
        >
          {statusState.status === 'status_update_submitting' ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <CheckCircle2 size={14} />
          )}
          Save Status Update
        </button>
      </div>
    </div>
  )
}

function SummaryTile({ icon: Icon, label, value, sub }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-ink-primary">{value}</p>
          {sub ? <p className="mt-1 text-xs leading-5 text-ink-secondary">{sub}</p> : null}
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-orange/10 text-brand-orange">
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

function BlockingState({ title, copy }) {
  return (
    <div className="empty-panel">
      <ShieldAlert size={34} className="mx-auto text-brand-orange" />
      <p className="mt-3 text-sm font-semibold text-ink-primary">{title}</p>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-ink-secondary">{copy}</p>
    </div>
  )
}

export default function JobOrderWorkbench() {
  const user = useUser()
  const role = user?.role ?? null
  const isTechnician = ['technician', 'head_technician'].includes(role)
  const canUseWorkbench = canStaffReadExecutionJobOrder(role)
  const canManageHandoffs = staffJobOrderWorkbenchRoles.includes(role)
  const canManageAssignments = ['service_adviser', 'super_admin'].includes(role)

  const [workbenchScope, setWorkbenchScope] = useState('active')
  const [workbenchStage, setWorkbenchStage] = useState('queue')
  const [selectedDate, setSelectedDate] = useState(toDateKey())
  const [handoffCandidates, setHandoffCandidates] = useState([])
  const [handoffState, setHandoffState] = useState({
    status: 'handoff_empty',
    message: 'Use the active work date to load the live queue for this schedule.',
  })
  const [selectedBookingId, setSelectedBookingId] = useState('')
  const [createDraft, setCreateDraft] = useState(emptyCreateDraft)
  const [createState, setCreateState] = useState(initialCreateState)
  const [activeJobOrder, setActiveJobOrder] = useState(null)
  const [manualJobOrderId, setManualJobOrderId] = useState('')
  const [detailState, setDetailState] = useState(initialReadState)
  const [assignmentDraftIds, setAssignmentDraftIds] = useState([])
  const [assignmentState, setAssignmentState] = useState(initialAssignmentState)
  const [statusDraft, setStatusDraft] = useState({
    status: 'draft',
    reason: '',
  })
  const [statusState, setStatusState] = useState(initialStatusState)
  const [progressDraft, setProgressDraft] = useState(emptyProgressDraft)
  const [progressState, setProgressState] = useState(initialProgressState)
  const [photoDraft, setPhotoDraft] = useState(emptyPhotoDraft)
  const [photoInputResetKey, setPhotoInputResetKey] = useState(0)
  const [photoState, setPhotoState] = useState(initialPhotoState)
  const [finalizeDraft, setFinalizeDraft] = useState({
    summary: '',
  })
  const [finalizeState, setFinalizeState] = useState(initialFinalizeState)
  const [paymentDraft, setPaymentDraft] = useState({
    amountPaid: '',
    paymentMethod: 'cash',
    reference: '',
    receivedAt: '',
  })
  const [paymentState, setPaymentState] = useState(initialPaymentState)
  const [staffDirectoryState, setStaffDirectoryState] = useState({
    status: 'idle',
    accounts: [],
    message: '',
  })
  const [jobOrderSummaryState, setJobOrderSummaryState] = useState({
    status: 'idle',
    items: [],
    message: '',
  })
  const [jobOrderCalendarState, setJobOrderCalendarState] = useState({
    status: 'idle',
    jobOrderDates: [],
    bookingQueueDates: [],
    message: '',
  })

  const navigateToWorkbenchStage = useCallback((stageKey) => {
    setWorkbenchStage(stageKey)

    if (typeof window === 'undefined') {
      return
    }

    window.setTimeout(() => {
      const targetId = stageKey === 'queue' ? 'job-order-queue-panel' : `job-order-stage-${stageKey}`
      const target = document.getElementById(targetId)
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 40)
  }, [])

  const selectedCandidate = useMemo(
    () => getSelectedJobOrderHandoffCandidate(handoffCandidates, selectedBookingId),
    [handoffCandidates, selectedBookingId],
  )
  const nextStatuses = useMemo(
    () => getAllowedJobOrderStatusTargets(activeJobOrder?.status ?? 'draft'),
    [activeJobOrder?.status],
  )
  const canAppendProgress = canStaffAppendProgress({
    role,
    jobOrder: activeJobOrder,
    userId: user?.id,
  })
  const canAttachPhoto = canStaffCreateEvidencePhoto({
    role,
    jobOrder: activeJobOrder,
    userId: user?.id,
  })
  const canFinalizeOrPay = canStaffFinalizeOrRecordPayment({
    role,
    jobOrder: activeJobOrder,
    userId: user?.id,
  })
  const activeJobOrderNeedsAssignmentRepair = Boolean(
    activeJobOrder &&
      assignmentRequiredStatuses.includes(activeJobOrder.status) &&
      activeJobOrder.assignedTechnicianIds.length === 0,
  )
  const executionPhase = getJobOrderExecutionPhase(activeJobOrder)
  const technicianOptions = useMemo(
    () =>
      staffDirectoryState.accounts.filter(
        (account) =>
          account.isActive &&
          (account.accountType === 'mechanic' ||
            account.accountType === 'technician' ||
            account.accountType === 'head_technician' ||
            account.role === 'technician' ||
            account.role === 'head_technician'),
      ),
    [staffDirectoryState.accounts],
  )
  const selectedMonth = selectedDate.slice(0, 7)
  const finalizationBlockers = useMemo(
    () => activeJobOrder?.finalizationReadiness?.blockers ?? [],
    [activeJobOrder?.finalizationReadiness?.blockers],
  )
  const finalizationSuggestedSummary = buildSuggestedFinalizationSummary(activeJobOrder)
  const nextActionSummary = useMemo(
    () =>
      buildJobOrderNextAction({
        activeJobOrder,
        isTechnician,
        activeJobOrderNeedsAssignmentRepair,
        canFinalizeOrPay,
        isReadyForQaChecklistSatisfied:
          Boolean(activeJobOrder) &&
          Boolean(activeJobOrder?.assignedTechnicianIds?.length) &&
          Boolean(activeJobOrder?.progressEntries?.length) &&
          Boolean(activeJobOrder?.items?.length) &&
          activeJobOrder.items.every((item) => item?.isCompleted) &&
          activeJobOrder.items
            .filter((item) => item?.isCompleted && item?.requiresPhotoEvidence !== false)
            .every((item) =>
              (activeJobOrder?.photos ?? []).some(
                (photo) =>
                  photo?.deletedAt == null &&
                  photo?.linkedEntityType === 'work_item' &&
                  photo?.linkedEntityId === item.id,
              ),
            ),
      }),
    [activeJobOrder, activeJobOrderNeedsAssignmentRepair, canFinalizeOrPay, isTechnician],
  )
  const activeSourceCandidate = useMemo(() => {
    if (!activeJobOrder || activeJobOrder.sourceType !== 'booking') {
      return null
    }

    return handoffCandidates.find((candidate) => candidate.bookingId === activeJobOrder.sourceId) ?? null
  }, [activeJobOrder, handoffCandidates])
  const hasSavedAssignments = activeJobOrder?.assignedTechnicianIds.length > 0
  const hasProgressEntries = activeJobOrder?.progressEntries.length > 0
  const hasPhotoEvidence = activeJobOrder?.photos.length > 0
  const hasInvoiceRecord = Boolean(activeJobOrder?.invoiceRecord)
  const hasSettledPayment = activeJobOrder?.invoiceRecord?.paymentStatus === 'paid'
  const isBackJobRework = activeJobOrder?.jobType === 'back_job'
  const completedWorkItems = useMemo(
    () => (Array.isArray(activeJobOrder?.items) ? activeJobOrder.items.filter((item) => item?.isCompleted) : []),
    [activeJobOrder?.items],
  )
  const allWorkItemsCompleted = useMemo(
    () => Boolean(activeJobOrder?.items?.length) && activeJobOrder.items.every((item) => item?.isCompleted),
    [activeJobOrder?.items],
  )
  const linkedWorkItemPhotoIds = useMemo(
    () =>
      new Set(
        (activeJobOrder?.photos ?? [])
          .filter(
            (photo) =>
              photo?.deletedAt == null &&
              photo?.linkedEntityType === 'work_item' &&
              photo?.linkedEntityId,
          )
          .map((photo) => photo.linkedEntityId),
      ),
    [activeJobOrder?.photos],
  )
  const hasRequiredWorkItemEvidence = useMemo(
    () =>
      completedWorkItems
        .filter((item) => item?.requiresPhotoEvidence !== false)
        .every((item) => linkedWorkItemPhotoIds.has(item.id)),
    [completedWorkItems, linkedWorkItemPhotoIds],
  )
  const isReadyForQaChecklistSatisfied = useMemo(
    () => hasSavedAssignments && hasProgressEntries && allWorkItemsCompleted && hasRequiredWorkItemEvidence,
    [allWorkItemsCompleted, hasProgressEntries, hasRequiredWorkItemEvidence, hasSavedAssignments],
  )
  const selectedCompletedItemsMissingPhotoEvidence = useMemo(() => {
    if (!activeJobOrder?.items?.length || progressDraft.completedItemIds.length === 0) {
      return []
    }

    return activeJobOrder.items.filter(
      (item) =>
        progressDraft.completedItemIds.includes(item.id) &&
        item.requiresPhotoEvidence !== false &&
        !linkedWorkItemPhotoIds.has(item.id),
    )
  }, [activeJobOrder, linkedWorkItemPhotoIds, progressDraft.completedItemIds])
  const currentControlCenterStage = useMemo(
    () => getSuggestedControlCenterStage(activeJobOrder, workbenchStage === 'queue' ? 'overview' : workbenchStage),
    [activeJobOrder, workbenchStage],
  )
  const controlCenterRoleMeta = useMemo(() => {
    if (!activeJobOrder) {
      return getControlCenterRoleMeta('viewer')
    }

    if (currentControlCenterStage === 'assignments') {
      return getControlCenterRoleMeta('admin')
    }

    if (currentControlCenterStage === 'progress' || currentControlCenterStage === 'evidence') {
      return getControlCenterRoleMeta('workshop')
    }

    if (activeJobOrder.status === 'ready_for_qa') {
      return getControlCenterRoleMeta('qa')
    }

    if (hasInvoiceRecord || currentControlCenterStage === 'finalize') {
      return getControlCenterRoleMeta('admin')
    }

    return getControlCenterRoleMeta(isTechnician ? 'workshop' : 'admin')
  }, [activeJobOrder, currentControlCenterStage, hasInvoiceRecord, isTechnician])
  const controlCenterBlockerReasons = useMemo(() => {
    if (!activeJobOrder) {
      return ['Load a job order from the queue first.']
    }

    const reasons = []

    if (!hasSavedAssignments) {
      reasons.push('No technician assignment is saved yet. Save at least one technician before workshop execution can start.')
    }

    if (activeJobOrder.status === 'blocked') {
      reasons.push('Workshop execution is currently blocked. Update the progress trail and resolve the issue before QA can continue.')
    }

    if (hasSavedAssignments && !hasProgressEntries) {
      reasons.push('No progress entry is saved yet. Add the first workshop note before moving this job closer to QA.')
    }

    if (hasSavedAssignments && hasProgressEntries && !hasPhotoEvidence) {
      reasons.push('Photo evidence is still missing. Upload at least one stored image before the QA handoff.')
    }

    if (hasSavedAssignments && hasProgressEntries && !allWorkItemsCompleted) {
      reasons.push('Not all work items are completed yet. Finish every work item before sending this job order to QA.')
    }

    if (hasSavedAssignments && hasProgressEntries && allWorkItemsCompleted && !hasRequiredWorkItemEvidence) {
      reasons.push('Completed work items still need required work-item photo evidence before QA handoff can unlock.')
    }

    if (selectedCompletedItemsMissingPhotoEvidence.length > 0) {
      reasons.push(
        `Selected completed items still need work-item photo evidence: ${selectedCompletedItemsMissingPhotoEvidence
          .map((item) => item.name)
          .join(', ')}.`,
      )
    }

    if (activeJobOrder.status === 'assigned' && (hasProgressEntries || hasPhotoEvidence || activeJobOrder.completedItemCount > 0)) {
      reasons.push('Workshop activity already exists, but the job order status is still Assigned. Use Execution Control to start work first.')
    }

    if (activeJobOrder.status === 'in_progress' && isReadyForQaChecklistSatisfied) {
      reasons.push('Execution looks complete, but the job order has not been sent to QA yet. Use Execution Control to mark it Ready For QA.')
    }

    if (activeJobOrder.status === 'ready_for_qa') {
      reasons.push('QA Audit still needs to release this job order before finalization and payment can unlock.')
    }

    if (finalizationBlockers.length > 0) {
      finalizationBlockers.forEach((blocker) => reasons.push(blocker))
    }

    if (hasInvoiceRecord && !hasSettledPayment) {
      reasons.push('The invoice-ready record exists, but payment is still pending.')
    }

    if (reasons.length === 0) {
      reasons.push('This record is clear to keep moving through the active workflow.')
    }

    return reasons
  }, [
    activeJobOrder,
    finalizationBlockers,
    hasInvoiceRecord,
    hasPhotoEvidence,
    hasProgressEntries,
    hasSavedAssignments,
    hasSettledPayment,
    allWorkItemsCompleted,
    hasRequiredWorkItemEvidence,
    isReadyForQaChecklistSatisfied,
    selectedCompletedItemsMissingPhotoEvidence,
  ])
  const controlCenterSteps = useMemo(() => {
    if (!activeJobOrder) {
      return CONTROL_CENTER_STEP_ORDER.map((step, index) => ({
        ...step,
        label: step.key === 'intake' && isBackJobRework ? 'Back-job intake' : step.label,
        state: index === 0 ? 'active' : 'locked',
        note: index === 0 ? 'Load a job order first' : 'Locked',
      }))
    }

    return CONTROL_CENTER_STEP_ORDER.map((step, index) => {
      let state = 'locked'
      let note = 'Locked'

      if (index < 2) {
        state = 'done'
        note = index === 0 ? 'Captured' : 'Created'
      } else if (step.key === 'assignments') {
        state = hasSavedAssignments ? 'done' : 'action_needed'
        note = hasSavedAssignments
          ? `${activeJobOrder.assignedTechnicianIds.length} saved`
          : 'Needs assignment'
      } else if (step.key === 'progress') {
        if (!hasSavedAssignments) {
          state = 'locked'
          note = 'Complete assignments first'
        } else if (activeJobOrder.status === 'blocked') {
          state = 'blocked'
          note = 'Workshop blocked'
        } else if (activeJobOrder.status === 'ready_for_qa' || hasInvoiceRecord) {
          state = 'done'
          note = 'Execution done'
        } else if (isReadyForQaChecklistSatisfied) {
          state = 'action_needed'
          note = activeJobOrder.status === 'assigned' ? 'Start work first' : 'Send to QA'
        } else if (activeJobOrder.status === 'assigned' || activeJobOrder.status === 'in_progress') {
          state = hasProgressEntries ? 'active' : 'action_needed'
          note = hasProgressEntries ? 'Workshop live' : 'Add progress'
        }
      } else if (step.key === 'evidence') {
        if (!hasSavedAssignments) {
          state = 'locked'
          note = 'Complete assignments first'
        } else if (hasPhotoEvidence && hasRequiredWorkItemEvidence) {
          state = 'done'
          note = `${activeJobOrder.photos.length} attached`
        } else if (hasPhotoEvidence) {
          state = 'action_needed'
          note = 'Attach work-item proof'
        } else if (hasProgressEntries) {
          state = 'action_needed'
          note = 'Upload proof'
        }
      } else if (step.key === 'qa_audit') {
        if (activeJobOrder.status === 'ready_for_qa') {
          state = 'active'
          note = 'Open QA Audit'
        } else if (hasInvoiceRecord) {
          state = 'done'
          note = 'Release allowed'
        } else if (isReadyForQaChecklistSatisfied) {
          state = 'action_needed'
          note = 'Send to QA'
        } else if (hasPhotoEvidence) {
          state = 'locked'
          note = 'Waiting on QA handoff'
        }
      } else if (step.key === 'finalize') {
        if (hasInvoiceRecord) {
          state = 'done'
          note = activeJobOrder.invoiceRecord?.invoiceReference ?? 'Invoice ready'
        } else if (activeJobOrder.status === 'ready_for_qa') {
          state = 'locked'
          note = 'Await QA release'
        }
      } else if (step.key === 'payment') {
        if (hasSettledPayment) {
          state = 'done'
          note = 'Paid'
        } else if (hasInvoiceRecord) {
          state = 'active'
          note = 'Payment pending'
        }
      }

      return {
        ...step,
        label: step.key === 'intake' && isBackJobRework ? 'Back-job intake' : step.label,
        state,
        note,
      }
    })
  }, [
    activeJobOrder,
    hasInvoiceRecord,
    hasPhotoEvidence,
    hasProgressEntries,
    hasRequiredWorkItemEvidence,
    hasSavedAssignments,
    hasSettledPayment,
    isReadyForQaChecklistSatisfied,
    isBackJobRework,
  ])
  const controlCenterNextAction = useMemo(() => {
    if (!activeJobOrder) {
      return {
        stepLabel: 'Step 1 of 8',
        title: 'Load a job order from the queue',
        body: 'Select a live record first so the control center can show the correct guided workflow for this role.',
        toneClass: 'border-surface-border bg-surface-raised/80 text-ink-primary',
        actionLabel: 'Open queue',
        stageKey: 'queue',
        secondaryLabel: null,
        roleMeta: getControlCenterRoleMeta('viewer'),
      }
    }

    if (!hasSavedAssignments) {
      return {
        stepLabel: 'Step 3 of 8',
        title: 'Save technician assignments to unlock workshop execution',
        body: 'At least one technician is drafted, but the team must be saved first before the progress stage can begin.',
        toneClass: 'border-brand-orange/25 bg-brand-orange/10 text-amber-100',
        actionLabel: 'Go to assignments',
        stageKey: 'assignments',
        secondaryLabel: 'View overview',
        roleMeta: getControlCenterRoleMeta('admin'),
      }
    }

    if ((activeJobOrder.status === 'assigned' || activeJobOrder.status === 'in_progress') && !hasProgressEntries) {
      return {
        stepLabel: 'Step 4 of 8',
        title: 'Add the first progress entry before the QA handoff',
        body: 'Workshop execution has started, but the service trail still needs a saved technician update.',
        toneClass: 'border-brand-orange/25 bg-brand-orange/10 text-amber-100',
        actionLabel: 'Go to progress',
        stageKey: 'progress',
        secondaryLabel: 'View overview',
        roleMeta: getControlCenterRoleMeta('workshop'),
      }
    }

    if ((activeJobOrder.status === 'assigned' || activeJobOrder.status === 'in_progress') && !hasPhotoEvidence) {
      return {
        stepLabel: 'Step 5 of 8',
        title: 'Upload photo evidence so QA sees stored proof',
        body: 'At least one evidence photo should be saved before this job order moves into the QA release step.',
        toneClass: 'border-brand-orange/25 bg-brand-orange/10 text-amber-100',
        actionLabel: 'Go to evidence',
        stageKey: 'evidence',
        secondaryLabel: 'View progress',
        roleMeta: getControlCenterRoleMeta('workshop'),
      }
    }

    if (activeJobOrder.status === 'blocked') {
      return {
        stepLabel: 'Step 4 of 8',
        title: 'Workshop is blocked and needs a resolved progress trail',
        body: 'The technician team must clear the blocker and move the job back into active execution before QA can continue.',
        toneClass: 'border-red-500/25 bg-red-500/10 text-red-100',
        actionLabel: 'Go to progress',
        stageKey: 'progress',
        secondaryLabel: 'View blocker detail',
        roleMeta: getControlCenterRoleMeta('workshop'),
      }
    }

    if (activeJobOrder.status === 'ready_for_qa') {
      return {
        stepLabel: 'Step 6 of 8',
        title: 'QA audit must clear release before finalization',
        body: 'This job order is ready for QA. Open QA Audit now so the release verdict can unlock finalization.',
        toneClass: 'border-blue-500/25 bg-blue-500/10 text-blue-100',
        actionLabel: 'Open QA Audit',
        stageKey: 'qa_audit',
        secondaryLabel: 'View finalize panel',
        roleMeta: getControlCenterRoleMeta('qa'),
      }
    }

    if (hasInvoiceRecord && !hasSettledPayment) {
      return {
        stepLabel: 'Step 8 of 8',
        title: 'Record payment to close this job order',
        body: 'The invoice-ready record already exists. Capture payment here to finish the pipeline cleanly.',
        toneClass: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-100',
        actionLabel: 'Go to finalize and payment',
        stageKey: 'finalize',
        secondaryLabel: 'Export invoice',
        roleMeta: getControlCenterRoleMeta('admin'),
      }
    }

    if (hasSettledPayment) {
      return {
        stepLabel: 'Step 8 of 8',
        title: 'Job order complete - all steps finished',
        body: 'This job order already has a paid invoice record. Use the finalize panel only for export and review.',
        toneClass: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-100',
        actionLabel: 'View finalize and payment',
        stageKey: 'finalize',
        secondaryLabel: null,
        roleMeta: getControlCenterRoleMeta('admin'),
      }
    }

    return {
      stepLabel: 'Step 4 of 8',
      title: nextActionSummary.title,
      body: nextActionSummary.body,
      toneClass: nextActionSummary.toneClass,
      actionLabel: 'Open active panel',
      stageKey: currentControlCenterStage,
      secondaryLabel: 'View overview',
      roleMeta: controlCenterRoleMeta,
    }
  }, [
    activeJobOrder,
    controlCenterRoleMeta,
    currentControlCenterStage,
    hasInvoiceRecord,
    hasPhotoEvidence,
    hasProgressEntries,
    hasSavedAssignments,
    hasSettledPayment,
    nextActionSummary,
  ])
  const monthJobOrders = useMemo(
    () => [...jobOrderSummaryState.items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [jobOrderSummaryState.items],
  )
  const datesWithJobOrders = jobOrderCalendarState.jobOrderDates
  const datesWithBookingQueue = jobOrderCalendarState.bookingQueueDates
  const markedWorkbenchDates = useMemo(() => {
    const markers = new Map()

    datesWithJobOrders.forEach((entry) => {
      markers.set(entry.date, {
        date: entry.date,
        jobOrderCount: entry.count,
        bookingQueueCount: 0,
      })
    })

    datesWithBookingQueue.forEach((entry) => {
      const current = markers.get(entry.date) ?? {
        date: entry.date,
        jobOrderCount: 0,
        bookingQueueCount: 0,
      }
      current.bookingQueueCount = entry.count
      markers.set(entry.date, current)
    })

    return [...markers.values()].sort((left, right) => left.date.localeCompare(right.date))
  }, [datesWithBookingQueue, datesWithJobOrders])
  const selectedDateJobOrders = useMemo(
    () => monthJobOrders.filter((jobOrder) => jobOrder.workDate === selectedDate),
    [monthJobOrders, selectedDate],
  )
  const photoTargetOptions = useMemo(() => {
    const options = [
      {
        key: 'job_order',
        linkedEntityType: 'job_order',
        linkedEntityId: '',
        label: 'General job-order evidence',
        group: 'general',
      },
    ]

    if (!activeJobOrder) {
      return options
    }

    activeJobOrder.items.forEach((item) => {
      options.push({
        key: `work_item:${item.id}`,
        linkedEntityType: 'work_item',
        linkedEntityId: item.id,
        label:
          item.requiresPhotoEvidence !== false
            ? `Work item (required for completion): ${item.name}`
            : `Work item: ${item.name}`,
        group: 'work_items',
      })
    })

    activeJobOrder.progressEntries
      .slice()
      .reverse()
      .forEach((entry, index) => {
        options.push({
          key: `progress_entry:${entry.id}`,
          linkedEntityType: 'progress_entry',
          linkedEntityId: entry.id,
          label: `Progress log ${index + 1}: ${formatDateTime(entry.createdAt)} - ${entry.message?.slice(0, 36) || formatStatusLabel(entry.entryType)}`,
          group: 'progress_entries',
        })
      })

    return options
  }, [activeJobOrder])
  const recommendedPhotoTargetOption = useMemo(() => {
    if (selectedCompletedItemsMissingPhotoEvidence.length > 0) {
      const firstMissingItem = selectedCompletedItemsMissingPhotoEvidence[0]
      return (
        photoTargetOptions.find(
          (option) =>
            option.linkedEntityType === 'work_item' &&
            option.linkedEntityId === firstMissingItem.id,
        ) ?? null
      )
    }

    return photoTargetOptions[0] ?? null
  }, [photoTargetOptions, selectedCompletedItemsMissingPhotoEvidence])
  const workItemPhotoTargetOptions = useMemo(
    () => photoTargetOptions.filter((option) => option.group === 'work_items'),
    [photoTargetOptions],
  )
  const progressPhotoTargetOptions = useMemo(
    () => photoTargetOptions.filter((option) => option.group === 'progress_entries'),
    [photoTargetOptions],
  )
  const isPhotoTargetRecommended =
    Boolean(recommendedPhotoTargetOption) &&
    photoDraft.linkedEntityType === recommendedPhotoTargetOption?.linkedEntityType &&
    photoDraft.linkedEntityId === (recommendedPhotoTargetOption?.linkedEntityId ?? '')
  const availableWorkbenchStages = useMemo(() => {
    const baseStages = ['queue', 'overview']

    if (!isTechnician) {
      baseStages.push('assignments')
    }

    baseStages.push('progress', 'evidence')

    if (!isTechnician) {
      baseStages.push('finalize')
    }

    return baseStages.map((key) => ({
      key,
      label: WORKBENCH_STAGE_META[key]?.label ?? formatStatusLabel(key),
    }))
  }, [isTechnician])
  const isQueueStageVisible = !activeJobOrder || workbenchStage === 'queue'
  const isOverviewStageActive = workbenchStage === 'overview'
  const isAssignmentsStageActive = workbenchStage === 'assignments'
  const isProgressStageActive = workbenchStage === 'progress'
  const isEvidenceStageActive = workbenchStage === 'evidence'
  const isFinalizeStageActive = workbenchStage === 'finalize'

  const loadStaffDirectory = useCallback(async () => {
    if (!user?.accessToken || !['service_adviser', 'super_admin'].includes(role)) {
      return
    }

    setStaffDirectoryState((current) => ({ ...current, status: 'loading', message: '' }))
    try {
      const accounts = await listStaffAccounts(user.accessToken)
      setStaffDirectoryState({
        status: 'success',
        accounts,
        message: accounts.length ? '' : 'No staff directory records are available yet.',
      })
    } catch (error) {
      setStaffDirectoryState((current) => ({
        ...current,
        status: 'error',
        message: error?.message || 'Technician directory could not be loaded.',
      }))
    }
  }, [role, user?.accessToken])

  useEffect(() => {
    void loadStaffDirectory()
  }, [loadStaffDirectory])

  const loadJobOrderSummaries = useCallback(async () => {
    if (!user?.accessToken || !canUseWorkbench) {
      setJobOrderSummaryState({
        status: 'idle',
        items: [],
        message: '',
      })
      return
    }

    setJobOrderSummaryState((current) => ({
      ...current,
      status: 'loading',
      message: '',
    }))

    try {
      const items = await listJobOrderWorkbenchSummaries({
        accessToken: user.accessToken,
        month: selectedMonth,
        scope: workbenchScope,
      })

      setJobOrderSummaryState({
        status: 'success',
        items,
        message: items.length ? '' : 'No job orders are mapped to this month yet.',
      })
    } catch (error) {
      setJobOrderSummaryState({
        status: 'error',
        items: [],
        message: error?.message || 'Job-order date indicators could not be loaded.',
      })
    }
  }, [canUseWorkbench, selectedMonth, user?.accessToken, workbenchScope])

  useEffect(() => {
    void loadJobOrderSummaries()
  }, [loadJobOrderSummaries])

  const loadJobOrderCalendar = useCallback(async () => {
    if (!user?.accessToken || !canUseWorkbench) {
      setJobOrderCalendarState({
        status: 'idle',
        jobOrderDates: [],
        bookingQueueDates: [],
        message: '',
      })
      return
    }

    setJobOrderCalendarState((current) => ({
      ...current,
      status: 'loading',
      message: '',
    }))

    try {
      const data = await listJobOrderWorkbenchCalendar({
        accessToken: user.accessToken,
        month: selectedMonth,
        scope: workbenchScope,
      })

      setJobOrderCalendarState({
        status: 'success',
        jobOrderDates: data.jobOrderDates,
        bookingQueueDates: data.bookingQueueDates,
        message:
          data.jobOrderDates.length || data.bookingQueueDates.length
            ? ''
            : 'No job-order or booking-handoff dates are mapped to this month yet.',
      })
    } catch (error) {
      setJobOrderCalendarState({
        status: 'error',
        jobOrderDates: [],
        bookingQueueDates: [],
        message: error?.message || 'Workbench date markers could not be loaded.',
      })
    }
  }, [canUseWorkbench, selectedMonth, user?.accessToken, workbenchScope])

  useEffect(() => {
    void loadJobOrderCalendar()
  }, [loadJobOrderCalendar])

  useEffect(() => {
    if (selectedDateJobOrders.length > 0) {
      const selectedDateContainsCurrent = selectedDateJobOrders.some(
        (jobOrder) => jobOrder.id === manualJobOrderId,
      )

      if (!selectedDateContainsCurrent) {
        setManualJobOrderId(selectedDateJobOrders[0].id)
      }
      return
    }

    if (manualJobOrderId && monthJobOrders.some((jobOrder) => jobOrder.id === manualJobOrderId)) {
      return
    }

    setManualJobOrderId(monthJobOrders[0]?.id ?? '')
  }, [manualJobOrderId, monthJobOrders, selectedDateJobOrders])

  useEffect(() => {
    if (activeJobOrder?.id) {
      setWorkbenchStage((current) =>
        current === 'queue'
          ? getSuggestedControlCenterStage(activeJobOrder, 'overview')
          : current,
      )
      return
    }

    setWorkbenchStage('queue')
  }, [activeJobOrder])

  const loadBookingHandoffs = useCallback(async () => {
    if (workbenchScope === 'history') {
      setHandoffCandidates([])
      setSelectedBookingId('')
      setHandoffState({
        status: 'handoff_empty',
        message: 'Booking handoffs are active-work only. Switch back to Active to create a new job order.',
      })
      return
    }

    if (!canManageHandoffs) {
      setHandoffCandidates([])
      setSelectedBookingId('')
      setHandoffState({
        status: 'handoff_forbidden_role',
        message: 'Technicians can load assigned job orders, but booking handoff creation stays adviser/admin-only.',
      })
      return
    }

    if (!user?.accessToken) {
      setHandoffState({
        status: 'handoff_load_failed',
        message: 'A valid staff session is required before loading booking handoff candidates.',
      })
      return
    }

    setHandoffState({
      status: 'handoff_loaded',
      message: 'Loading confirmed and workshop-handoff bookings...',
    })

    try {
      const schedule = await getDailySchedule(
        {
          scheduledDate: selectedDate,
        },
        user.accessToken,
      )

      const handoffEligibleBookings = (schedule?.slots ?? []).flatMap((slot) =>
        (slot?.bookings ?? []).filter((booking) =>
          ['confirmed', 'in_service'].includes(booking?.status),
        ),
      )

      const nextCandidates = handoffEligibleBookings.map((booking) =>
        buildBookingJobOrderHandoffCandidate(booking),
      )

      setHandoffCandidates(nextCandidates)
      setSelectedBookingId((current) => {
        if (current && nextCandidates.some((candidate) => candidate.bookingId === current)) {
          return current
        }

        return nextCandidates[0]?.bookingId ?? ''
      })
      setHandoffState({
        status: getJobOrderWorkbenchHandoffState(nextCandidates),
        message:
          nextCandidates.length > 0
            ? 'Confirmed and workshop-handoff bookings are ready for job-order handoff.'
            : 'No confirmed or workshop-handoff bookings are available for job-order handoff on this date.',
      })
    } catch (error) {
      setHandoffCandidates([])
      setSelectedBookingId('')
      setHandoffState({
        status: 'handoff_load_failed',
        message: error?.message || 'Booking handoff candidates could not be loaded.',
      })
    }
  }, [canManageHandoffs, selectedDate, user?.accessToken, workbenchScope])

  useEffect(() => {
    void loadBookingHandoffs()
  }, [loadBookingHandoffs])

  useEffect(() => {
    if (!selectedCandidate) {
      setCreateDraft(emptyCreateDraft)
      return
    }

    setCreateDraft({
      notes: selectedCandidate.sourceNotes ?? '',
      items: selectedCandidate.defaultItems,
      assignedTechnicianId: '',
    })
    setCreateState(initialCreateState)
  }, [selectedCandidate])

  const clearBookingCreateContext = useCallback((nextCreateState = initialCreateState) => {
    setSelectedBookingId('')
    setCreateDraft(emptyCreateDraft)
    setCreateState(nextCreateState)
  }, [])

  useEffect(() => {
    if (!activeJobOrder) {
      setAssignmentDraftIds([])
      setAssignmentState(initialAssignmentState)
      setStatusDraft({
        status: 'draft',
        reason: '',
      })
      setStatusState(initialStatusState)
      setProgressDraft(emptyProgressDraft)
      setProgressState(initialProgressState)
      setPhotoDraft(emptyPhotoDraft)
      setPhotoState(initialPhotoState)
      setFinalizeDraft({
        summary: '',
      })
      setFinalizeState(initialFinalizeState)
      setPaymentDraft({
        amountPaid: '',
        paymentMethod: 'cash',
        reference: '',
        receivedAt: '',
      })
      setPaymentState(initialPaymentState)
      return
    }

    setAssignmentDraftIds(activeJobOrder.assignedTechnicianIds ?? [])
    setAssignmentState(initialAssignmentState)
    setStatusDraft({
      status: nextStatuses[0] ?? activeJobOrder.status,
      reason: '',
    })
    setStatusState(initialStatusState)
    setProgressDraft(emptyProgressDraft)
    setProgressState(initialProgressState)
    setPhotoDraft({
      ...emptyPhotoDraft,
      linkedEntityType: photoTargetOptions[0]?.linkedEntityType ?? 'job_order',
      linkedEntityId: photoTargetOptions[0]?.linkedEntityId ?? '',
    })
    setPhotoState(initialPhotoState)
    setFinalizeDraft({
      summary: buildSuggestedFinalizationSummary(activeJobOrder),
    })
    setFinalizeState(initialFinalizeState)
    setPaymentDraft({
      amountPaid: activeJobOrder.invoiceRecord?.amountPaidCents
        ? String(Math.round(activeJobOrder.invoiceRecord.amountPaidCents / 100))
        : '',
      paymentMethod: activeJobOrder.invoiceRecord?.paymentMethod ?? 'cash',
      reference: activeJobOrder.invoiceRecord?.paymentReference ?? '',
      receivedAt: formatDateTimeInputValue(activeJobOrder.invoiceRecord?.paidAt),
    })
    setPaymentState(initialPaymentState)
  }, [activeJobOrder, nextStatuses, photoTargetOptions])

  useEffect(() => {
    if (
      !recommendedPhotoTargetOption ||
      selectedCompletedItemsMissingPhotoEvidence.length === 0 ||
      isPhotoTargetRecommended
    ) {
      return
    }

    if (
      photoDraft.linkedEntityType === 'job_order' ||
      photoDraft.linkedEntityType === 'progress_entry'
    ) {
      setPhotoDraft((current) => ({
        ...current,
        linkedEntityType: recommendedPhotoTargetOption.linkedEntityType,
        linkedEntityId: recommendedPhotoTargetOption.linkedEntityId ?? '',
      }))
    }
  }, [
    isPhotoTargetRecommended,
    photoDraft.linkedEntityType,
    recommendedPhotoTargetOption,
    selectedCompletedItemsMissingPhotoEvidence.length,
  ])

  const handleCreateItemChange = (index, patch) => {
    setCreateDraft((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    }))
  }

  const handleLoadJobOrder = async () => {
    if (!user?.accessToken) {
      setDetailState({
        status: 'load_failed',
        message: 'A valid staff session is required before loading job-order detail.',
      })
      return
    }

    setDetailState({
      status: 'detail_loading',
      message: 'Loading job-order detail...',
    })

    try {
      const jobOrder = await getJobOrderById({
        jobOrderId: manualJobOrderId.trim(),
        accessToken: user.accessToken,
      })

      clearBookingCreateContext()
      setActiveJobOrder(jobOrder)
      setManualJobOrderId(jobOrder.id)
      setWorkbenchStage(getSuggestedControlCenterStage(jobOrder, 'overview'))
      setDetailState({
        status: 'detail_loaded',
        message:
          'Live job-order detail loaded. Booking handoff creation was cleared so this screen stays scoped to the loaded job order.',
      })
    } catch (error) {
      let nextStatus = 'load_failed'
      if (error instanceof ApiError && error.status === 403) {
        nextStatus = 'forbidden_role'
      } else if (error instanceof ApiError && error.status === 404) {
        nextStatus = 'job_order_not_found'
      }

      setDetailState({
        status: nextStatus,
        message: error?.message || 'Job-order detail could not be loaded.',
      })
    }
  }

  const handleCreateJobOrder = async () => {
    if (!canManageHandoffs) {
      setCreateState({
        status: 'forbidden_role',
        message: 'Only service advisers and super admins can create job orders from booking handoff.',
      })
      return
    }

    if (!selectedCandidate) {
      setCreateState({
        status: 'source_not_eligible',
        message: 'Select a confirmed booking before creating a job order.',
      })
      return
    }

    if (!user?.accessToken || !user?.id || !user?.staffCode) {
      setCreateState({
        status: 'create_failed',
        message: 'A valid staff adviser snapshot is required before job-order creation.',
      })
      return
    }

    setCreateState({
      status: 'create_submitting',
      message: '',
    })

    try {
      const seededDraft = buildJobOrderCreateDraftFromCandidate(selectedCandidate, {
        userId: user.id,
        staffCode: user.staffCode,
      })
      const jobOrder = await createJobOrderFromBooking({
        accessToken: user.accessToken,
        ...seededDraft,
        notes: createDraft.notes,
        items: createDraft.items,
        assignedTechnicianIds: createDraft.assignedTechnicianId
          ? [createDraft.assignedTechnicianId]
          : [],
      })

      clearBookingCreateContext({
        status: 'create_saved',
        message: `Job order ${jobOrder.id.slice(0, 8).toUpperCase()} created from the selected booking handoff.`,
      })
      setActiveJobOrder(jobOrder)
      setManualJobOrderId(jobOrder.id)
      setWorkbenchStage(getSuggestedControlCenterStage(jobOrder, 'overview'))
      void loadJobOrderSummaries()
      setHandoffCandidates((current) =>
        current.filter((candidate) => candidate.bookingId !== selectedCandidate.bookingId),
      )
    } catch (error) {
      let nextStatus = 'create_failed'

      if (error instanceof ApiError && error.status === 403) {
        nextStatus = 'forbidden_role'
      } else if (error instanceof ApiError && error.status === 409) {
        if (String(error.message).toLowerCase().includes('already exists')) {
          nextStatus = 'duplicate_blocked'
        } else {
          nextStatus = 'source_not_eligible'
        }
      }

      setCreateState({
        status: nextStatus,
        message: error?.message || 'Job-order creation could not be completed.',
      })
    }
  }

  const handleAssignmentToggle = (technicianUserId, checked) => {
    setAssignmentDraftIds((current) => {
      if (checked) {
        return current.includes(technicianUserId) ? current : [...current, technicianUserId]
      }

      return current.filter((candidateId) => candidateId !== technicianUserId)
    })
  }

  const handleSaveAssignments = async () => {
    if (!activeJobOrder?.id) {
      setAssignmentState({
        status: 'assignment_job_order_not_found',
        message: 'Load a job order before saving technician assignments.',
      })
      return
    }

    if (!canManageAssignments) {
      setAssignmentState({
        status: 'assignment_forbidden_role',
        message: 'Only service advisers and super admins can save technician assignments.',
      })
      return
    }

    if (!user?.accessToken) {
      setAssignmentState({
        status: 'assignment_failed',
        message: 'A valid staff session is required before saving technician assignments.',
      })
      return
    }

    setAssignmentState({
      status: 'assignment_submitting',
      message: '',
    })

    try {
      const updatedJobOrder = await replaceJobOrderAssignments({
        jobOrderId: activeJobOrder.id,
        assignedTechnicianIds: assignmentDraftIds,
        expectedUpdatedAt: activeJobOrder.updatedAt,
        accessToken: user.accessToken,
      })

      setActiveJobOrder(updatedJobOrder)
      setManualJobOrderId(updatedJobOrder.id)
      setWorkbenchStage(getSuggestedControlCenterStage(updatedJobOrder, 'overview'))
      void loadJobOrderSummaries()
      setAssignmentState({
        status: 'assignment_saved',
        message:
          updatedJobOrder.assignedTechnicianIds.length > 0
            ? 'Technician assignments were saved and the live job-order detail was refreshed.'
            : 'Assignments were cleared while the job order stayed in a non-operational state.',
      })
    } catch (error) {
      let nextStatus = 'assignment_failed'

      if (error instanceof ApiError && error.status === 403) {
        nextStatus = 'assignment_forbidden_role'
      } else if (error instanceof ApiError && error.status === 404) {
        nextStatus = 'assignment_job_order_not_found'
      } else if (error instanceof ApiError && error.status === 409) {
        nextStatus = 'assignment_conflict'
        try {
          const conflictMessage = await reloadLatestActiveJobOrder()
          setAssignmentState({
            status: nextStatus,
            message: conflictMessage,
          })
          return
        } catch {}
      }

      setAssignmentState({
        status: nextStatus,
        message: error?.message || 'Technician assignments could not be saved.',
      })
    }
  }

  const handleStatusUpdate = async (statusOverride = null) => {
    if (!activeJobOrder?.id) {
      setStatusState({
        status: 'job_order_not_found',
        message: 'Load a job order before saving a status update.',
      })
      return
    }

    if (!user?.accessToken) {
      setStatusState({
        status: 'update_failed',
        message: 'A valid staff session is required before saving a job-order status update.',
      })
      return
    }

    const nextStatusValue = statusOverride ?? statusDraft.status

    setStatusState({
      status: 'status_update_submitting',
      message: '',
    })

    try {
      const updatedJobOrder = await updateJobOrderStatus({
        jobOrderId: activeJobOrder.id,
        status: nextStatusValue,
        reason: statusDraft.reason,
        expectedUpdatedAt: activeJobOrder.updatedAt,
        accessToken: user.accessToken,
      })

      setActiveJobOrder(updatedJobOrder)
      setManualJobOrderId(updatedJobOrder.id)
      setWorkbenchStage(getSuggestedControlCenterStage(updatedJobOrder, 'overview'))
      void loadJobOrderSummaries()
      setStatusState({
        status: 'status_update_saved',
        message: `Job order moved to ${formatStatusLabel(updatedJobOrder.status)}.`,
      })
    } catch (error) {
      let nextStatus = 'update_failed'

      if (error instanceof ApiError && error.status === 403) {
        nextStatus = 'forbidden_role'
      } else if (error instanceof ApiError && error.status === 404) {
        nextStatus = 'job_order_not_found'
      } else if (error instanceof ApiError && error.status === 409) {
        nextStatus = String(error?.message ?? '').toLowerCase().includes('already updated')
          ? 'update_conflict'
          : 'invalid_transition'
        if (nextStatus === 'update_conflict') {
          try {
            const conflictMessage = await reloadLatestActiveJobOrder((refreshedJobOrder) =>
              `Another staff member already updated this job order. The latest status is ${formatStatusLabel(refreshedJobOrder.status)}.`,
            )
            setStatusState({
              status: nextStatus,
              message: conflictMessage,
            })
            return
          } catch {}
        }
      }

      setStatusState({
        status: nextStatus,
        message:
          error?.message === 'Assigned technicians are required before operational status changes'
            ? 'This job order has no saved technician assignment. Assign at least one technician, then retry the status change.'
            : error?.message || 'Job-order status could not be updated.',
      })
    }
  }

  const handleAddProgressEntry = async () => {
    if (!activeJobOrder?.id) {
      setProgressState({
        status: 'progress_job_order_not_found',
        message: 'Load a job order before appending progress.',
      })
      return
    }

    if (!canAppendProgress) {
      setProgressState({
        status: ['technician', 'head_technician'].includes(role) ? 'progress_not_assigned' : 'progress_forbidden_role',
        message:
          ['technician', 'head_technician'].includes(role)
            ? 'Only assigned technicians can append progress entries for this job order.'
            : 'Progress entries are technician-owned in this slice.',
      })
      return
    }

    if (!user?.accessToken) {
      setProgressState({
        status: 'progress_failed',
        message: 'A valid staff session is required before appending progress.',
      })
      return
    }

    if (selectedCompletedItemsMissingPhotoEvidence.length > 0) {
      setProgressState({
        status: 'progress_failed',
        message: `Add work-item photo evidence before marking complete: ${selectedCompletedItemsMissingPhotoEvidence
          .map((item) => item.name)
          .join(', ')}. Open Evidence and set the upload target to the matching work item.`,
      })
      return
    }

    setProgressState({
      status: 'progress_submitting',
      message: '',
    })

    try {
      const updatedJobOrder = await addJobOrderProgressEntry({
        jobOrderId: activeJobOrder.id,
        entryType: progressDraft.entryType,
        message: progressDraft.message,
        completedItemIds: progressDraft.completedItemIds,
        expectedUpdatedAt: activeJobOrder.updatedAt,
        accessToken: user.accessToken,
      })

      setActiveJobOrder(updatedJobOrder)
      setWorkbenchStage(getSuggestedControlCenterStage(updatedJobOrder, 'overview'))
      setProgressDraft(emptyProgressDraft)
      setProgressState({
        status: 'progress_saved',
        message:
          updatedJobOrder.status === 'in_progress'
            ? 'Progress entry saved. The job order is now In Progress and can move toward QA handoff once workshop work is complete.'
            : 'Progress entry saved and job-order detail refreshed.',
      })
    } catch (error) {
      let nextStatus = 'progress_failed'

      if (error instanceof ApiError && error.status === 403) {
        nextStatus = 'progress_forbidden_role'
      } else if (error instanceof ApiError && error.status === 404) {
        nextStatus = 'progress_job_order_not_found'
      } else if (error instanceof ApiError && error.status === 409) {
        nextStatus = 'progress_conflict'
        try {
          const conflictMessage = await reloadLatestActiveJobOrder()
          setProgressState({
            status: nextStatus,
            message: conflictMessage,
          })
          return
        } catch {}
      }

      setProgressState({
        status: nextStatus,
        message: error?.message || 'Progress entry could not be saved.',
      })
    }
  }

  const handleAddPhotoEvidence = async () => {
    if (!activeJobOrder?.id) {
      setPhotoState({
        status: 'photo_job_order_not_found',
        message: 'Load a job order before attaching photo evidence.',
      })
      return
    }

    if (!canAttachPhoto) {
      setPhotoState({
        status: 'photo_forbidden_role',
        message: 'Only assigned technicians, service advisers, or super admins can attach photo evidence.',
      })
      return
    }

    if (!user?.accessToken) {
      setPhotoState({
        status: 'photo_failed',
        message: 'A valid staff session is required before attaching photo evidence.',
      })
      return
    }

    if (!(photoDraft.file instanceof File)) {
      setPhotoState({
        status: 'photo_failed',
        message: 'Choose an image file before uploading evidence.',
      })
      return
    }

    setPhotoState({
      status: 'photo_submitting',
      message: '',
    })

    try {
      const updatedJobOrder = await addJobOrderPhotoEvidence({
        jobOrderId: activeJobOrder.id,
        file: photoDraft.file,
        caption: photoDraft.caption,
        linkedEntityType: photoDraft.linkedEntityType,
        linkedEntityId: photoDraft.linkedEntityId,
        expectedUpdatedAt: activeJobOrder.updatedAt,
        accessToken: user.accessToken,
      })

      setActiveJobOrder(updatedJobOrder)
      setWorkbenchStage(getSuggestedControlCenterStage(updatedJobOrder, 'overview'))
      setPhotoDraft({
        ...emptyPhotoDraft,
        linkedEntityType: recommendedPhotoTargetOption?.linkedEntityType ?? photoTargetOptions[0]?.linkedEntityType ?? 'job_order',
        linkedEntityId: recommendedPhotoTargetOption?.linkedEntityId ?? photoTargetOptions[0]?.linkedEntityId ?? '',
      })
      setPhotoInputResetKey((current) => current + 1)
      setPhotoState({
        status: 'photo_saved',
        message: 'Photo evidence uploaded and job-order detail refreshed.',
      })
    } catch (error) {
      let nextStatus = 'photo_failed'

      if (error instanceof ApiError && error.status === 403) {
        nextStatus = 'photo_forbidden_role'
      } else if (error instanceof ApiError && error.status === 404) {
        nextStatus = 'photo_job_order_not_found'
      } else if (error instanceof ApiError && error.status === 409) {
        nextStatus = 'photo_conflict'
        try {
          const conflictMessage = await reloadLatestActiveJobOrder()
          setPhotoState({
            status: nextStatus,
            message: conflictMessage,
          })
          return
        } catch {}
      }

      setPhotoState({
        status: nextStatus,
        message: error?.message || 'Photo evidence could not be uploaded.',
      })
    }
  }

  const handleFinalizeJobOrder = async () => {
    if (!activeJobOrder?.id) {
      setFinalizeState({
        status: 'finalize_job_order_not_found',
        message: 'Load a job order before finalizing invoice-ready work.',
      })
      return
    }

    if (!canFinalizeOrPay) {
      setFinalizeState({
        status: 'finalize_forbidden_role',
        message: 'Only the responsible service adviser or a super admin can finalize this job order.',
      })
      return
    }

    if (!user?.accessToken) {
      setFinalizeState({
        status: 'finalize_failed',
        message: 'A valid staff session is required before finalization.',
      })
      return
    }

    setFinalizeState({
      status: 'finalize_submitting',
      message: '',
    })

    try {
      const updatedJobOrder = await finalizeJobOrder({
        jobOrderId: activeJobOrder.id,
        summary: finalizeDraft.summary,
        amountPaid: paymentDraft.amountPaid,
        paymentMethod: paymentDraft.paymentMethod,
        paymentReference: paymentDraft.reference,
        receivedAt: paymentDraft.receivedAt,
        expectedUpdatedAt: activeJobOrder.updatedAt,
        accessToken: user.accessToken,
      })

      setActiveJobOrder(updatedJobOrder)
      setWorkbenchStage(getSuggestedControlCenterStage(updatedJobOrder, 'overview'))
      void loadJobOrderSummaries()
      setFinalizeState({
        status: 'finalize_saved',
        message:
          updatedJobOrder.invoiceRecord?.paymentStatus === 'paid'
            ? `Invoice-ready record ${updatedJobOrder.invoiceRecord?.invoiceReference ?? ''} generated and payment recorded.`
            : `Invoice-ready record ${updatedJobOrder.invoiceRecord?.invoiceReference ?? ''} generated.`,
      })
    } catch (error) {
      let nextStatus = 'finalize_failed'

      if (error instanceof ApiError && error.status === 403) {
        nextStatus = 'finalize_forbidden_role'
      } else if (error instanceof ApiError && error.status === 404) {
        nextStatus = 'finalize_job_order_not_found'
      } else if (error instanceof ApiError && error.status === 409) {
        nextStatus = String(error?.message ?? '').toLowerCase().includes('already updated')
          ? 'finalize_conflict'
          : 'finalize_blocked_by_qa'
        if (nextStatus === 'finalize_conflict') {
          try {
            const conflictMessage = await reloadLatestActiveJobOrder()
            setFinalizeState({
              status: nextStatus,
              message: conflictMessage,
            })
            return
          } catch {}
        }
      }

      setFinalizeState({
        status: nextStatus,
        message: error?.message || 'Job-order finalization could not be completed.',
      })
    }
  }

  const handleRecordInvoicePayment = async () => {
    if (!activeJobOrder?.id) {
      setPaymentState({
        status: 'payment_job_order_not_found',
        message: 'Load a finalized job order before recording invoice payment.',
      })
      return
    }

    if (!activeJobOrder.invoiceRecord) {
      setPaymentState({
        status: 'payment_not_finalized',
        message: 'Finalize the job order before recording invoice payment.',
      })
      return
    }

    if (activeJobOrder.invoiceRecord.paymentStatus === 'paid') {
      setPaymentState({
        status: 'payment_already_paid',
        message: 'This invoice-ready record is already paid.',
      })
      return
    }

    if (!canFinalizeOrPay) {
      setPaymentState({
        status: 'payment_forbidden_role',
        message: 'Only the responsible service adviser or a super admin can record invoice payment.',
      })
      return
    }

    if (!user?.accessToken) {
      setPaymentState({
        status: 'payment_failed',
        message: 'A valid staff session is required before recording invoice payment.',
      })
      return
    }

      setPaymentState({
        status: 'payment_submitting',
        message: '',
      })

    try {
      const updatedJobOrder = await recordJobOrderInvoicePayment({
        jobOrderId: activeJobOrder.id,
        amountPaid: paymentDraft.amountPaid,
        paymentMethod: paymentDraft.paymentMethod,
        reference: paymentDraft.reference,
        receivedAt: paymentDraft.receivedAt,
        expectedUpdatedAt: activeJobOrder.updatedAt,
        accessToken: user.accessToken,
      })

      setActiveJobOrder(updatedJobOrder)
      setWorkbenchStage(getSuggestedControlCenterStage(updatedJobOrder, 'overview'))
      void loadJobOrderSummaries()
      setPaymentState({
        status: 'payment_saved',
        message: 'Invoice payment recorded and job-order detail refreshed.',
      })
    } catch (error) {
      let nextStatus = 'payment_failed'
      const errorMessage = String(error?.message ?? '').toLowerCase()

      if (error instanceof ApiError && error.status === 403) {
        nextStatus = 'payment_forbidden_role'
      } else if (error instanceof ApiError && error.status === 404) {
        nextStatus = 'payment_job_order_not_found'
      } else if (error instanceof ApiError && error.status === 409) {
        nextStatus = errorMessage.includes('already updated')
          ? 'payment_conflict'
          : errorMessage.includes('already paid')
            ? 'payment_already_paid'
            : 'payment_not_finalized'
        if (nextStatus === 'payment_conflict') {
          try {
            const conflictMessage = await reloadLatestActiveJobOrder()
            setPaymentState({
              status: nextStatus,
              message: conflictMessage,
            })
            return
          } catch {}
        }
      }

      setPaymentState({
        status: nextStatus,
        message: error?.message || 'Invoice payment could not be recorded.',
      })
    }
  }

  const reloadLatestActiveJobOrder = async (messageBuilder) => {
    if (!activeJobOrder?.id || !user?.accessToken) {
      return null
    }

    const refreshedJobOrder = await getJobOrderById({
      jobOrderId: activeJobOrder.id,
      accessToken: user.accessToken,
    })

    setActiveJobOrder(refreshedJobOrder)
    setManualJobOrderId(refreshedJobOrder.id)
    setWorkbenchStage(getSuggestedControlCenterStage(refreshedJobOrder, 'overview'))
    void loadJobOrderSummaries()

    return typeof messageBuilder === 'function'
      ? messageBuilder(refreshedJobOrder)
      : 'Another staff member already updated this job order. The latest record was reloaded.'
  }

  const handleStartInvoicePaymongoCheckout = async () => {
    if (!activeJobOrder?.id || !activeJobOrder.invoiceRecord) {
      setPaymentState({
        status: 'payment_not_finalized',
        message: 'Finalize the job order before starting PayMongo checkout.',
      })
      return
    }

    if (!user?.accessToken) {
      setPaymentState({
        status: 'payment_failed',
        message: 'A valid staff session is required before starting PayMongo checkout.',
      })
      return
    }

    setPaymentState({
      status: 'payment_submitting',
      message: '',
    })

    try {
      const updatedJobOrder = await startJobOrderInvoicePaymongoCheckout({
        jobOrderId: activeJobOrder.id,
        accessToken: user.accessToken,
      })

      setActiveJobOrder(updatedJobOrder)
      setWorkbenchStage(getSuggestedControlCenterStage(updatedJobOrder, 'overview'))
      void loadJobOrderSummaries()

      const checkoutUrl = updatedJobOrder?.invoiceRecord?.onlinePaymentCheckoutUrl
      if (checkoutUrl && typeof window !== 'undefined') {
        window.open(checkoutUrl, '_blank', 'noopener,noreferrer')
      }

      setPaymentState({
        status: 'payment_saved',
        message:
          updatedJobOrder?.invoiceRecord?.onlinePaymentStatus === 'paid'
            ? 'PayMongo reported this invoice as paid and the workbench refreshed.'
            : checkoutUrl
              ? 'PayMongo checkout created. A new tab was opened for online settlement.'
              : 'PayMongo checkout state refreshed.',
      })
    } catch (error) {
      setPaymentState({
        status: 'payment_failed',
        message: error?.message || 'PayMongo checkout could not be started.',
      })
    }
  }

  const handleRefreshInvoicePaymongoCheckout = async () => {
    if (!activeJobOrder?.id || !activeJobOrder.invoiceRecord) {
      setPaymentState({
        status: 'payment_not_finalized',
        message: 'Finalize the job order before refreshing PayMongo checkout.',
      })
      return
    }

    if (!user?.accessToken) {
      setPaymentState({
        status: 'payment_failed',
        message: 'A valid staff session is required before refreshing PayMongo checkout.',
      })
      return
    }

    setPaymentState({
      status: 'payment_submitting',
      message: '',
    })

    try {
      const updatedJobOrder = await reconcileJobOrderInvoicePaymongoCheckout({
        jobOrderId: activeJobOrder.id,
        accessToken: user.accessToken,
      })

      setActiveJobOrder(updatedJobOrder)
      setWorkbenchStage(getSuggestedControlCenterStage(updatedJobOrder, 'overview'))
      void loadJobOrderSummaries()
      setPaymentState({
        status: 'payment_saved',
        message:
          updatedJobOrder?.invoiceRecord?.paymentStatus === 'paid'
            ? 'PayMongo settlement was confirmed and the invoice is now marked paid.'
            : 'PayMongo checkout state refreshed from the live provider.',
      })
    } catch (error) {
      setPaymentState({
        status: 'payment_failed',
        message: error?.message || 'PayMongo checkout state could not be refreshed.',
      })
    }
  }

  const handleExportInvoice = async () => {
    if (!activeJobOrder?.id || !activeJobOrder.invoiceRecord) {
      setFinalizeState({
        status: 'finalize_failed',
        message: 'Finalize the job order before exporting the invoice PDF.',
      })
      return
    }

    if (!user?.accessToken) {
      setFinalizeState({
        status: 'finalize_failed',
        message: 'A valid staff session is required before exporting invoice PDF.',
      })
      return
    }

    try {
      const pdfBlob = await exportJobOrderInvoicePdf({
        jobOrderId: activeJobOrder.id,
        accessToken: user.accessToken,
      })
      const downloadUrl = URL.createObjectURL(pdfBlob)
      const anchor = document.createElement('a')
      anchor.href = downloadUrl
      anchor.download = `${activeJobOrder.invoiceRecord.invoiceReference || activeJobOrder.id}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(downloadUrl)
      setFinalizeState({
        status: 'finalize_saved',
        message: 'Invoice PDF generated and downloaded.',
      })
    } catch (error) {
      setFinalizeState({
        status: 'finalize_failed',
        message: error?.message || 'Invoice PDF could not be generated.',
      })
    }
  }

  const getMessageClassName = (tone) =>
    tone === 'success'
      ? 'status-message status-message-success'
      : tone === 'danger'
        ? 'status-message status-message-danger'
        : 'status-message status-message-warning'

  const detailStateClassName = getMessageClassName(
    detailState.status === 'detail_loading'
      ? 'neutral'
      : detailState.status === 'detail_loaded'
        ? 'success'
        : 'danger',
  )
  const calendarStateClassName = getMessageClassName(
    jobOrderCalendarState.status === 'error' || jobOrderSummaryState.status === 'error'
      ? 'danger'
      : 'neutral',
  )
  const handoffStateClassName = getMessageClassName(
    handoffState.status === 'handoff_load_failed' || handoffState.status === 'handoff_forbidden_role'
      ? 'danger'
      : 'success',
  )
  const createStateClassName = getMessageClassName(
    createState.status === 'create_saved' ? 'success' : 'danger',
  )
  const assignmentStateClassName = getMessageClassName(
    assignmentState.status === 'assignment_saved' ? 'success' : 'danger',
  )
  const statusStateClassName = getMessageClassName(
    statusState.status === 'status_update_saved' ? 'success' : 'danger',
  )
  const progressStateClassName = getMessageClassName(
    progressState.status === 'progress_saved' ? 'success' : 'danger',
  )
  const photoStateClassName = getMessageClassName(
    photoState.status === 'photo_saved' ? 'success' : 'danger',
  )
  const finalizeStateClassName = getMessageClassName(
    finalizeState.status === 'finalize_saved' ? 'success' : 'danger',
  )
  const paymentStateClassName = getMessageClassName(
    paymentState.status === 'payment_saved' ? 'success' : 'danger',
  )

  if (!canUseWorkbench) {
    return (
      <div className="ops-page-shell">
        <BlockingState
          title="Job-order workbench is staff-only"
          copy="This workspace is reserved for technicians, service advisers, and super admins. Customer accounts remain mobile-only."
        />
      </div>
    )
  }

  return (
    <div className="ops-page-shell">
      <PageHeader
        eyebrow="Workshop Operations"
        title="Job Orders"
        description="Review active work, update progress, and prepare jobs for QA."
        meta={(
          <>
            <span className="badge badge-gray">{formatDate(selectedDate)}</span>
            <span className={`badge ${workbenchScope === 'history' ? 'badge-blue' : 'badge-orange'}`}>
              {workbenchScope === 'history' ? 'History view' : 'Active view'}
            </span>
          </>
        )}
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <div className="booking-segmented-control">
              {[
                { key: 'active', label: 'Active' },
                { key: 'history', label: 'History' },
              ].map((view) => (
                <button
                  key={view.key}
                  type="button"
                  onClick={() => setWorkbenchScope(view.key)}
                  className={`booking-tab-button ${workbenchScope === view.key ? 'booking-tab-button-active' : ''}`}
                >
                  {view.label}
                </button>
              ))}
            </div>
            {!isTechnician ? (
              <button
                type="button"
                onClick={loadBookingHandoffs}
                className="ops-action-secondary min-w-[148px] self-start xl:self-auto"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            ) : null}
          </div>
        )}
      />

      {!activeJobOrder || isQueueStageVisible ? (
        <section className="ops-summary-grid">
          {isTechnician ? (
            <SummaryTile
              icon={ClipboardList}
              label={workbenchScope === 'history' ? 'Assigned History' : 'Assigned Queue'}
              value={activeJobOrder ? 'Loaded' : 'Awaiting load'}
              sub={
                activeJobOrder
                  ? `Job order ${activeJobOrder.id.slice(0, 8).toUpperCase()} is ready for technician updates`
                  : workbenchScope === 'history'
                    ? 'Choose one of your finalized or cancelled assigned job orders to review'
                    : 'Choose one of your assigned job orders to begin'
              }
            />
          ) : (
            <SummaryTile
              icon={ClipboardList}
              label={workbenchScope === 'history' ? 'Job Order History' : 'Booking Handoff Queue'}
              value={workbenchScope === 'history' ? monthJobOrders.length : handoffCandidates.length}
              sub={
                workbenchScope === 'history'
                  ? 'Finalized and cancelled work stays here instead of the live workshop queue.'
                  : handoffState.status === 'handoff_empty'
                    ? 'No confirmed booking source is ready today'
                    : 'Ready for job-order handoff'
              }
            />
          )}
          <SummaryTile
            icon={Wrench}
            label="Active Phase"
            value={activeJobOrder ? formatStatusLabel(executionPhase) : 'Awaiting load'}
            sub={
              activeJobOrder
                ? `Current status: ${formatStatusLabel(activeJobOrder.status)}`
                : 'Load or create a job order to begin execution'
            }
          />
          <SummaryTile
            icon={ShieldCheck}
            label={isTechnician ? 'Progress Access' : 'Assignment State'}
            value={
              isTechnician
                ? activeJobOrder
                  ? canAppendProgress
                    ? 'Assigned'
                    : 'Read only'
                  : 'Awaiting load'
                : activeJobOrder
                  ? activeJobOrder.assignedTechnicianIds.length > 0
                    ? `${activeJobOrder.assignedTechnicianIds.length} assigned`
                    : 'Unassigned'
                  : selectedCandidate
                    ? 'Ready to assign'
                    : 'Awaiting source'
            }
            sub={
              isTechnician
                ? activeJobOrder
                  ? canAppendProgress
                    ? 'You can append technician progress entries to this job order.'
                    : 'Only the assigned technician can append progress for this job order.'
                  : 'Load a job order to confirm assignment access.'
                : activeJobOrder
                  ? activeJobOrder.assignedTechnicianIds.join(', ') || 'No technician assigned'
                  : selectedCandidate
                    ? selectedCandidate.serviceSummary
                    : 'Select a confirmed or workshop-handoff booking first'
            }
          />
          <SummaryTile
            icon={isTechnician ? FileStack : FileStack}
            label={isTechnician ? 'Photo Evidence' : 'Finalize & Payment'}
            value={
              isTechnician
                ? activeJobOrder
                  ? `${activeJobOrder.photos.length} attached`
                  : 'Awaiting load'
                : activeJobOrder?.invoiceRecord
                  ? formatStatusLabel(activeJobOrder.invoiceRecord.paymentStatus)
                  : activeJobOrder
                    ? 'Not finalized'
                    : 'No invoice record'
            }
            sub={
              isTechnician
                ? activeJobOrder?.photos[0]?.caption ??
                  activeJobOrder?.photos[0]?.fileName ??
                  'Attach before-and-after evidence while the work is active.'
                : activeJobOrder?.invoiceRecord
                  ? activeJobOrder.invoiceRecord.invoiceReference
                  : 'Finalization creates the invoice-ready record'
            }
          />
        </section>
      ) : (
        <section className="rounded-[20px] border border-surface-border bg-surface-card/90 px-4 py-3 shadow-[0_12px_24px_rgba(0,0,0,0.14)] backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-ink-secondary">
              <span className="badge badge-gray">Queue collapsed</span>
              <span>
                <span className="font-semibold text-ink-primary">JO-{activeJobOrder.id.slice(0, 8).toUpperCase()}</span>{' '}
                is active - {controlCenterNextAction.stepLabel} - {controlCenterNextAction.title}
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigateToWorkbenchStage('queue')}
              className="ops-action-secondary sm:min-w-[148px]"
            >
              <ClipboardList size={14} />
              Open queue
            </button>
          </div>
        </section>
      )}

      {isQueueStageVisible ? (
      <section id="job-order-queue-panel" className="ops-panel scroll-mt-48">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="card-title">Job Order Queue</p>
            <p className="mt-1 text-sm leading-6 text-ink-secondary">
              Focus on the live execution queue first, then stay on one loaded record while you work through the guided stages below.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`badge ${workbenchScope === 'history' ? 'badge-blue' : 'badge-orange'}`}>
              {workbenchScope === 'history' ? 'History queue' : 'Live queue'}
            </span>
            <span className="badge badge-gray">
              {isTechnician
                ? `${selectedDateJobOrders.length} assigned on this date`
                : `${handoffCandidates.length} handoff source${handoffCandidates.length === 1 ? '' : 's'}`}
            </span>
          </div>
        </div>

        {activeJobOrder && workbenchStage !== 'queue' ? (
          <div className="mt-4 rounded-2xl border border-surface-border bg-surface-card px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink-primary">
                  Queue is now supporting the loaded record
                </p>
                <p className="mt-1 text-sm text-ink-secondary">
                  JO-{activeJobOrder.id.slice(0, 8).toUpperCase()} is active in the workspace. Use Queue again whenever you need to switch records or create a new job order from booking handoff.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWorkbenchStage('queue')}
                className="ops-action-secondary sm:min-w-[148px]"
              >
                <ClipboardList size={14} />
                Return to Queue
              </button>
            </div>
          </div>
        ) : null}

        {isQueueStageVisible ? (
          <>
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
              <label>
                <span className="label">
                  {workbenchScope === 'history' ? 'History date' : isTechnician ? 'Assigned work date' : 'Schedule date'}
                </span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value || toDateKey())}
                  className="input"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <label>
                  <span className="label">{isTechnician ? 'Assigned job order' : 'Job-order lookup'}</span>
                  <select
                    value={manualJobOrderId}
                    onChange={(event) => setManualJobOrderId(event.target.value)}
                    className="select"
                  >
                    <option value="">
                      {selectedDateJobOrders.length > 0
                        ? 'Choose a job order for the selected date'
                        : monthJobOrders.length > 0
                          ? 'No job orders on this date - choose from this month'
                          : 'No job orders available in this month'}
                    </option>
                    {selectedDateJobOrders.length > 0 ? (
                      <optgroup label="Selected date">
                        {selectedDateJobOrders.map((jobOrder) => (
                          <option key={jobOrder.id} value={jobOrder.id}>
                            JO-{jobOrder.id.slice(0, 8).toUpperCase()} - {formatStatusLabel(jobOrder.status)} - {formatDate(jobOrder.workDate)}
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                    {monthJobOrders.filter((jobOrder) => jobOrder.workDate !== selectedDate).length > 0 ? (
                      <optgroup label={`Other dates in ${selectedMonth}`}>
                        {monthJobOrders
                          .filter((jobOrder) => jobOrder.workDate !== selectedDate)
                          .map((jobOrder) => (
                            <option key={jobOrder.id} value={jobOrder.id}>
                              JO-{jobOrder.id.slice(0, 8).toUpperCase()} - {formatDate(jobOrder.workDate)} - {formatStatusLabel(jobOrder.status)}
                            </option>
                          ))}
                      </optgroup>
                    ) : null}
                  </select>
                </label>
                <button
                  onClick={handleLoadJobOrder}
                  className="ops-action-primary sm:min-w-[168px] sm:self-end"
                  disabled={!manualJobOrderId}
                >
                  <RefreshCw size={14} />
                  Load Job Order
                </button>

                {detailState.message ? (
                  <div className={`sm:col-span-2 ${detailStateClassName}`}>{detailState.message}</div>
                ) : (
                  <p className="sm:col-span-2 text-[11px] text-ink-muted">
                    {isTechnician
                      ? 'Choose an assigned job order before updating it.'
                      : workbenchScope === 'history'
                        ? 'History mode keeps completed work out of the live queue.'
                        : 'Use the selector to load a known live record.'}
                  </p>
                )}
              </div>

              <div className="lg:col-span-2 rounded-xl border border-surface-border bg-surface-card px-4 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-ink-primary">
                      {workbenchScope === 'history'
                        ? 'Dates with finalized and cancelled job orders'
                        : 'Dates with job orders and booking handoff queue'}
                    </p>
                    <p className="mt-1 text-sm text-ink-secondary">
                      {isTechnician
                        ? 'These dates already have assigned job orders in the selected month.'
                        : workbenchScope === 'history'
                          ? 'These dates contain history records only.'
                          : 'These dates already have job orders or booking handoffs.'}
                    </p>
                  </div>
                  <span className="badge badge-gray">
                    {markedWorkbenchDates.length} date{markedWorkbenchDates.length === 1 ? '' : 's'} marked
                  </span>
                </div>

                {(jobOrderCalendarState.message || jobOrderSummaryState.message) ? (
                  <div className={`mt-3 ${calendarStateClassName}`}>
                    {jobOrderCalendarState.message || jobOrderSummaryState.message}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {markedWorkbenchDates.length > 0 ? (
                    markedWorkbenchDates.map((entry) => {
                      const isSelectedDate = entry.date === selectedDate

                      return (
                        <button
                          key={entry.date}
                          type="button"
                          onClick={() => setSelectedDate(entry.date)}
                          className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                            isSelectedDate
                              ? 'border-brand-orange bg-brand-orange/10 text-ink-primary'
                              : 'border-surface-border bg-surface-raised text-ink-secondary hover:border-brand-orange/40 hover:text-ink-primary'
                          }`}
                        >
                          <span className="block font-semibold">{formatDate(entry.date)}</span>
                          <span className="mt-1 block text-[11px] opacity-80">
                            {entry.jobOrderCount} job order{entry.jobOrderCount === 1 ? '' : 's'}
                            {workbenchScope === 'active' && entry.bookingQueueCount > 0 ? ` / ${entry.bookingQueueCount} queue` : ''}
                          </span>
                        </button>
                      )
                    })
                  ) : (
                    <p className="text-xs text-ink-muted">
                      {workbenchScope === 'history'
                        ? `No finalized or cancelled job orders are marked for ${selectedMonth} yet.`
                        : `No job-order or booking-handoff dates are marked for ${selectedMonth} yet.`}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                  {isTechnician ? 'Assigned execution queue' : 'Booking handoff queue'}
                </p>
                <p className="mt-2 text-sm text-ink-primary">
                  {isTechnician
                    ? selectedDateJobOrders.length > 0
                      ? 'Load assigned work from the selector above before updating details below.'
                      : 'No assigned job orders are queued for the selected date yet.'
                    : handoffCandidates.length > 0
                      ? 'Confirmed bookings on this date are ready for job-order creation and execution follow-through.'
                      : 'No confirmed or workshop-handoff bookings are queued for the selected date yet.'}
                </p>
              </div>
            </div>
          </>
        ) : null}
      </section>
      ) : null}

      <section className="space-y-4">
        {activeJobOrder ? (
          <>
            <div className="sticky top-[76px] z-20 rounded-[24px] border border-surface-border bg-surface-card/95 px-4 py-4 shadow-[0_18px_40px_rgba(0,0,0,0.16)] backdrop-blur">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[24px] font-medium tracking-tight text-ink-primary">
                      JO-{activeJobOrder.id.slice(0, 8).toUpperCase()}
                    </p>
                    <StatusBadge status={activeJobOrder.status} />
                    <span className={`badge ${isBackJobRework ? 'badge-orange' : 'badge-green'}`}>
                      {isBackJobRework ? 'Back-job rework' : 'Normal job'}
                    </span>
                  </div>
                  <div className="grid gap-3 text-sm text-ink-secondary sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Customer</p>
                      <p className="mt-1 truncate text-ink-primary">
                        {activeSourceCandidate?.customerLabel ?? activeJobOrder.customerUserId}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Vehicle</p>
                      <p className="mt-1 truncate text-ink-primary">
                        {activeSourceCandidate?.vehicleLabel ?? activeJobOrder.vehicleId}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Source</p>
                      <p className="mt-1 truncate text-ink-primary">
                        {activeJobOrder.sourceType === 'booking'
                          ? `Booking ${activeJobOrder.sourceId.slice(0, 8).toUpperCase()}`
                          : `Back-job ${activeJobOrder.sourceId.slice(0, 8).toUpperCase()}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Service adviser</p>
                      <p className="mt-1 truncate text-ink-primary">
                        {activeJobOrder.serviceAdviserCode || activeJobOrder.serviceAdviserUserId}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <span className="badge badge-gray">
                    Active step: {WORKBENCH_STAGE_META[currentControlCenterStage]?.label ?? formatStatusLabel(currentControlCenterStage)}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigateToWorkbenchStage('queue')}
                    className="ops-action-secondary min-w-[148px]"
                  >
                    <ClipboardList size={14} />
                    Return to queue
                  </button>
                </div>
              </div>

              {isBackJobRework ? (
                <div className="mt-4 rounded-2xl border border-brand-orange/30 bg-brand-orange/10 px-4 py-3 text-sm text-amber-100">
                  This is a rework job order linked to the original complaint workflow. Complete the full execution pipeline before the back-job case can close.
                </div>
              ) : null}
            </div>

            <div className="sticky top-[196px] z-10 space-y-4 rounded-[24px] border border-surface-border bg-surface-card/95 px-4 py-4 shadow-[0_12px_30px_rgba(0,0,0,0.18)] backdrop-blur">
              <div className="grid grid-cols-2 gap-2 xl:grid-cols-8">
                {controlCenterSteps.map((step, index) => {
                  const isActiveStep = step.workbenchStage === currentControlCenterStage || (step.key === 'qa_audit' && activeJobOrder.status === 'ready_for_qa')
                  const baseClass =
                    step.state === 'done'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                      : step.state === 'blocked'
                        ? 'border-red-500/30 bg-red-500/10 text-red-100'
                        : step.state === 'action_needed' || isActiveStep
                          ? 'border-brand-orange/30 bg-brand-orange/10 text-amber-100'
                          : 'border-surface-border bg-surface-raised text-ink-secondary'

                  return (
                    <button
                      key={step.key}
                      type="button"
                      onClick={() => {
                        if (step.key === 'qa_audit' && activeJobOrder.status === 'ready_for_qa' && typeof window !== 'undefined') {
                          window.location.assign('/qa-audit')
                          return
                        }

                        if (step.state === 'locked') {
                          return
                        }

                        navigateToWorkbenchStage(step.workbenchStage)
                      }}
                      title={step.state === 'locked' ? `Complete the previous step first to unlock ${step.label}.` : step.note}
                      className={`rounded-2xl border px-3 py-3 text-left transition ${baseClass}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-current/25 text-[11px] font-semibold">
                          {step.state === 'done' ? 'OK' : step.state === 'blocked' ? 'X' : step.state === 'action_needed' ? '!' : index + 1}
                        </span>
                        <span className="text-[12px] font-semibold">{step.label}</span>
                      </div>
                      <p className="mt-2 text-[11px] opacity-80">{step.note}</p>
                    </button>
                  )
                })}
              </div>

              <div className={`rounded-[20px] border px-4 py-4 ${controlCenterNextAction.toneClass}`}>
                <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-80">
                      Next action - {controlCenterNextAction.stepLabel}
                    </p>
                    <p className="mt-2 text-lg font-medium text-ink-primary">{controlCenterNextAction.title}</p>
                    <p className="mt-2 max-w-4xl text-sm leading-6 opacity-90">{controlCenterNextAction.body}</p>
                  </div>
                  <div className="flex flex-col items-start gap-3 xl:items-end">
                    <span className={`badge ${controlCenterNextAction.roleMeta.badgeClass}`}>
                      {controlCenterNextAction.roleMeta.label}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (controlCenterNextAction.stageKey === 'qa_audit' && typeof window !== 'undefined') {
                            window.location.assign('/qa-audit')
                            return
                          }

                          navigateToWorkbenchStage(controlCenterNextAction.stageKey)
                        }}
                        className="ops-action-primary"
                      >
                        {controlCenterNextAction.actionLabel}
                      </button>
                      {controlCenterNextAction.secondaryLabel ? (
                        <button
                          type="button"
                          onClick={() => navigateToWorkbenchStage('overview')}
                          className="ops-action-secondary"
                        >
                          {controlCenterNextAction.secondaryLabel}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
              <div className="rounded-[24px] border border-surface-border bg-surface-card p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="card-title">
                        {WORKBENCH_STAGE_META[currentControlCenterStage]?.label ?? 'Overview'} control center
                      </p>
                      <span className={`badge ${controlCenterRoleMeta.badgeClass}`}>{controlCenterRoleMeta.label}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-ink-secondary">
                      The live stage tools now stay below this control center. Use the highlighted step and action button to jump into the right panel without guessing which workflow surface comes next.
                    </p>
                  </div>
                  <span className="badge badge-gray">
                    Updated {formatDateTime(activeJobOrder.updatedAt)}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Current phase</p>
                    <p className="mt-2 text-sm font-medium text-ink-primary">{formatStatusLabel(executionPhase)}</p>
                    <p className="mt-2 text-xs leading-5 text-ink-secondary">
                      {nextActionSummary.body}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Live work summary</p>
                    <p className="mt-2 text-sm font-medium text-ink-primary">
                      {activeJobOrder.itemCount} work item{activeJobOrder.itemCount === 1 ? '' : 's'} - {activeJobOrder.completedItemCount} completed
                    </p>
                    <p className="mt-2 text-xs leading-5 text-ink-secondary">
                      {activeJobOrder.latestProgressEntry?.message ?? 'No progress trail saved yet for this job order.'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {availableWorkbenchStages.map((stage) => (
                    <button
                      key={stage.key}
                      type="button"
                      onClick={() => navigateToWorkbenchStage(stage.key)}
                      className={`rounded-xl border px-3 py-2 text-sm transition ${
                        workbenchStage === stage.key
                          ? 'border-brand-orange bg-brand-orange/10 text-ink-primary'
                          : 'border-surface-border bg-surface-raised text-ink-secondary hover:border-brand-orange/40 hover:text-ink-primary'
                      }`}
                    >
                      {stage.label}
                    </button>
                  ))}
                </div>

                {statusState.message && !isTechnician && isOverviewStageActive ? (
                  <div className={`mt-4 ${statusStateClassName}`}>{statusState.message}</div>
                ) : null}
              </div>

              <div className="space-y-4">
                <div className="rounded-[24px] border border-surface-border bg-surface-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="card-title">Completion checklist</p>
                    <span className="badge badge-gray">{controlCenterSteps.filter((step) => step.state === 'done').length}/8 done</span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {controlCenterSteps.map((step) => {
                      const rowTone =
                        step.state === 'done'
                          ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-100'
                          : step.state === 'blocked'
                            ? 'border-red-500/25 bg-red-500/10 text-red-100'
                            : step.state === 'action_needed' || step.state === 'active'
                              ? 'border-brand-orange/25 bg-brand-orange/10 text-amber-100'
                              : 'border-surface-border bg-surface-raised text-ink-secondary'

                      return (
                        <div key={`check-${step.key}`} className={`rounded-2xl border px-3 py-3 ${rowTone}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium">{step.label}</p>
                              <p className="mt-1 text-xs opacity-80">{step.note}</p>
                            </div>
                            <span className="text-xs font-semibold">
                              {step.state === 'done'
                                ? 'Done'
                                : step.state === 'blocked'
                                  ? 'Blocked'
                                  : step.state === 'locked'
                                    ? 'Locked'
                                    : 'Pending'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="rounded-[24px] border border-surface-border bg-surface-card p-4">
                  <p className="card-title">Job snapshot</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Assigned team</p>
                      <p className="mt-2 text-sm text-ink-primary">
                        {hasSavedAssignments
                          ? `${activeJobOrder.assignedTechnicianIds.length} technician${activeJobOrder.assignedTechnicianIds.length === 1 ? '' : 's'} saved`
                          : 'No saved assignment'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Evidence</p>
                      <p className="mt-2 text-sm text-ink-primary">{activeJobOrder.photos.length} attached</p>
                    </div>
                    <div className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Invoice</p>
                      <p className="mt-2 text-sm text-ink-primary">
                        {activeJobOrder.invoiceRecord?.invoiceReference ?? 'Not finalized'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Payment</p>
                      <p className="mt-2 text-sm text-ink-primary">
                        {activeJobOrder.invoiceRecord?.paymentStatus
                          ? formatStatusLabel(activeJobOrder.invoiceRecord.paymentStatus)
                          : 'Not ready'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-red-500/25 bg-red-500/5 p-4">
                  <p className="card-title">Why can&apos;t I finish this yet?</p>
                  <ol className="mt-3 space-y-2 pl-5 text-sm leading-6 text-ink-secondary">
                    {controlCenterBlockerReasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </>
        ) : (
          <section className="ops-panel">
            <div className="empty-panel mt-0">
              <AlertTriangle size={28} className="mx-auto mb-3 text-ink-dim" />
              <p className="text-sm font-semibold text-ink-primary">No job order loaded yet</p>
              <p className="mt-2 text-sm leading-6 text-ink-secondary">
                {isTechnician
                  ? 'Choose one of your assigned job orders to start technician execution updates.'
                  : 'Create a job order from a confirmed or workshop-handoff booking, or choose an existing job order from the selector.'}
              </p>
            </div>
          </section>
        )}
      </section>

      <section className="space-y-4">
        {activeJobOrder ? (
          <div className="rounded-[20px] border border-surface-border bg-surface-card px-4 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="card-title">Active work panel</p>
                  <span className={`badge ${controlCenterRoleMeta.badgeClass}`}>{controlCenterRoleMeta.label}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-ink-secondary">
                  This is the live working surface for the current step. The stepper and next-action banner above now route straight into the correct panel below.
                </p>
              </div>
              <span className="badge badge-gray">
                Current stage: {WORKBENCH_STAGE_META[workbenchStage]?.label ?? formatStatusLabel(workbenchStage)}
              </span>
            </div>
          </div>
        ) : null}

      {isTechnician ? (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
          <div className="space-y-5">
            {isOverviewStageActive ? (
            <div id="job-order-stage-overview" className="ops-panel scroll-mt-48">
              <div>
                <p className="card-title">Technician Workflow Notes</p>
                <p className="text-xs text-ink-muted mt-1">
                  Execution updates stay here; handoff and billing stay with advisers or admins.
                </p>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-xl border border-surface-border bg-surface-card p-4">
                  <p className="text-sm font-bold text-ink-primary">1. Load the assigned job order</p>
                  <p className="mt-2 text-sm leading-6 text-ink-secondary">
                    Start from the assigned job-order selector so your status changes and evidence stay attached to the correct workshop record.
                  </p>
                </div>
                <div className="rounded-xl border border-surface-border bg-surface-card p-4">
                  <p className="text-sm font-bold text-ink-primary">2. Keep progress current</p>
                  <p className="mt-2 text-sm leading-6 text-ink-secondary">
                    Add a concise workshop note whenever work starts, issues appear, or service items are completed.
                  </p>
                </div>
                <div className="rounded-xl border border-surface-border bg-surface-card p-4">
                  <p className="text-sm font-bold text-ink-primary">3. Attach reviewable proof</p>
                  <p className="mt-2 text-sm leading-6 text-ink-secondary">
                    Before-and-after photos help the next QA or adviser handoff without changing booking truth.
                  </p>
                </div>
              </div>
            </div>
            ) : null}

            {isProgressStageActive ? (
            <div id="job-order-stage-progress" className="ops-panel scroll-mt-48">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="card-title">Execution Control</p>
                    <span className="badge badge-green">Technician / head tech</span>
                  </div>
                  <p className="text-xs text-ink-muted mt-1">
                    Move the loaded job order through valid execution states.
                  </p>
                </div>
                <span className="badge badge-gray">
                  Next states: {nextStatuses.length > 0 ? nextStatuses.join(', ') : 'none'}
                </span>
              </div>

              <div className="mt-4 rounded-xl border border-surface-border bg-surface-card p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Current execution status</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={activeJobOrder?.status} />
                      <span className="text-sm text-ink-secondary">
                        {activeJobOrder?.status === 'assigned'
                          ? 'Start work first before QA handoff can unlock.'
                          : activeJobOrder?.status === 'in_progress'
                            ? 'Use Send to QA only when work items and evidence are complete.'
                            : activeJobOrder?.status === 'blocked'
                              ? 'Resume workshop work before QA can continue.'
                              : 'Use the next valid status action below.'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {nextStatuses.map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handleStatusUpdate(status)}
                        disabled={!activeJobOrder || statusState.status === 'status_update_submitting'}
                        className={status === 'ready_for_qa' ? 'ops-action-primary' : 'ops-action-secondary'}
                      >
                        {WORKSHOP_STATUS_ACTION_LABELS[status] ?? `Mark as ${formatStatusLabel(status)}`}
                      </button>
                    ))}
                  </div>
                </div>
                {activeJobOrder?.status === 'assigned' && (hasProgressEntries || hasPhotoEvidence || activeJobOrder?.completedItemCount > 0) ? (
                  <div className="mt-3 rounded-lg border border-brand-orange/25 bg-brand-orange/10 px-3 py-2 text-[11px] leading-5 text-amber-100">
                    Workshop activity already exists on this job order, but the status is still <span className="font-semibold">Assigned</span>. Use <span className="font-semibold">Start work</span> first, then use <span className="font-semibold">Send to QA</span> after completion.
                  </div>
                ) : null}
              </div>

              <div className="grid md:grid-cols-2 gap-3 mt-4">
                <label className="text-xs text-ink-muted">
                  Next status
                  <select
                    value={statusDraft.status}
                    onChange={(event) =>
                      setStatusDraft((current) => ({
                        ...current,
                        status: event.target.value,
                      }))
                    }
                    className="mt-1 select"
                    disabled={!activeJobOrder || nextStatuses.length === 0}
                  >
                    {nextStatuses.length > 0 ? (
                      nextStatuses.map((status) => (
                        <option key={status} value={status}>
                          {formatStatusLabel(status)}
                        </option>
                      ))
                    ) : (
                      <option value={activeJobOrder?.status ?? 'draft'}>
                        {activeJobOrder ? 'No valid transition available' : 'Load a job order first'}
                      </option>
                    )}
                  </select>
                </label>
                <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                    Transition Guide
                  </p>
                  <p className="text-sm text-ink-primary mt-1">
                    Use status updates to reflect the live workshop phase.
                  </p>
                </div>
                <label className="text-xs text-ink-muted md:col-span-2">
                  Transition reason
                  <textarea
                    value={statusDraft.reason}
                    onChange={(event) =>
                      setStatusDraft((current) => ({
                        ...current,
                        reason: event.target.value,
                      }))
                    }
                    rows={3}
                    className="mt-1 textarea"
                    placeholder="Optional workshop reason for the selected transition."
                  />
                </label>
              </div>

              {statusState.message ? <div className={`mt-4 ${statusStateClassName}`}>{statusState.message}</div> : null}

              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={handleStatusUpdate}
                  disabled={
                    !activeJobOrder ||
                    nextStatuses.length === 0 ||
                    statusState.status === 'status_update_submitting'
                  }
                  className="ops-action-primary"
                >
                  {statusState.status === 'status_update_submitting' ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  Save Status Update - workshop
                </button>
              </div>
            </div>
            ) : null}
          </div>

          <div className="space-y-5">
            {(isProgressStageActive || isEvidenceStageActive) ? (
            <div id="job-order-stage-evidence" className="ops-panel scroll-mt-48">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="card-title">{isProgressStageActive ? 'Progress Updates' : 'Evidence'}</p>
                  <span className="badge badge-green">Technician / head tech</span>
                </div>
                <p className="text-xs text-ink-muted mt-1">
                  {isProgressStageActive
                    ? 'Keep the workshop trail current with technician notes and reviewable media.'
                    : 'Upload reviewable media so the next handoff sees stored evidence instead of guesswork.'}
                </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="badge badge-gray">Stored on the selected job order</span>
                </div>
              </div>

              <div className={`grid gap-4 mt-4 ${isProgressStageActive && isEvidenceStageActive ? 'xl:grid-cols-2' : ''}`}>
                {isProgressStageActive ? (
                <div className="rounded-xl border border-surface-border bg-surface-card p-4">
                  <p className="text-sm font-bold text-ink-primary">Technician Progress Entry</p>
                  <p className="text-xs text-ink-muted mt-1">
                    Only the assigned technician can append workshop progress.
                  </p>
                  <div className="mt-3 rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Execution status</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <StatusBadge status={activeJobOrder?.status} />
                          <span className="text-sm text-ink-secondary">
                            {activeJobOrder?.status === 'assigned'
                              ? 'Start work first before QA handoff can unlock.'
                              : activeJobOrder?.status === 'in_progress'
                                ? 'When work and evidence are complete, send this job order to QA.'
                                : activeJobOrder?.status === 'blocked'
                                  ? 'Resume workshop work before QA can continue.'
                                  : 'Use the next valid status action below.'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {nextStatuses.map((status) => (
                          <button
                            key={`progress-inline-${status}`}
                            type="button"
                            onClick={() => handleStatusUpdate(status)}
                            disabled={!activeJobOrder || statusState.status === 'status_update_submitting'}
                            className={status === 'ready_for_qa' ? 'ops-action-primary' : 'ops-action-secondary'}
                          >
                            {WORKSHOP_STATUS_ACTION_LABELS[status] ?? `Mark as ${formatStatusLabel(status)}`}
                          </button>
                        ))}
                      </div>
                    </div>
                    {activeJobOrder?.status === 'assigned' && (hasProgressEntries || hasPhotoEvidence || activeJobOrder?.completedItemCount > 0) ? (
                      <div className="mt-3 rounded-lg border border-brand-orange/25 bg-brand-orange/10 px-3 py-2 text-[11px] leading-5 text-amber-100">
                        This job order already has workshop activity, but the status is still <span className="font-semibold">Assigned</span>. Use <span className="font-semibold">Start work</span> first, then use <span className="font-semibold">Send to QA</span>.
                      </div>
                    ) : null}
                    {statusState.message ? <div className={`mt-3 ${statusStateClassName}`}>{statusState.message}</div> : null}
                  </div>
                  <div className="grid md:grid-cols-2 gap-3 mt-3">
                    <label className="text-xs text-ink-muted">
                      Entry type
                      <select
                        value={progressDraft.entryType}
                        onChange={(event) =>
                          setProgressDraft((current) => ({
                            ...current,
                            entryType: event.target.value,
                          }))
                        }
                        className="mt-1 select"
                      >
                        {progressEntryTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="text-xs text-ink-muted md:col-span-2">
                      Completed work items
                      <div className="mt-1 rounded-lg border border-surface-border bg-surface-raised p-3">
                        {activeJobOrder?.items?.length ? (
                          <div className="grid gap-2">
                            {activeJobOrder.items.map((item) => {
                              const checked = progressDraft.completedItemIds.includes(item.id)

                              return (
                                <label
                                  key={item.id}
                                  className="flex items-start gap-3 rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-ink-primary"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(event) =>
                                      setProgressDraft((current) => ({
                                        ...current,
                                        completedItemIds: event.target.checked
                                          ? [...current.completedItemIds, item.id]
                                          : current.completedItemIds.filter((entry) => entry !== item.id),
                                      }))
                                    }
                                    className="mt-0.5"
                                  />
                                  <span className="min-w-0">
                                    <span className="block font-semibold">{item.name}</span>
                                    <span className="mt-1 block text-[11px] text-ink-muted">
                                      {item.description || `Item ID ${item.id.slice(0, 8).toUpperCase()}`}
                                    </span>
                                  </span>
                                </label>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-[11px] text-ink-muted">
                            Load a job order with work items first, then mark completed items from this checklist.
                          </p>
                        )}
                      </div>
                    </div>
                    <label className="text-xs text-ink-muted md:col-span-2">
                      Progress message
                      <textarea
                        value={progressDraft.message}
                        onChange={(event) =>
                          setProgressDraft((current) => ({
                            ...current,
                            message: event.target.value,
                          }))
                        }
                        rows={3}
                        className="mt-1 textarea"
                        placeholder="Describe the work performed or issue found."
                      />
                    </label>
                  </div>
                  {progressState.message ? <div className={`mt-3 ${progressStateClassName}`}>{progressState.message}</div> : null}
                  <button
                    onClick={handleAddProgressEntry}
                    disabled={!activeJobOrder || progressState.status === 'progress_submitting'}
                    className="ops-action-primary mt-3"
                  >
                    {progressState.status === 'progress_submitting' ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Wrench size={14} />
                    )}
                    Save Progress Entry - technician/head tech
                  </button>
                </div>
                ) : null}

                {isEvidenceStageActive ? (
                <div className="rounded-xl border border-surface-border bg-surface-card p-4">
                  <p className="text-sm font-bold text-ink-primary">Evidence</p>
                  <p className="text-xs text-ink-muted mt-1">
                    Upload images directly from a phone camera or desktop file picker so the next reviewer sees stored evidence instead of pasted links.
                  </p>
                  <div className="grid md:grid-cols-2 gap-3 mt-3">
                    <label className="text-xs text-ink-muted">
                      Image file
                      <input
                        key={`technician-photo-${photoInputResetKey}`}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(event) =>
                          setPhotoDraft((current) => ({
                            ...current,
                            file: event.target.files?.[0] ?? null,
                          }))
                        }
                        className="mt-1 block w-full text-sm text-ink-primary file:mr-3 file:rounded-lg file:border-0 file:bg-surface-raised file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ink-primary"
                      />
                    </label>
                    <label className="text-xs text-ink-muted">
                      Evidence target
                      {selectedCompletedItemsMissingPhotoEvidence.length > 0 ? (
                        <div className="mt-2 rounded-lg border border-brand-orange/25 bg-brand-orange/10 px-3 py-2 text-[11px] leading-5 text-amber-100">
                          {selectedCompletedItemsMissingPhotoEvidence.length === 1 ? (
                            <>
                              To save this completed item, attach the photo to{' '}
                              <span className="font-semibold">{recommendedPhotoTargetOption?.label}</span>.
                            </>
                          ) : (
                            <>
                              Completed items still need work-item evidence. Start with{' '}
                              <span className="font-semibold">{recommendedPhotoTargetOption?.label}</span>, then upload the rest.
                            </>
                          )}
                          {!isPhotoTargetRecommended ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPhotoDraft((current) => ({
                                  ...current,
                                  linkedEntityType: recommendedPhotoTargetOption?.linkedEntityType ?? current.linkedEntityType,
                                  linkedEntityId: recommendedPhotoTargetOption?.linkedEntityId ?? current.linkedEntityId,
                                }))
                              }
                              className="ml-2 inline-flex rounded-md border border-brand-orange/30 px-2 py-1 text-[10px] font-semibold text-amber-50 transition hover:bg-brand-orange/15"
                            >
                              Use recommended target
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                      <select
                        value={`${photoDraft.linkedEntityType}:${photoDraft.linkedEntityId || ''}`}
                        onChange={(event) => {
                          const [linkedEntityType, ...rest] = event.target.value.split(':')
                          const linkedEntityId = rest.join(':')
                          setPhotoDraft((current) => ({
                            ...current,
                            linkedEntityType,
                            linkedEntityId,
                          }))
                        }}
                        className="mt-1 select"
                      >
                        <optgroup label="General">
                          {photoTargetOptions
                            .filter((option) => option.group === 'general')
                            .map((option) => (
                              <option
                                key={option.key}
                                value={`${option.linkedEntityType}:${option.linkedEntityId || ''}`}
                              >
                                {option.label}
                              </option>
                            ))}
                        </optgroup>
                        {workItemPhotoTargetOptions.length > 0 ? (
                          <optgroup label="Work items">
                            {workItemPhotoTargetOptions.map((option) => (
                              <option
                                key={option.key}
                                value={`${option.linkedEntityType}:${option.linkedEntityId || ''}`}
                              >
                                {option.label}
                              </option>
                            ))}
                          </optgroup>
                        ) : null}
                        {progressPhotoTargetOptions.length > 0 ? (
                          <optgroup label="Progress logs">
                            {progressPhotoTargetOptions.map((option) => (
                              <option
                                key={option.key}
                                value={`${option.linkedEntityType}:${option.linkedEntityId || ''}`}
                              >
                                {option.label}
                              </option>
                            ))}
                          </optgroup>
                        ) : null}
                      </select>
                      <span className="mt-1 block text-[11px] text-ink-muted">
                        Use <span className="font-semibold">Work items</span> when the progress step says a completed item still needs proof. Use <span className="font-semibold">General</span> only for broad job photos.
                      </span>
                    </label>
                    <label className="text-xs text-ink-muted md:col-span-2">
                      Selected file
                      <input
                        value={photoDraft.file?.name ?? ''}
                        readOnly
                        className="mt-1 input"
                        placeholder="No image selected yet"
                      />
                    </label>
                    <label className="text-xs text-ink-muted md:col-span-2">
                      Caption
                      <textarea
                        value={photoDraft.caption}
                        onChange={(event) =>
                          setPhotoDraft((current) => ({
                            ...current,
                            caption: event.target.value,
                          }))
                        }
                        rows={3}
                        className="mt-1 textarea"
                        placeholder="What this image proves for the next reviewer."
                      />
                    </label>
                  </div>
                  {photoState.message ? <div className={`mt-3 ${photoStateClassName}`}>{photoState.message}</div> : null}
                  <button
                    onClick={handleAddPhotoEvidence}
                    disabled={!activeJobOrder || photoState.status === 'photo_submitting'}
                    className="ops-action-primary mt-3"
                  >
                    {photoState.status === 'photo_submitting' ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <FileStack size={14} />
                    )}
                    Upload Photo Evidence - workshop
                  </button>
                </div>
                ) : null}
              </div>
            </div>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="space-y-5">
          {isAssignmentsStageActive ? (
          <div id="job-order-stage-assignments" className="ops-panel scroll-mt-48">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="card-title">Assignments</p>
                  <span className="badge badge-blue">Service adviser / admin</span>
                </div>
                <p className="text-xs text-ink-muted mt-1">
                  Assign the selected job order or create one from the handoff queue.
                </p>
              </div>
              <span
                className={`badge ${
                  staffDirectoryState.status === 'error' ? 'badge-red' : 'badge-green'
                }`}
              >
                {staffDirectoryState.status === 'loading'
                  ? 'Loading technicians'
                  : `${technicianOptions.length} technician option${
                      technicianOptions.length === 1 ? '' : 's'
                    }`}
              </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] mt-4">
              <div className="rounded-xl border border-surface-border bg-surface-card p-4">
                <p className="text-sm font-bold text-ink-primary">Selected Job Order Team</p>
                <p className="text-xs text-ink-muted mt-1">
                  Save technician coverage for the selected job order before pushing the work forward.
                </p>
                {activeJobOrder ? (
                  <div className="mt-3 space-y-3">
                    <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                        Current assignment
                      </p>
                      <p className="text-sm text-ink-primary mt-1">
                        {activeJobOrder.assignedTechnicianIds.length > 0
                          ? `${activeJobOrder.assignedTechnicianIds.length} technician${activeJobOrder.assignedTechnicianIds.length === 1 ? '' : 's'} assigned`
                          : 'No technician assigned'}
                      </p>
                      <p className="text-xs text-ink-muted mt-2">
                        Draft job orders may stay unassigned. Assigned and operational job orders require at least one saved technician.
                      </p>
                    </div>
                    {canManageAssignments ? (
                      <>
                        <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                          {technicianOptions.length > 0 ? (
                            technicianOptions.map((account) => {
                              const checked = assignmentDraftIds.includes(account.id)

                              return (
                                <label
                                  key={account.id}
                                  className="flex items-start gap-3 rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(event) =>
                                      handleAssignmentToggle(account.id, event.target.checked)
                                    }
                                    className="mt-1"
                                  />
                                  <span className="min-w-0">
                                    <span className="block font-semibold">
                                      {account.displayName || account.email}
                                    </span>
                                    <span className="block text-xs text-ink-muted mt-1">
                                      {account.roleLabel}
                                      {account.staffCode ? ` - ${account.staffCode}` : ''}
                                    </span>
                                  </span>
                                </label>
                              )
                            })
                          ) : (
                            <div className="rounded-lg border border-surface-border bg-surface-raised px-3 py-3 text-xs text-ink-muted">
                              No active technician accounts are available in the staff directory yet.
                            </div>
                          )}
                        </div>
                        {assignmentState.message ? <div className={assignmentStateClassName}>{assignmentState.message}</div> : null}
                        <button
                          type="button"
                          onClick={handleSaveAssignments}
                          disabled={!activeJobOrder || assignmentState.status === 'assignment_submitting'}
                          className="ops-action-primary"
                        >
                          {assignmentState.status === 'assignment_submitting' ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <ShieldCheck size={14} />
                          )}
                          Save Assignments - adviser/admin
                        </button>
                      </>
                    ) : null}
                  </div>
                ) : (
                  <div className="empty-panel mt-3">
                    <p className="text-sm font-semibold text-ink-primary">Load a job order first</p>
                    <p className="mt-2 text-sm leading-6 text-ink-secondary">
                      Choose an existing job order from the queue before editing assignments.
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-surface-border bg-surface-card p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-ink-primary">Booking Handoff Sources</p>
                    <p className="text-xs text-ink-muted mt-1">
                      Select a confirmed booking when you need to create another job order in the live queue.
                    </p>
                  </div>
                  <span className="badge badge-gray">{formatDate(selectedDate)}</span>
                </div>

                {handoffState.message ? (
                  <div className={`mt-4 ${handoffStateClassName}`}>{handoffState.message}</div>
                ) : null}

                <div className="space-y-3 mt-4">
                  {handoffCandidates.length === 0 ? (
                    <div className="empty-panel">
                      <p className="text-sm font-semibold text-ink-primary">No confirmed handoffs for this date</p>
                      <p className="mt-2 text-sm leading-6 text-ink-secondary">
                        Booking handoff remains schedule-derived. Only confirmed bookings can move into job-order creation.
                      </p>
                    </div>
                  ) : (
                    handoffCandidates.map((candidate) => {
                      const isSelected = candidate.bookingId === selectedBookingId
                      return (
                        <button
                          key={candidate.bookingId}
                          onClick={() => setSelectedBookingId(candidate.bookingId)}
                          className={`w-full text-left rounded-xl border px-4 py-4 transition ${
                            isSelected
                              ? 'border-brand-orange/45 bg-brand-orange/10'
                              : 'border-surface-border bg-surface-raised hover:border-brand-orange/35'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-mono text-xs font-bold tracking-wide text-brand-orange">
                                BK-{candidate.bookingId.slice(0, 8).toUpperCase()}
                              </p>
                              <p className="text-sm font-semibold text-ink-primary mt-1">
                                {candidate.serviceSummary}
                              </p>
                              <p className="text-xs text-ink-muted mt-2">{candidate.customerLabel}</p>
                              <p className="text-xs text-ink-muted mt-1">{candidate.vehicleLabel}</p>
                            </div>
                            <span className="badge badge-green">Confirmed source</span>
                          </div>
                          <p className="text-[11px] text-ink-muted mt-3">
                            {formatDate(candidate.scheduledDate)} | {candidate.timeSlotLabel}
                          </p>
                        </button>
                      )
                    })
                  )}
                </div>

                <div className="ops-panel-muted mt-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Workflow rule</p>
                  <p className="text-sm text-ink-primary mt-1">
                    Pending, cancelled, and completed bookings are hidden from handoff creation.
                  </p>
                  <p className="text-xs text-ink-muted mt-2">
                    Confirm the booking on the schedule page first, then refresh this workbench.
                  </p>
                </div>

                {!selectedCandidate ? (
                  <div className="empty-panel mt-4">
                    <AlertTriangle size={28} className="mx-auto text-ink-dim mb-3" />
                    <p className="text-sm font-semibold text-ink-primary">Select a confirmed or workshop-handoff booking first</p>
                    <p className="mt-2 text-sm leading-6 text-ink-secondary">
                      The workbench creates job orders from confirmed bookings and bookings already moved into workshop handoff.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 mt-4">
                    <div>
                      <p className="text-sm font-bold text-ink-primary">Create / Load Job Order</p>
                      <p className="text-xs text-ink-muted mt-1">
                        Convert the selected confirmed booking into a new job order without leaving the execution workspace.
                      </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                          Source Booking
                        </p>
                        <p className="text-sm text-ink-primary mt-1">
                          BK-{selectedCandidate.bookingId.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-xs text-ink-muted mt-2">{selectedCandidate.customerLabel}</p>
                      </div>
                      <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                          Adviser Snapshot
                        </p>
                        <p className="text-sm text-ink-primary mt-1">
                          {user?.staffCode ?? 'Missing staff code'}
                        </p>
                        <p className="text-xs text-ink-muted mt-2">
                          This identifies who prepared the job order.
                        </p>
                      </div>
                    </div>

                    <label className="text-xs text-ink-muted block">
                      Work items
                      <div className="space-y-3 mt-2">
                        {createDraft.items.map((item, index) => (
                          <div
                            key={`${item.name}-${index}`}
                            className="rounded-xl border border-surface-border bg-surface-raised p-3"
                          >
                            <div className="grid md:grid-cols-[minmax(0,1fr)_120px] gap-3">
                              <input
                                value={item.name}
                                onChange={(event) =>
                                  handleCreateItemChange(index, { name: event.target.value })
                                }
                                className="input"
                                placeholder="Work item name"
                              />
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={item.estimatedHours ?? ''}
                                onChange={(event) =>
                                  handleCreateItemChange(index, {
                                    estimatedHours:
                                      event.target.value === ''
                                        ? undefined
                                        : Math.max(1, Math.ceil(Number(event.target.value))),
                                  })
                                }
                                className="input"
                                placeholder="Whole hours"
                              />
                            </div>
                            <textarea
                              value={item.description ?? ''}
                              onChange={(event) =>
                                handleCreateItemChange(index, { description: event.target.value })
                              }
                              rows={2}
                              className="mt-3 textarea"
                              placeholder="Optional work-item description"
                            />
                          </div>
                        ))}
                      </div>
                    </label>

                    <label className="text-xs text-ink-muted block">
                      Assigned technician
                      <select
                        value={createDraft.assignedTechnicianId}
                        onChange={(event) =>
                          setCreateDraft((current) => ({
                            ...current,
                            assignedTechnicianId: event.target.value,
                          }))
                        }
                        className="mt-1 select"
                      >
                        <option value="">Create as draft - assign later</option>
                        {technicianOptions.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.displayName || account.email} - {account.roleLabel}
                            {account.staffCode ? ` (${account.staffCode})` : ''}
                          </option>
                        ))}
                      </select>
                      <span className="block text-[11px] text-ink-muted mt-1">
                        Leaving this blank creates a draft job order instead of sending an invalid technician ID.
                      </span>
                      {staffDirectoryState.message ? (
                        <span className="block text-[11px] text-ink-muted mt-1">
                          {staffDirectoryState.message}
                        </span>
                      ) : null}
                    </label>

                    <label className="text-xs text-ink-muted block">
                      Job-order notes
                      <textarea
                        value={createDraft.notes}
                        onChange={(event) =>
                          setCreateDraft((current) => ({
                            ...current,
                            notes: event.target.value,
                          }))
                        }
                        rows={3}
                        className="mt-1 textarea"
                        placeholder="Add workshop notes carried into the job order."
                      />
                    </label>

                    {createState.message ? <div className={createStateClassName}>{createState.message}</div> : null}

                    <button
                      onClick={handleCreateJobOrder}
                      disabled={createState.status === 'create_submitting'}
                      className="ops-action-primary"
                    >
                      {createState.status === 'create_submitting' ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <ClipboardList size={14} />
                      )}
                      Create Job Order - adviser/admin
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          ) : null}

          {isProgressStageActive ? (
          <div id="job-order-stage-progress" className="ops-panel scroll-mt-48">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="card-title">Progress Updates</p>
                  <span className="badge badge-green">Technician / head tech</span>
                </div>
                <p className="text-xs text-ink-muted mt-1">
                  Keep the workshop trail current with technician notes and completion updates for the selected job order.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="badge badge-gray">Progress: technician-owned</span>
                {role === 'super_admin' ? <span className="badge badge-green">Super admin override access</span> : null}
              </div>
            </div>

            <ExecutionStatusPanel
              activeJobOrder={activeJobOrder}
              nextStatuses={nextStatuses}
              hasProgressEntries={hasProgressEntries}
              hasPhotoEvidence={hasPhotoEvidence}
              completedItemCount={activeJobOrder?.completedItemCount ?? 0}
              isReadyForQaChecklistSatisfied={isReadyForQaChecklistSatisfied}
              statusDraft={statusDraft}
              setStatusDraft={setStatusDraft}
              handleStatusUpdate={handleStatusUpdate}
              statusState={statusState}
              statusStateClassName={statusStateClassName}
              ownerLabel="Service adviser / admin"
            />

            <div className="rounded-xl border border-surface-border bg-surface-card p-4 mt-4">
              <p className="text-sm font-bold text-ink-primary">Technician Progress Entry</p>
              <p className="text-xs text-ink-muted mt-1">
                Assigned technicians own workshop progress, and super admins can append or correct entries when needed.
              </p>
              <div className="grid md:grid-cols-2 gap-3 mt-3">
                <label className="text-xs text-ink-muted">
                  Entry type
                  <select
                    value={progressDraft.entryType}
                    onChange={(event) =>
                      setProgressDraft((current) => ({
                        ...current,
                        entryType: event.target.value,
                      }))
                    }
                    className="mt-1 select"
                  >
                    {progressEntryTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="text-xs text-ink-muted md:col-span-2">
                  Completed work items
                  <div className="mt-1 rounded-lg border border-surface-border bg-surface-raised p-3">
                    {activeJobOrder?.items?.length ? (
                      <div className="grid gap-2">
                        {activeJobOrder.items.map((item) => {
                          const checked = progressDraft.completedItemIds.includes(item.id)

                          return (
                            <label
                              key={item.id}
                              className="flex items-start gap-3 rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-ink-primary"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) =>
                                  setProgressDraft((current) => ({
                                    ...current,
                                    completedItemIds: event.target.checked
                                      ? [...current.completedItemIds, item.id]
                                      : current.completedItemIds.filter((entry) => entry !== item.id),
                                  }))
                                }
                                className="mt-0.5"
                              />
                              <span className="min-w-0">
                                <span className="block font-semibold">{item.name}</span>
                                <span className="mt-1 block text-[11px] text-ink-muted">
                                  {item.description || `Item ID ${item.id.slice(0, 8).toUpperCase()}`}
                                </span>
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-ink-muted">
                        Load a job order with work items first, then mark completed items from this checklist.
                      </p>
                    )}
                  </div>
                  {progressDraft.completedItemIds.length > 0 ? (
                    <div className="mt-2 rounded-lg border border-surface-border bg-surface-card px-3 py-2">
                      {selectedCompletedItemsMissingPhotoEvidence.length > 0 ? (
                        <p className="text-[11px] leading-5 text-amber-200">
                          Work-item photo evidence is still required before save for:{' '}
                          <span className="font-semibold">
                            {selectedCompletedItemsMissingPhotoEvidence.map((item) => item.name).join(', ')}
                          </span>
                          . Go to <span className="font-semibold">Evidence</span> and upload a photo with the matching work-item target.
                        </p>
                      ) : (
                        <p className="text-[11px] leading-5 text-emerald-200">
                          Selected completed items already have the required work-item evidence or do not require a proof photo.
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
                <label className="text-xs text-ink-muted md:col-span-2">
                  Progress message
                  <textarea
                    value={progressDraft.message}
                    onChange={(event) =>
                      setProgressDraft((current) => ({
                        ...current,
                        message: event.target.value,
                      }))
                    }
                    rows={3}
                    className="mt-1 textarea"
                    placeholder="Describe the work performed or issue found."
                  />
                </label>
              </div>
              {progressState.message ? <div className={`mt-3 ${progressStateClassName}`}>{progressState.message}</div> : null}
              <button
                onClick={handleAddProgressEntry}
                disabled={!activeJobOrder || progressState.status === 'progress_submitting'}
                className="ops-action-primary mt-3"
              >
                {progressState.status === 'progress_submitting' ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Wrench size={14} />
                )}
                Save Progress Entry - workshop
              </button>
            </div>
          </div>
          ) : null}

          {isEvidenceStageActive ? (
          <div id="job-order-stage-evidence" className="ops-panel scroll-mt-48">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="card-title">Evidence</p>
                  <span className="badge badge-green">Technician / head tech</span>
                </div>
                <p className="text-xs text-ink-muted mt-1">
                  Upload images directly from camera or desktop so QA and finalization reviewers can inspect stored evidence.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {role === 'super_admin' ? <span className="badge badge-green">Super admin override access</span> : null}
                <span className="badge badge-gray">Evidence: technician/adviser/admin</span>
              </div>
            </div>

            <div className="rounded-xl border border-surface-border bg-surface-card p-4 mt-4">
              <p className="text-sm font-bold text-ink-primary">Photo Evidence</p>
              <div className="grid md:grid-cols-2 gap-3 mt-3">
                <label className="text-xs text-ink-muted">
                  Image file
                  <input
                    key={`adviser-photo-${photoInputResetKey}`}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(event) =>
                      setPhotoDraft((current) => ({
                        ...current,
                        file: event.target.files?.[0] ?? null,
                      }))
                    }
                    className="mt-1 block w-full text-sm text-ink-primary file:mr-3 file:rounded-lg file:border-0 file:bg-surface-raised file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ink-primary"
                  />
                </label>
                <label className="text-xs text-ink-muted">
                  Evidence target
                  {selectedCompletedItemsMissingPhotoEvidence.length > 0 ? (
                    <div className="mt-2 rounded-lg border border-brand-orange/25 bg-brand-orange/10 px-3 py-2 text-[11px] leading-5 text-amber-100">
                      {selectedCompletedItemsMissingPhotoEvidence.length === 1 ? (
                        <>
                          To save this completed item, attach the photo to{' '}
                          <span className="font-semibold">{recommendedPhotoTargetOption?.label}</span>.
                        </>
                      ) : (
                        <>
                          Completed items still need work-item evidence. Start with{' '}
                          <span className="font-semibold">{recommendedPhotoTargetOption?.label}</span>, then upload the rest.
                        </>
                      )}
                      {!isPhotoTargetRecommended ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPhotoDraft((current) => ({
                              ...current,
                              linkedEntityType: recommendedPhotoTargetOption?.linkedEntityType ?? current.linkedEntityType,
                              linkedEntityId: recommendedPhotoTargetOption?.linkedEntityId ?? current.linkedEntityId,
                            }))
                          }
                          className="ml-2 inline-flex rounded-md border border-brand-orange/30 px-2 py-1 text-[10px] font-semibold text-amber-50 transition hover:bg-brand-orange/15"
                        >
                          Use recommended target
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  <select
                    value={`${photoDraft.linkedEntityType}:${photoDraft.linkedEntityId || ''}`}
                    onChange={(event) => {
                      const [linkedEntityType, ...rest] = event.target.value.split(':')
                      const linkedEntityId = rest.join(':')
                      setPhotoDraft((current) => ({
                        ...current,
                        linkedEntityType,
                        linkedEntityId,
                      }))
                    }}
                    className="mt-1 select"
                  >
                    <optgroup label="General">
                      {photoTargetOptions
                        .filter((option) => option.group === 'general')
                        .map((option) => (
                          <option
                            key={option.key}
                            value={`${option.linkedEntityType}:${option.linkedEntityId || ''}`}
                          >
                            {option.label}
                          </option>
                        ))}
                    </optgroup>
                    {workItemPhotoTargetOptions.length > 0 ? (
                      <optgroup label="Work items">
                        {workItemPhotoTargetOptions.map((option) => (
                          <option
                            key={option.key}
                            value={`${option.linkedEntityType}:${option.linkedEntityId || ''}`}
                          >
                            {option.label}
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                    {progressPhotoTargetOptions.length > 0 ? (
                      <optgroup label="Progress logs">
                        {progressPhotoTargetOptions.map((option) => (
                          <option
                            key={option.key}
                            value={`${option.linkedEntityType}:${option.linkedEntityId || ''}`}
                          >
                            {option.label}
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                  </select>
                  <span className="mt-1 block text-[11px] text-ink-muted">
                    Use <span className="font-semibold">Work items</span> when the progress step says a completed item still needs proof. Use <span className="font-semibold">General</span> only for broad job photos.
                  </span>
                </label>
                <label className="text-xs text-ink-muted md:col-span-2">
                  Selected file
                  <input
                    value={photoDraft.file?.name ?? ''}
                    readOnly
                    className="mt-1 input"
                    placeholder="No image selected yet"
                  />
                </label>
                <label className="text-xs text-ink-muted md:col-span-2">
                  Caption
                  <textarea
                    value={photoDraft.caption}
                    onChange={(event) =>
                      setPhotoDraft((current) => ({
                        ...current,
                        caption: event.target.value,
                      }))
                    }
                    rows={3}
                    className="mt-1 textarea"
                    placeholder="What this image proves for the next reviewer."
                  />
                </label>
              </div>
              {photoState.message ? <div className={`mt-3 ${photoStateClassName}`}>{photoState.message}</div> : null}
              <button
                onClick={handleAddPhotoEvidence}
                disabled={!activeJobOrder || photoState.status === 'photo_submitting'}
                className="ops-action-primary mt-3"
              >
                {photoState.status === 'photo_submitting' ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <FileStack size={14} />
                )}
                Upload Photo Evidence - workshop
              </button>
            </div>
          </div>
          ) : null}

          {isFinalizeStageActive ? (
          <div id="job-order-stage-finalize" className="ops-panel scroll-mt-48">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="card-title">Finalize</p>
                  <span className="badge badge-blue">Service adviser / admin</span>
                </div>
                <p className="text-xs text-ink-muted mt-1">
                  Finalization, payment capture, and invoice export stay on one screen so advisers can see readiness blockers before they commit the release record.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="badge badge-gray">Head-technician pass required</span>
                <span className="badge badge-gray">Adviser/admin only</span>
              </div>
            </div>

            <div className="grid xl:grid-cols-2 gap-4 mt-4">
              <div className="rounded-xl border border-surface-border bg-surface-card p-4">
                <p className="text-sm font-bold text-ink-primary">Finalize Invoice-Ready Work</p>
                <p className="text-xs text-ink-muted mt-1">
                  The backend will reject this action unless pre-check review, work completion, and payment prerequisites are all satisfied.
                </p>
                <label className="text-xs text-ink-muted block mt-3">
                  Finalization summary
                  <textarea
                    value={finalizeDraft.summary}
                    onChange={(event) =>
                      setFinalizeDraft((current) => ({
                        ...current,
                        summary: event.target.value,
                      }))
                    }
                    rows={4}
                    className="mt-1 textarea"
                    placeholder="Describe completed work for the invoice-ready record."
                  />
                </label>
                {!finalizationSuggestedSummary ? (
                  <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
                    No work notes found - please describe completed work before finalizing.
                  </div>
                ) : null}
                <div className="grid md:grid-cols-2 gap-3 mt-3">
                  <label className="text-xs text-ink-muted">
                    Amount received (PHP)
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={paymentDraft.amountPaid}
                      onChange={(event) =>
                        setPaymentDraft((current) => ({
                          ...current,
                          amountPaid: event.target.value,
                        }))
                      }
                      className="mt-1 input"
                      placeholder="2500"
                    />
                  </label>
                  <label className="text-xs text-ink-muted">
                    Payment method
                    <select
                      value={paymentDraft.paymentMethod}
                      onChange={(event) =>
                        setPaymentDraft((current) => ({
                          ...current,
                          paymentMethod: event.target.value,
                        }))
                      }
                      className="mt-1 select"
                    >
                      {paymentMethodOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-ink-muted">
                    Payment reference
                    <input
                      value={paymentDraft.reference}
                      onChange={(event) =>
                        setPaymentDraft((current) => ({
                          ...current,
                          reference: event.target.value,
                        }))
                      }
                      className="mt-1 input"
                      placeholder="GCASH-TEST-1234"
                    />
                  </label>
                  <label className="text-xs text-ink-muted">
                    Received at
                    <input
                      type="datetime-local"
                      value={paymentDraft.receivedAt}
                      onChange={(event) =>
                        setPaymentDraft((current) => ({
                          ...current,
                          receivedAt: event.target.value,
                        }))
                      }
                      className="mt-1 input"
                    />
                  </label>
                </div>
                {finalizationBlockers.length > 0 ? (
                  <div className="status-message status-message-danger mt-3">
                    <p className="font-semibold text-red-100">Finalization blockers</p>
                    <ul className="mt-2 space-y-1 list-disc pl-4">
                      {finalizationBlockers.map((blocker) => (
                        <li key={blocker}>{blocker}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {finalizeState.message ? <div className={`mt-3 ${finalizeStateClassName}`}>{finalizeState.message}</div> : null}
                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    onClick={handleFinalizeJobOrder}
                    disabled={
                      !activeJobOrder ||
                      !canFinalizeOrPay ||
                      Boolean(activeJobOrder.invoiceRecord) ||
                      finalizeState.status === 'finalize_submitting' ||
                      activeJobOrder.finalizationReadiness?.canFinalize === false
                    }
                    className="ops-action-primary"
                  >
                    {finalizeState.status === 'finalize_submitting' ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    {activeJobOrder?.invoiceRecord ? 'Invoice Already Generated' : 'Finalize Invoice-Ready Work - adviser/admin'}
                  </button>
                  <button
                    type="button"
                    onClick={handleRecordInvoicePayment}
                    disabled={
                      !activeJobOrder?.invoiceRecord ||
                      activeJobOrder.invoiceRecord.paymentStatus === 'paid' ||
                      paymentState.status === 'payment_submitting'
                    }
                    className="ops-action-secondary"
                  >
                    {paymentState.status === 'payment_submitting' ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <ShieldCheck size={14} />
                    )}
                    Record Manual Payment - adviser/admin
                  </button>
                  <button
                    type="button"
                    onClick={handleStartInvoicePaymongoCheckout}
                    disabled={!activeJobOrder?.invoiceRecord || paymentState.status === 'payment_submitting'}
                    className="ops-action-secondary"
                  >
                    <FileStack size={14} />
                    Start PayMongo Checkout - adviser/admin
                  </button>
                  <button
                    type="button"
                    onClick={handleRefreshInvoicePaymongoCheckout}
                    disabled={
                      !activeJobOrder?.invoiceRecord?.onlinePaymentSessionId ||
                      paymentState.status === 'payment_submitting'
                    }
                    className="ops-action-secondary"
                  >
                    <RefreshCw size={14} />
                    Refresh PayMongo Status - adviser/admin
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-surface-border bg-surface-card p-4">
                <p className="text-sm font-bold text-ink-primary">Invoice Record & Export</p>
                <p className="text-xs text-ink-muted mt-1">
                  Once finalization succeeds, this panel becomes the source of truth for OR/reference, totals, payment state, and printable invoice output.
                </p>
                <div className="grid md:grid-cols-2 gap-3 mt-3">
                  <div className="rounded-lg border border-surface-border bg-surface-raised px-3 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Invoice reference</p>
                    <p className="mt-2 text-sm text-ink-primary">
                      {activeJobOrder?.invoiceRecord?.invoiceReference ?? 'Generated after finalization'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-surface-border bg-surface-raised px-3 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Official receipt</p>
                    <p className="mt-2 text-sm text-ink-primary">
                      {activeJobOrder?.invoiceRecord?.officialReceiptReference ?? 'Generated automatically'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-surface-border bg-surface-raised px-3 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Reservation fee deduction</p>
                    <p className="mt-2 text-sm text-ink-primary">
                      {formatPesoAmount(activeJobOrder?.invoiceRecord?.reservationFeeDeductionCents ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-surface-border bg-surface-raised px-3 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Total amount</p>
                    <p className="mt-2 text-sm text-ink-primary">
                      {formatPesoAmount(activeJobOrder?.invoiceRecord?.totalAmountCents ?? 0)}
                    </p>
                  </div>
                    <div className="rounded-lg border border-surface-border bg-surface-raised px-3 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Payment status</p>
                      <p className="mt-2 text-sm text-ink-primary">
                        {activeJobOrder?.invoiceRecord ? formatStatusLabel(activeJobOrder.invoiceRecord.paymentStatus) : 'Awaiting finalization'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-surface-border bg-surface-raised px-3 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Settlement channel</p>
                      <p className="mt-2 text-sm text-ink-primary">
                        {activeJobOrder?.invoiceRecord?.paymentChannel === 'online_provider'
                          ? 'PayMongo hosted checkout'
                          : activeJobOrder?.invoiceRecord?.paymentChannel === 'manual'
                            ? 'Manual settlement'
                            : 'Not selected yet'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-surface-border bg-surface-raised px-3 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Online payment state</p>
                      <p className="mt-2 text-sm text-ink-primary">
                        {activeJobOrder?.invoiceRecord?.onlinePaymentStatus
                          ? formatStatusLabel(activeJobOrder.invoiceRecord.onlinePaymentStatus)
                          : 'No online checkout yet'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-surface-border bg-surface-raised px-3 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Email delivery</p>
                      <p className="mt-2 text-sm text-ink-primary">
                        {activeJobOrder?.invoiceRecord?.pdfEmailSentAt
                          ? `Sent ${formatDateTime(activeJobOrder.invoiceRecord.pdfEmailSentAt)}`
                        : activeJobOrder?.invoiceRecord?.pdfEmailError
                          ? 'Delivery retry needed'
                          : 'Will send after PDF generation'}
                    </p>
                  </div>
                </div>
                {paymentState.message ? <div className={`mt-3 ${paymentStateClassName}`}>{paymentState.message}</div> : null}
                {activeJobOrder?.invoiceRecord?.onlinePaymentFailureReason ? (
                  <div className="status-message status-message-danger mt-3">
                    {activeJobOrder.invoiceRecord.onlinePaymentFailureReason}
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleExportInvoice}
                    disabled={!activeJobOrder?.invoiceRecord}
                    className="ops-action-primary"
                  >
                    <FileStack size={14} />
                    Export Invoice PDF - adviser/admin
                  </button>
                </div>
              </div>
            </div>
          </div>
          ) : null}
        </section>
      )}
      </section>
    </div>
  )
}
