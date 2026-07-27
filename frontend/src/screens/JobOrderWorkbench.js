'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CirclePlay,
  ClipboardList,
  FileStack,
  ListChecks,
  MessageSquareText,
  MoreHorizontal,
  PanelRightOpen,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'

import { getDailySchedule } from '@/lib/bookingStaffClient'
import { ApiError, listTechnicianProfiles } from '@/lib/authClient'
import { useUser } from '@/lib/userContext'
import {
  formatServiceItemName,
  getServiceItemState,
} from '@/lib/jobOrderServiceProgressModel.mjs'
import {
  claimMatchesWork,
  getJobOrderClaimConflictMessage,
  isStaffWorkClaimError,
  recoverMatchingJobOrderClaim,
  toJobOrderClaimSummary,
} from '@/lib/jobOrderClaimState.mjs'
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
  exportTechnicianChecklistPdf,
  finalizeJobOrder,
  getJobOrderById,
  listJobOrderWorkbenchCalendar,
  listJobOrderWorkbenchSummaries,
  recordJobOrderInvoicePayment,
  reconcileJobOrderInvoicePaymongoCheckout,
  replaceJobOrderAssignments,
  startJobOrderInvoicePaymongoCheckout,
  updateJobOrderWorkshopStage,
  updateJobOrderStatus,
} from '@/lib/jobOrderWorkbenchClient'
import {
  claimStaffWork,
  listStaffWorkQueue,
} from '@/lib/staffWorkQueueClient'
import { getJobOrderQualityGate } from '@/lib/qualityGateClient'
import {
  getSuggestedJobOrderWorkspaceStage,
  isQaClearedForFinalization,
} from '@/lib/jobOrderWorkspaceStage.mjs'
import PageHeader from '@/components/ui/PageHeader'
import PortalLink from '@/components/PortalLink'
import StaffWorkQueue from '@/components/StaffWorkQueue'

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

const getSuggestedControlCenterStage = getSuggestedJobOrderWorkspaceStage

function normalizeBusinessToken(value, fallback = 'UNSET') {
  const normalizedValue = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')

  return normalizedValue || fallback
}

function formatCompactDateToken(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

function formatCompactTimeToken(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${hours}${minutes}${seconds}`
}

function formatBookingReference(record) {
  if (record?.bookingReference) {
    return record.bookingReference
  }

  const compactDate = String(record?.scheduledDate ?? record?.workDate ?? '')
    .slice(0, 10)
    .replace(/-/g, '')
  const plateToken = normalizeBusinessToken(record?.plateNumber ?? record?.vehicleDisplayName, 'PENDING')

  return compactDate ? `BK-${compactDate}-${plateToken}` : `BK-${plateToken}`
}

function formatJobOrderReference(record) {
  if (record?.jobOrderReference) {
    return record.jobOrderReference
  }

  if (record?.sourceBackJobReference) {
    return `JO-RW · ${record.sourceBackJobReference}`
  }

  if (record?.sourceBookingReference) {
    return `JO · ${record.sourceBookingReference}`
  }

  const compactDate = String(record?.workDate ?? record?.createdAt ?? '')
    ? formatCompactDateToken(record?.workDate ?? record?.createdAt)
    : ''
  const timeToken = formatCompactTimeToken(record?.createdAt ?? record?.updatedAt)
  const plateToken = normalizeBusinessToken(record?.plateNumber ?? record?.vehicleDisplayName ?? record?.serviceAdviserCode, 'WORK')
  const prefix = record?.jobType === 'back_job' ? 'JO-RW' : 'JO'

  return compactDate ? `${prefix}-${compactDate}-${timeToken || plateToken}` : `${prefix}-${plateToken}`
}

const initialCreateState = {
  status: 'create_ready',
  message: '',
}

const emptyCreateDraft = {
  notes: '',
  items: [],
  assignedTechnicianId: '',
  assignedSpecialty: '',
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
  workItemId: '',
  entryType: 'note',
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
  qa: { label: 'QA handoff' },
  finalize: { label: 'Finalize' },
}

const CONTROL_CENTER_STEP_ORDER = [
  { key: 'intake', label: 'Intake', workbenchStage: 'queue' },
  { key: 'job_order', label: 'Job order', workbenchStage: 'overview' },
  { key: 'assignments', label: 'Assignments', workbenchStage: 'assignments' },
  { key: 'progress', label: 'Progress', workbenchStage: 'progress' },
  { key: 'evidence', label: 'Evidence', workbenchStage: 'evidence' },
  { key: 'qa_audit', label: 'QA audit', workbenchStage: 'qa' },
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
      return { label: 'Service adviser / admin', badgeClass: getRoleBadgeClassName(roleKey) }
    case 'admin':
      return { label: 'Service adviser / admin', badgeClass: getRoleBadgeClassName(roleKey) }
    case 'workshop':
      return { label: 'Service adviser / admin', badgeClass: getRoleBadgeClassName(roleKey) }
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
  isReadyForQaChecklistSatisfied,
  statusDraft,
  setStatusDraft,
  handleStatusUpdate,
  statusState,
  statusStateClassName,
  ownerLabel,
  hasActiveClaim,
}) {
  const [showMoreActions, setShowMoreActions] = useState(false)

  if (!activeJobOrder) {
    return null
  }

  const currentStatus = activeJobOrder.status
  const primaryStatus = nextStatuses.find((status) => status === 'ready_for_qa') ?? null
  const secondaryStatuses = nextStatuses.filter(
    (status) => status !== primaryStatus && status === 'cancelled',
  )
  const isPrimaryDisabled =
    !primaryStatus ||
    !hasActiveClaim ||
    statusState.status === 'status_update_submitting' ||
    (primaryStatus === 'ready_for_qa' && !isReadyForQaChecklistSatisfied)
  const currentStatusLabel =
    currentStatus === 'assigned'
      ? 'Start the first service when workshop work begins.'
      : currentStatus === 'in_progress'
        ? isReadyForQaChecklistSatisfied
          ? 'Every required service is complete. Send this job order to QA.'
          : 'Complete each service and its required evidence before QA handoff.'
        : currentStatus === 'blocked'
          ? 'Open the blocked service and resume it when the issue is cleared.'
          : currentStatus === 'ready_for_qa'
            ? 'This job order is already waiting on QA release.'
            : 'Use the next valid status action below.'

  return (
    <div className="mt-4 border-t border-surface-border pt-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-ink-primary">QA handoff</p>
            <StatusBadge status={currentStatus} />
            <span className="badge badge-green">{ownerLabel}</span>
          </div>
          <p className="mt-2 text-sm text-ink-secondary">{currentStatusLabel}</p>
        </div>
        <div className="relative flex shrink-0 items-center gap-2">
          {primaryStatus ? (
            <button
              type="button"
              onClick={() => handleStatusUpdate(primaryStatus)}
              disabled={isPrimaryDisabled}
              className="ops-action-secondary"
              title={
                primaryStatus === 'ready_for_qa' && !isReadyForQaChecklistSatisfied
                  ? 'Complete every service, assignment, update, and required evidence item first.'
                  : undefined
              }
            >
              {statusState.status === 'status_update_submitting' ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              {WORKSHOP_STATUS_ACTION_LABELS[primaryStatus] ?? `Mark as ${formatStatusLabel(primaryStatus)}`}
            </button>
          ) : null}
          {secondaryStatuses.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowMoreActions((current) => !current)}
              className="ops-action-secondary h-10 w-10 px-0"
                aria-label="More job order actions"
                title="More job order actions"
              aria-expanded={showMoreActions}
            >
              <MoreHorizontal size={16} />
            </button>
          ) : null}
        </div>
      </div>

      {primaryStatus === 'ready_for_qa' && !isReadyForQaChecklistSatisfied ? (
        <div className="mt-3 rounded-lg border border-brand-orange/25 bg-brand-orange/10 px-3 py-2 text-[11px] leading-5 text-amber-100">
          Send to QA unlocks after assignments, all services, a saved update, and required service evidence are complete.
        </div>
      ) : null}
      {showMoreActions && secondaryStatuses.length > 0 ? (
        <div className="mt-3 rounded-xl border border-surface-border bg-surface-raised p-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Job order actions</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {secondaryStatuses.map((status) => (
              <button
                key={`shared-secondary-status-${status}`}
                type="button"
                onClick={() =>
                  setStatusDraft((current) => ({
                    ...current,
                    status,
                  }))
                }
                className={`ops-action-secondary ${statusDraft.status === status ? 'border-brand-orange text-ink-primary' : ''}`}
              >
                {WORKSHOP_STATUS_ACTION_LABELS[status] ?? `Mark as ${formatStatusLabel(status)}`}
              </button>
            ))}
          </div>
          <label className="mt-3 block text-xs text-ink-muted">
            Reason
            <textarea
              value={statusDraft.reason}
              onChange={(event) =>
                setStatusDraft((current) => ({
                  ...current,
                  reason: event.target.value,
                }))
              }
              rows={2}
              className="mt-1 textarea"
              placeholder="Add context for this status change."
            />
          </label>
          <button
            type="button"
            onClick={() => handleStatusUpdate(statusDraft.status)}
            disabled={
              !hasActiveClaim ||
              !secondaryStatuses.includes(statusDraft.status) ||
              statusState.status === 'status_update_submitting'
            }
            className="ops-action-secondary mt-3"
          >
            Confirm status change
          </button>
        </div>
      ) : null}

      <div className="mt-3">
        {currentStatus === 'in_progress' && isReadyForQaChecklistSatisfied ? (
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-[11px] leading-5 text-emerald-100">
            This job order already has the required work completion, progress trail, and evidence. Use <span className="font-semibold">Send to QA</span> now.
          </div>
        ) : null}
      </div>

      {statusState.message ? <div className={`mt-4 ${statusStateClassName}`}>{statusState.message}</div> : null}
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

const SERVICE_ITEM_STATE_META = {
  todo: { label: 'To do', className: 'badge-gray' },
  in_progress: { label: 'In progress', className: 'badge-orange' },
  blocked: { label: 'Blocked', className: 'badge-orange' },
  completed: { label: 'Completed', className: 'badge-green' },
}

function ServiceWorkItemsPanel({
  items = [],
  progressEntries = [],
  photos = [],
  progressDraft,
  setProgressDraft,
  progressState,
  progressStateClassName,
  onSubmit,
  onAddEvidence,
  canMutate = false,
}) {
  const itemRows = items.map((item) => ({
    ...item,
    serviceState: getServiceItemState(item, progressEntries),
  }))
  const activeItems = itemRows.filter((item) => item.serviceState !== 'completed')
  const completedItems = itemRows.filter((item) => item.serviceState === 'completed')
  const selectedItem = itemRows.find((item) => item.id === progressDraft.workItemId)
  const selectedActionNeedsMessage = ['note', 'issue_found'].includes(progressDraft.entryType)
  const isSubmitting = progressState.status === 'progress_submitting'
  const hasEvidenceForItem = (itemId) =>
    photos.some(
      (photo) =>
        photo?.deletedAt == null &&
        photo?.linkedEntityType === 'work_item' &&
        photo?.linkedEntityId === itemId,
    )

  const chooseMessageAction = (item, entryType) => {
    setProgressDraft({
      workItemId: item.id,
      entryType,
      message: '',
      completedItemIds: [],
    })
  }

  const submitImmediateAction = (item, entryType) => {
    const isCompletion = entryType === 'work_completed'
    const serviceName = formatServiceItemName(item)
    void onSubmit({
      workItemId: item.id,
      entryType,
      message:
        entryType === 'work_started'
          ? `${serviceName} started.`
          : `${serviceName} completed.`,
      completedItemIds: isCompletion ? [item.id] : [],
    })
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-surface-border pb-3">
        <div>
          <p className="text-sm font-semibold text-ink-primary">Services</p>
        </div>
        <span className="badge badge-gray">
          {completedItems.length} of {itemRows.length} complete
        </span>
      </div>

      {activeItems.length > 0 ? (
        <div className="divide-y divide-surface-border">
          {activeItems.map((item) => {
            const stateMeta = SERVICE_ITEM_STATE_META[item.serviceState]
            const requiresMissingEvidence = item.requiresPhotoEvidence !== false && !hasEvidenceForItem(item.id)

            return (
              <div key={item.id} className="py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-ink-primary">{formatServiceItemName(item)}</p>
                      <span className={`badge ${stateMeta.className}`}>{stateMeta.label}</span>
                    </div>
                    {item.description ? (
                      <p className="mt-1 text-xs leading-5 text-ink-secondary">{item.description}</p>
                    ) : (
                      <p className="mt-1 text-xs text-ink-muted">No additional service instructions.</p>
                    )}
                    {item.requiresPhotoEvidence !== false ? (
                      <p className={`mt-2 text-[11px] ${requiresMissingEvidence ? 'text-amber-200' : 'text-emerald-200'}`}>
                        {requiresMissingEvidence ? 'Photo evidence required before completion.' : 'Required photo evidence attached.'}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {item.serviceState === 'todo' || item.serviceState === 'blocked' ? (
                      <button
                        type="button"
                        onClick={() => submitImmediateAction(item, 'work_started')}
                        disabled={!canMutate || isSubmitting}
                        className="ops-action-primary"
                      >
                        {item.serviceState === 'blocked' ? <RotateCcw size={14} /> : <CirclePlay size={14} />}
                        {item.serviceState === 'blocked' ? 'Resume service' : 'Start service'}
                      </button>
                    ) : null}
                    {item.serviceState === 'in_progress' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => chooseMessageAction(item, 'note')}
                          disabled={!canMutate || isSubmitting}
                          className="ops-action-secondary"
                        >
                          <MessageSquareText size={14} />
                          Add update
                        </button>
                        <button
                          type="button"
                          onClick={() => chooseMessageAction(item, 'issue_found')}
                          disabled={!canMutate || isSubmitting}
                          className="ops-action-secondary"
                        >
                          <AlertTriangle size={14} />
                          Report blocker
                        </button>
                        {requiresMissingEvidence ? (
                          <button
                            type="button"
                            onClick={() => onAddEvidence(item.id)}
                            disabled={!canMutate || isSubmitting}
                            className="ops-action-secondary"
                          >
                            <Camera size={14} />
                            Add photo
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => submitImmediateAction(item, 'work_completed')}
                            disabled={!canMutate || isSubmitting}
                            className="ops-action-primary"
                          >
                            <CheckCircle2 size={14} />
                            Mark complete
                          </button>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>

                {selectedItem?.id === item.id && selectedActionNeedsMessage ? (
                  <div className="mt-3 border-l-2 border-brand-orange pl-3">
                    <label className="block text-xs font-medium text-ink-secondary">
                      {progressDraft.entryType === 'issue_found' ? 'Blocker reason' : 'Service update'}
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
                        placeholder={
                          progressDraft.entryType === 'issue_found'
                            ? 'What is preventing this service from continuing?'
                            : 'What changed on this service?'
                        }
                      />
                    </label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void onSubmit(progressDraft)}
                        disabled={!canMutate || !progressDraft.message.trim() || isSubmitting}
                        className="ops-action-primary"
                      >
                        {progressState.status === 'progress_submitting' ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Save size={14} />
                        )}
                        {progressDraft.entryType === 'issue_found' ? 'Save blocker' : 'Save update'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setProgressDraft(emptyProgressDraft)}
                        className="ops-action-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : itemRows.length > 0 ? (
        <div className="py-5 text-sm text-emerald-200">
          All services are complete. Review the evidence, then send this job order to QA.
        </div>
      ) : (
        <div className="py-5 text-sm text-ink-muted">No services were added to this job order.</div>
      )}

      {completedItems.length > 0 ? (
        <details className="border-t border-surface-border py-3">
          <summary className="cursor-pointer text-sm font-medium text-ink-secondary">
            Completed services ({completedItems.length})
          </summary>
          <div className="mt-3 divide-y divide-surface-border">
            {completedItems.map((item) => (
              <div key={item.id} className="flex items-start gap-3 py-3">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-300" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-primary">{formatServiceItemName(item)}</p>
                  {item.description ? <p className="mt-1 text-xs text-ink-muted">{item.description}</p> : null}
                </div>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {progressState.message ? <div className={`mt-3 ${progressStateClassName}`}>{progressState.message}</div> : null}
    </div>
  )
}

export default function JobOrderWorkbench({
  initialJobOrderId = '',
  initialClaimId = '',
  workspaceOnly = false,
}) {
  const user = useUser()
  const role = user?.role ?? null
  const isTechnician = ['technician', 'head_technician'].includes(role)
  const canUseWorkbench = canStaffReadExecutionJobOrder(role)
  const canManageHandoffs = staffJobOrderWorkbenchRoles.includes(role)
  const canManageAssignments = ['service_adviser', 'super_admin'].includes(role)

  const [workbenchScope, setWorkbenchScope] = useState('active')
  const [workbenchStage, setWorkbenchStage] = useState(workspaceOnly ? 'overview' : 'queue')
  const [selectedDate, setSelectedDate] = useState(toDateKey())
  const autoFocusedMonthRef = useRef('')
  const hasManuallySelectedDateRef = useRef(false)
  const handoffLoadRequestRef = useRef(0)
  const jobOrderSummaryRequestRef = useRef(0)
  const jobOrderCalendarRequestRef = useRef(0)
  const [handoffCandidates, setHandoffCandidates] = useState([])
  const [handoffState, setHandoffState] = useState({
    status: 'handoff_empty',
    message: 'Use the active work date to load the live queue for this schedule.',
  })
  const [selectedBookingId, setSelectedBookingId] = useState('')
  const [createDraft, setCreateDraft] = useState(emptyCreateDraft)
  const [createState, setCreateState] = useState(initialCreateState)
  const [activeJobOrder, setActiveJobOrder] = useState(null)
  const [activeQualityGateState, setActiveQualityGateState] = useState({
    jobOrderId: '',
    gate: null,
  })
  const activeQualityGate = activeQualityGateState.jobOrderId === activeJobOrder?.id
    ? activeQualityGateState.gate
    : null
  const [activeClaim, setActiveClaim] = useState(null)
  const [claimState, setClaimState] = useState({
    status: 'idle',
    message: '',
  })
  const [showScheduleTools, setShowScheduleTools] = useState(false)
  const [manualJobOrderId, setManualJobOrderId] = useState('')
  const [detailState, setDetailState] = useState(initialReadState)
  const [assignmentDraftIds, setAssignmentDraftIds] = useState([])
  const [assignmentDraftSpecialties, setAssignmentDraftSpecialties] = useState({})
  const [assignmentState, setAssignmentState] = useState(initialAssignmentState)
  const [statusDraft, setStatusDraft] = useState({
    status: 'draft',
    reason: '',
  })
  const [statusState, setStatusState] = useState(initialStatusState)
  const [workshopStageDraft, setWorkshopStageDraft] = useState({
    stage: 'received',
    note: '',
  })
  const [workshopStageState, setWorkshopStageState] = useState({
    status: 'idle',
    message: '',
  })
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
  const [controlDrawerOpen, setControlDrawerOpen] = useState(false)
  const [controlDrawerTab, setControlDrawerTab] = useState('overview')
  const initializedJobOrderIdRef = useRef(null)
  const routeJobOrderIdRef = useRef('')
  const routeBookingIdRef = useRef('')

  useEffect(() => {
    if (!controlDrawerOpen) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [controlDrawerOpen])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const params = new URLSearchParams(window.location.search)
    const routeJobOrderId = initialJobOrderId || params.get('jobOrderId') || ''
    const routeClaimId = initialClaimId || params.get('claimId') || ''
    const routeBookingId = params.get('bookingId') ?? ''
    const routeScheduledDate = params.get('scheduledDate') ?? ''

    routeJobOrderIdRef.current = routeJobOrderId
    routeBookingIdRef.current = routeBookingId

    if (routeScheduledDate) {
      hasManuallySelectedDateRef.current = true
      setSelectedDate(routeScheduledDate)
    }
    if (routeJobOrderId) {
      setManualJobOrderId(routeJobOrderId)
    }
    if (routeClaimId) {
      params.delete('claimId')
      const nextSearch = params.toString()
      window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`,
      )
    }
    if (routeBookingId) {
      setSelectedBookingId(routeBookingId)
    }
  }, [initialClaimId, initialJobOrderId])

  const activeClaimId = useMemo(() => {
    if (
      activeJobOrder?.id &&
      claimMatchesWork(activeClaim, 'job_order', activeJobOrder.id)
    ) {
      return activeClaim.id
    }
    if (
      selectedBookingId &&
      claimMatchesWork(activeClaim, 'booking_handoff', selectedBookingId)
    ) {
      return activeClaim.id
    }
    return ''
  }, [activeClaim, activeJobOrder?.id, selectedBookingId])
  const hasMatchingJobOrderClaim = Boolean(
    activeJobOrder?.id &&
      claimMatchesWork(activeClaim, 'job_order', activeJobOrder.id),
  )
  const hasMatchingBookingHandoffClaim = Boolean(
    selectedBookingId &&
      claimMatchesWork(activeClaim, 'booking_handoff', selectedBookingId),
  )
  const canFinalizeClaimedWork =
    ['service_adviser', 'super_admin'].includes(role) &&
    hasMatchingJobOrderClaim
  const canTakeActiveJobOrder = Boolean(
    activeJobOrder?.id &&
      ['service_adviser', 'super_admin'].includes(role) &&
      !hasMatchingJobOrderClaim &&
      (
        ['draft', 'assigned', 'in_progress', 'blocked'].includes(activeJobOrder.status) ||
        (
          activeJobOrder.status === 'ready_for_qa' &&
          activeJobOrder.finalizationReadiness?.canFinalize !== false
        )
      ),
  )

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
    () => staffDirectoryState.accounts.filter((account) => account.isActive),
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
  const hasUnsavedProgressWork = useMemo(
    () =>
      Boolean(progressDraft.message.trim()) ||
      Boolean(progressDraft.workItemId) ||
      progressDraft.completedItemIds.length > 0 ||
      progressDraft.entryType !== emptyProgressDraft.entryType ||
      Boolean(workshopStageDraft.note.trim()) ||
      workshopStageDraft.stage !== (activeJobOrder?.currentWorkshopStage ?? 'received'),
    [activeJobOrder?.currentWorkshopStage, progressDraft, workshopStageDraft],
  )
  const confirmDiscardUnsavedWork = useCallback(() => {
    if (!hasUnsavedProgressWork || typeof window === 'undefined') {
      return true
    }

    return window.confirm(
      'You have unsaved progress changes. Leave this job order and discard those changes?',
    )
  }, [hasUnsavedProgressWork])
  useEffect(() => {
    if (!hasUnsavedProgressWork || typeof window === 'undefined') {
      return undefined
    }

    const handleBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedProgressWork])
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
    () => getSuggestedControlCenterStage(
      activeJobOrder,
      workbenchStage === 'queue' ? 'overview' : workbenchStage,
      activeQualityGate,
    ),
    [activeJobOrder, activeQualityGate, workbenchStage],
  )
  const qaClearedForFinalization = useMemo(
    () => isQaClearedForFinalization(activeQualityGate),
    [activeQualityGate],
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

    if (currentControlCenterStage === 'qa') {
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
      reasons.push('Not all services are complete yet. Finish every service before sending this job order to QA.')
    }

    if (hasSavedAssignments && hasProgressEntries && allWorkItemsCompleted && !hasRequiredWorkItemEvidence) {
      reasons.push('Completed services still need required photo evidence before QA handoff can unlock.')
    }

    if (selectedCompletedItemsMissingPhotoEvidence.length > 0) {
      reasons.push(
        `Selected completed items still need work-item photo evidence: ${selectedCompletedItemsMissingPhotoEvidence
          .map((item) => formatServiceItemName(item))
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
          state = qaClearedForFinalization ? 'done' : 'active'
          note = qaClearedForFinalization ? 'QA passed' : 'Open QA Audit'
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
          state = qaClearedForFinalization ? 'active' : 'locked'
          note = qaClearedForFinalization ? 'Ready to finalize' : 'Await QA release'
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
    qaClearedForFinalization,
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
        title: 'Start the first service',
        body: 'Choose the next service in the workspace and start it when workshop work begins.',
        toneClass: 'border-brand-orange/25 bg-brand-orange/10 text-amber-100',
        actionLabel: 'Review services',
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
      if (qaClearedForFinalization) {
        return {
          stepLabel: 'Step 7 of 8',
          title: 'QA passed - finalize this job order',
          body: 'The independent release verdict is complete. Create the invoice-ready record and continue to payment.',
          toneClass: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-100',
          actionLabel: 'Go to finalization',
          stageKey: 'finalize',
          secondaryLabel: 'Review QA result',
          roleMeta: getControlCenterRoleMeta('admin'),
        }
      }
      return {
        stepLabel: 'Step 6 of 8',
        title: 'QA audit must clear release before finalization',
        body: 'This job order is ready for QA. Open QA Audit now so the release verdict can unlock finalization.',
        toneClass: 'border-blue-500/25 bg-blue-500/10 text-blue-100',
        actionLabel: 'Open QA Audit',
        stageKey: 'qa_audit',
        secondaryLabel: 'Review QA handoff',
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
    qaClearedForFinalization,
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
  useEffect(() => {
    if (!canUseWorkbench || activeJobOrder?.id || markedWorkbenchDates.length === 0) {
      return
    }

    if (hasManuallySelectedDateRef.current) {
      return
    }

    if (autoFocusedMonthRef.current === selectedMonth) {
      return
    }

    if (markedWorkbenchDates.some((entry) => entry.date === selectedDate)) {
      autoFocusedMonthRef.current = selectedMonth
      return
    }

    autoFocusedMonthRef.current = selectedMonth
    setSelectedDate(markedWorkbenchDates[0].date)
  }, [activeJobOrder?.id, canUseWorkbench, markedWorkbenchDates, selectedDate, selectedMonth])
  const selectedDateJobOrders = useMemo(
    () => monthJobOrders.filter((jobOrder) => jobOrder.workDate === selectedDate),
    [monthJobOrders, selectedDate],
  )
  const queueMode = useMemo(() => {
    if (isTechnician || workbenchScope === 'history') {
      return 'job_order_queue'
    }

    if (selectedDateJobOrders.length === 0 && handoffCandidates.length > 0) {
      return 'handoff_create'
    }

    if (selectedDateJobOrders.length === 0 && handoffCandidates.length === 0 && monthJobOrders.length === 0) {
      return 'empty'
    }

    return 'job_order_queue'
  }, [handoffCandidates.length, isTechnician, monthJobOrders.length, selectedDateJobOrders.length, workbenchScope])
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
            ? `Service (photo required): ${formatServiceItemName(item)}`
            : `Service: ${formatServiceItemName(item)}`,
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

    if (!isTechnician && activeJobOrder?.status === 'ready_for_qa') {
      baseStages.push('qa')
    }

    if (!isTechnician) {
      baseStages.push('finalize')
    }

    return baseStages.map((key) => ({
      key,
      label: WORKBENCH_STAGE_META[key]?.label ?? formatStatusLabel(key),
    }))
  }, [activeJobOrder?.status, isTechnician])
  const isQueueStageVisible = !activeJobOrder || workbenchStage === 'queue'
  const isOverviewStageActive = workbenchStage === 'overview'
  const isAssignmentsStageActive = workbenchStage === 'assignments'
  const isProgressStageActive = workbenchStage === 'progress'
  const isEvidenceStageActive = workbenchStage === 'evidence'
  const isQaStageActive = workbenchStage === 'qa' && activeJobOrder?.status === 'ready_for_qa'
  const isFinalizeStageActive = workbenchStage === 'finalize'

  const loadStaffDirectory = useCallback(async () => {
    if (!user?.accessToken || !['service_adviser', 'super_admin'].includes(role)) {
      return
    }

    setStaffDirectoryState((current) => ({ ...current, status: 'loading', message: '' }))
    try {
      const accounts = await listTechnicianProfiles(user.accessToken, { activeOnly: false })
      setStaffDirectoryState({
        status: 'success',
        accounts: accounts.map((profile) => ({
          ...profile,
          id: profile.id,
          displayName: profile.fullName,
          roleLabel: 'Technician Profile',
          staffCode: profile.code,
        })),
        message: accounts.length ? '' : 'No technician directory records are available yet.',
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
    const requestId = jobOrderSummaryRequestRef.current + 1
    jobOrderSummaryRequestRef.current = requestId

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
        limit: 50,
      })

      if (requestId !== jobOrderSummaryRequestRef.current) {
        return
      }

      setJobOrderSummaryState({
        status: 'success',
        items,
        message: items.length ? '' : 'No job orders are mapped to this month yet.',
      })
    } catch (error) {
      if (requestId !== jobOrderSummaryRequestRef.current) {
        return
      }

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
    const requestId = jobOrderCalendarRequestRef.current + 1
    jobOrderCalendarRequestRef.current = requestId

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

      if (requestId !== jobOrderCalendarRequestRef.current) {
        return
      }

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
      if (requestId !== jobOrderCalendarRequestRef.current) {
        return
      }

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
    const jobOrderId = activeJobOrder?.id
    const controller = new AbortController()
    setActiveQualityGateState({ jobOrderId: jobOrderId ?? '', gate: null })

    if (
      !jobOrderId
      || activeJobOrder?.status !== 'ready_for_qa'
      || !user?.accessToken
    ) {
      return () => controller.abort()
    }

    void getJobOrderQualityGate({
      jobOrderId,
      accessToken: user.accessToken,
      signal: controller.signal,
    })
      .then((qualityGate) => {
        setActiveQualityGateState({ jobOrderId, gate: qualityGate })
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          setActiveQualityGateState({ jobOrderId, gate: null })
        }
      })

    return () => controller.abort()
  }, [activeJobOrder?.id, activeJobOrder?.status, user?.accessToken])

  useEffect(() => {
    if (activeJobOrder?.id) {
      setWorkbenchStage((current) => {
        const suggestedStage = getSuggestedControlCenterStage(
          activeJobOrder,
          'overview',
          activeQualityGate,
        )
        if (current === 'queue') return suggestedStage
        if (
          activeJobOrder.status === 'ready_for_qa'
          && ['qa', 'finalize'].includes(current)
        ) {
          return suggestedStage
        }
        return current
      })
      return
    }

    setWorkbenchStage('queue')
  }, [activeJobOrder, activeQualityGate])

  const loadBookingHandoffs = useCallback(async () => {
    const requestId = handoffLoadRequestRef.current + 1
    handoffLoadRequestRef.current = requestId

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

      if (handoffLoadRequestRef.current !== requestId) {
        return
      }

      const existingBookingSourceIds = new Set(
        monthJobOrders
          .filter((jobOrder) => jobOrder.sourceType === 'booking' && jobOrder.sourceId)
          .map((jobOrder) => jobOrder.sourceId),
      )
      const handoffEligibleBookings = (schedule?.slots ?? []).flatMap((slot) =>
        (slot?.bookings ?? []).filter(
          (booking) =>
            ['confirmed', 'in_service'].includes(booking?.status) &&
            !existingBookingSourceIds.has(booking.id),
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
      if (handoffLoadRequestRef.current !== requestId) {
        return
      }

      setHandoffCandidates([])
      setSelectedBookingId('')
      setHandoffState({
        status: 'handoff_load_failed',
        message: error?.message || 'Booking handoff candidates could not be loaded.',
      })
    }
  }, [canManageHandoffs, monthJobOrders, selectedDate, user?.accessToken, workbenchScope])

  useEffect(() => {
    void loadBookingHandoffs()
  }, [loadBookingHandoffs])

  useEffect(() => {
    const routeBookingId = routeBookingIdRef.current
    if (!routeBookingId || handoffCandidates.length === 0) {
      return
    }

    if (handoffCandidates.some((candidate) => candidate.bookingId === routeBookingId)) {
      setSelectedBookingId(routeBookingId)
    }
  }, [handoffCandidates])

  useEffect(() => {
    setHandoffCandidates([])
    setSelectedBookingId('')
    setCreateDraft(emptyCreateDraft)
    setCreateState(initialCreateState)
  }, [selectedDate])

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

  const handleWorkbenchScopeChange = useCallback((nextScope) => {
    if (nextScope === workbenchScope) {
      return
    }
    if (!confirmDiscardUnsavedWork()) {
      return
    }

    setWorkbenchScope(nextScope)
    setWorkbenchStage('queue')
    setControlDrawerOpen(false)
    autoFocusedMonthRef.current = ''
    setActiveJobOrder(null)
    setActiveClaim(null)
    setManualJobOrderId('')
    setDetailState(initialReadState)
    setShowScheduleTools(nextScope === 'history')
    clearBookingCreateContext()
  }, [clearBookingCreateContext, confirmDiscardUnsavedWork, workbenchScope])

  useEffect(() => {
    if (!activeJobOrder?.id) {
      initializedJobOrderIdRef.current = null
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

    if (initializedJobOrderIdRef.current === activeJobOrder.id) {
      return
    }

    initializedJobOrderIdRef.current = activeJobOrder.id

    const initialNextStatuses = getAllowedJobOrderStatusTargets(activeJobOrder.status)

    setAssignmentDraftIds(activeJobOrder.assignedTechnicianIds ?? [])
    setAssignmentDraftSpecialties(
      Object.fromEntries(
        (activeJobOrder.assignments ?? [])
          .filter((assignment) => assignment?.technicianProfileId)
          .map((assignment) => [assignment.technicianProfileId, assignment.selectedSpecialty || 'general repair']),
      ),
    )
    setAssignmentState(initialAssignmentState)
    setStatusDraft({
      status: initialNextStatuses[0] ?? activeJobOrder.status,
      reason: '',
    })
    setStatusState(initialStatusState)
    setWorkshopStageDraft({
      stage: activeJobOrder.currentWorkshopStage ?? 'received',
      note: '',
    })
    setWorkshopStageState({
      status: 'idle',
      message: '',
    })
    setProgressDraft(emptyProgressDraft)
    setProgressState(initialProgressState)
    setPhotoDraft(emptyPhotoDraft)
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
  }, [activeJobOrder])

  useEffect(() => {
    if (!activeJobOrder?.id) {
      return
    }

    const allowedNextStatuses = getAllowedJobOrderStatusTargets(activeJobOrder.status)

    setStatusDraft((current) => {
      const fallbackStatus = allowedNextStatuses[0] ?? activeJobOrder.status

      if (allowedNextStatuses.length === 0) {
        return current.status === activeJobOrder.status
          ? current
          : {
              ...current,
              status: activeJobOrder.status,
            }
      }

      return allowedNextStatuses.includes(current.status)
        ? current
        : {
            ...current,
            status: fallbackStatus,
          }
    })
  }, [activeJobOrder?.id, activeJobOrder?.status])

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

  const handleSelectHandoffCandidate = (candidate) => {
    setSelectedBookingId(candidate.bookingId)
    setCreateDraft({
      notes: candidate.sourceNotes ?? '',
      items: candidate.defaultItems,
      assignedTechnicianId: '',
    })
    setCreateState(initialCreateState)
  }

  const loadJobOrderRecord = useCallback(async (nextJobOrderId, successMessage) => {
    if (!user?.accessToken) {
      setDetailState({
        status: 'load_failed',
        message: 'A valid staff session is required before loading job-order detail.',
      })
      return
    }

    if (!nextJobOrderId) {
      setDetailState({
        status: 'load_failed',
        message: 'Choose a job order before loading its detail.',
      })
      return
    }

    setDetailState({
      status: 'detail_loading',
      message: 'Loading job-order detail...',
    })

    try {
      const jobOrder = await getJobOrderById({
        jobOrderId: nextJobOrderId.trim(),
        accessToken: user.accessToken,
      })

      clearBookingCreateContext()
      setActiveJobOrder(jobOrder)
      setSelectedDate(jobOrder.workDate ?? toDateKey())
      setManualJobOrderId(jobOrder.id)
      setWorkbenchStage(getSuggestedControlCenterStage(jobOrder, 'overview'))
      setDetailState({
        status: 'detail_loaded',
        message:
          successMessage ||
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
  }, [clearBookingCreateContext, user?.accessToken])

  const recoverJobOrderClaim = useCallback(async (jobOrderId, { quiet = false } = {}) => {
    if (!user?.accessToken || !jobOrderId) {
      setActiveClaim(null)
      return null
    }

    if (!quiet) {
      setClaimState({
        status: 'loading',
        message: 'Checking your current Job Order assignment...',
      })
    }

    try {
      const result = await listStaffWorkQueue({
        queueType: 'job_order',
        accessToken: user.accessToken,
        view: 'my',
        limit: 25,
      })
      const nextClaim = recoverMatchingJobOrderClaim(result, jobOrderId)

      setActiveClaim(nextClaim)
      setClaimState({
        status: nextClaim ? 'ready' : 'unclaimed',
        message: nextClaim
          ? 'This Job Order is assigned to you.'
          : (result.session?.activeClaimCount ?? 0) >= (result.session?.capacity ?? 1)
            ? 'Your Job Order workload is at capacity. Complete or release an assignment before taking this job.'
            : 'This Job Order is not currently assigned to you.',
      })
      return nextClaim
    } catch (error) {
      setActiveClaim(null)
      setClaimState({
        status: 'error',
        message: error?.message || 'Current Job Order ownership could not be refreshed.',
      })
      return null
    }
  }, [user?.accessToken])

  useEffect(() => {
    if (!activeJobOrder?.id || !user?.accessToken || isTechnician) {
      return
    }
    void recoverJobOrderClaim(activeJobOrder.id)
  }, [activeJobOrder?.id, isTechnician, recoverJobOrderClaim, user?.accessToken])

  const openQueueItem = useCallback((item) => {
    const nextClaim = toJobOrderClaimSummary({
      claim: item.claim,
      entityId: item.entityId,
      entityType: item.entityType,
    })
    if (item.jobOrderId && item.jobOrderId === activeJobOrder?.id) {
      setActiveClaim(nextClaim)
      setClaimState({
        status: nextClaim ? 'ready' : 'unclaimed',
        message: nextClaim
          ? 'This Job Order is assigned to you.'
          : 'This Job Order is not currently assigned to you.',
      })
      return
    }
    if (!confirmDiscardUnsavedWork()) {
      return
    }

    setActiveClaim(nextClaim)
    setControlDrawerOpen(false)

    if (item.jobOrderId) {
      setShowScheduleTools(false)
      void loadJobOrderRecord(
        item.jobOrderId,
        `${item.reference || 'Assigned job order'} loaded from My Work.`,
      )
      return
    }

    if (item.bookingId) {
      setShowScheduleTools(true)
      setActiveJobOrder(null)
      setSelectedBookingId(item.bookingId)
      setSelectedDate(item.queueEnteredAt?.slice(0, 10) || toDateKey())
      setWorkbenchStage('queue')
      setDetailState({
        status: 'detail_loaded',
        message: `${item.reference || 'Booking handoff'} is assigned to you and ready for job-order creation.`,
      })
    }
  }, [activeJobOrder?.id, confirmDiscardUnsavedWork, loadJobOrderRecord])

  const handleTakeThisJob = useCallback(async () => {
    if (!activeJobOrder?.id || !user?.accessToken) {
      return
    }

    setClaimState({
      status: 'loading',
      message: 'Claiming this Job Order...',
    })
    try {
      const assignment = await claimStaffWork({
        queueType: 'job_order',
        entityType: 'job_order',
        entityId: activeJobOrder.id,
        accessToken: user.accessToken,
      })
      const nextClaim = toJobOrderClaimSummary({
        claim: assignment.claim,
        entityId: activeJobOrder.id,
        entityType: 'job_order',
      })
      setActiveClaim(nextClaim)
      setClaimState({
        status: 'ready',
        message: 'This Job Order is now assigned to you.',
      })
    } catch (error) {
      setActiveClaim(null)
      setClaimState({
        status: 'error',
        message: getJobOrderClaimConflictMessage(error),
      })
      await recoverJobOrderClaim(activeJobOrder.id, { quiet: true })
    }
  }, [activeJobOrder?.id, recoverJobOrderClaim, user?.accessToken])

  const handleWorkClaimFailure = useCallback((error) => {
    if (!isStaffWorkClaimError(error)) {
      return false
    }

    setActiveClaim(null)
    setClaimState({
      status: 'error',
      message: getJobOrderClaimConflictMessage(error),
    })
    if (activeJobOrder?.id) {
      void recoverJobOrderClaim(activeJobOrder.id, { quiet: true })
    }
    return true
  }, [activeJobOrder?.id, recoverJobOrderClaim])

  const handleLoadJobOrder = async () => {
    await loadJobOrderRecord(manualJobOrderId)
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

    if (!hasMatchingBookingHandoffClaim) {
      setCreateState({
        status: 'source_not_eligible',
        message: 'Take this booking handoff from My Work before creating its Job Order.',
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
        claimId: activeClaimId,
        ...seededDraft,
        notes: createDraft.notes,
        items: createDraft.items,
        assignments: createDraft.assignedTechnicianId
          ? [
              {
                technicianProfileId: createDraft.assignedTechnicianId,
                selectedSpecialty: createDraft.assignedSpecialty || 'general repair',
              },
            ]
          : [],
      })

      clearBookingCreateContext({
        status: 'create_saved',
        message: `Job order ${formatJobOrderReference(jobOrder)} created from the selected booking handoff.`,
      })
      setActiveJobOrder(jobOrder)
      setActiveClaim(null)
      setClaimState({
        status: 'unclaimed',
        message: 'The booking handoff is complete. Claim this Job Order before editing it.',
      })
      setSelectedDate(jobOrder.workDate ?? selectedDate)
      setManualJobOrderId(jobOrder.id)
      setWorkbenchStage(getSuggestedControlCenterStage(jobOrder, 'overview'))
      void loadJobOrderSummaries()
      setHandoffCandidates((current) =>
        current.filter((candidate) => candidate.bookingId !== selectedCandidate.bookingId),
      )
    } catch (error) {
      if (handleWorkClaimFailure(error)) {
        setCreateState({
          status: 'source_not_eligible',
          message: 'Your booking-handoff claim changed or expired. Refresh My Work before trying again.',
        })
        return
      }
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

    if (checked) {
      const matchedProfile = technicianOptions.find((account) => account.id === technicianUserId)
      setAssignmentDraftSpecialties((current) => ({
        ...current,
        [technicianUserId]:
          current[technicianUserId] ||
          matchedProfile?.specialties?.[0] ||
          'general repair',
      }))
      return
    }

    setAssignmentDraftSpecialties((current) => {
      const next = { ...current }
      delete next[technicianUserId]
      return next
    })
  }

  useEffect(() => {
    const routeJobOrderId = routeJobOrderIdRef.current
    if (!routeJobOrderId || !user?.accessToken || activeJobOrder?.id === routeJobOrderId) {
      return
    }

    routeJobOrderIdRef.current = ''
    setManualJobOrderId(routeJobOrderId)
    void loadJobOrderRecord(
      routeJobOrderId,
      'Selected job order opened from the previous workflow step.',
    )
  }, [activeJobOrder?.id, loadJobOrderRecord, user?.accessToken])

  useEffect(() => {
    const routeBookingId = routeBookingIdRef.current
    if (!routeBookingId || activeJobOrder?.id || !user?.accessToken) {
      return
    }

    const existingJobOrder = monthJobOrders.find(
      (jobOrder) => jobOrder.sourceType === 'booking' && jobOrder.sourceId === routeBookingId,
    )
    if (!existingJobOrder) {
      return
    }

    routeBookingIdRef.current = ''
    setManualJobOrderId(existingJobOrder.id)
    void loadJobOrderRecord(
      existingJobOrder.id,
      'This booking already has a job order, so the existing work record was opened automatically.',
    )
  }, [activeJobOrder?.id, loadJobOrderRecord, monthJobOrders, user?.accessToken])

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

    if (!hasMatchingJobOrderClaim) {
      setAssignmentState({
        status: 'assignment_conflict',
        message: 'Take this Job Order before saving technician assignments.',
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
        assignments: assignmentDraftIds.map((technicianProfileId) => ({
          technicianProfileId,
          selectedSpecialty: assignmentDraftSpecialties[technicianProfileId] || 'general repair',
        })),
        expectedUpdatedAt: activeJobOrder.updatedAt,
        accessToken: user.accessToken,
        claimId: activeClaimId,
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
      if (handleWorkClaimFailure(error)) {
        setAssignmentState({
          status: 'assignment_conflict',
          message: 'Your Job Order assignment changed or expired. Take this job again before saving assignments.',
        })
        return
      }
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

    if (!hasMatchingJobOrderClaim) {
      setStatusState({
        status: 'update_conflict',
        message: 'Take this Job Order before changing its workflow status.',
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
        claimId: activeClaimId,
      })

      setActiveJobOrder(updatedJobOrder)
      if (['ready_for_qa', 'cancelled'].includes(updatedJobOrder.status)) {
        setActiveClaim(null)
        setClaimState({
          status: 'unclaimed',
          message: updatedJobOrder.status === 'ready_for_qa'
            ? 'The Job Order claim was released when work entered QA.'
            : 'The Job Order claim was released when the work was cancelled.',
        })
      }
      setManualJobOrderId(updatedJobOrder.id)
      setWorkbenchStage(getSuggestedControlCenterStage(updatedJobOrder, 'overview'))
      void loadJobOrderSummaries()
      setStatusState({
        status: 'status_update_saved',
        message: `Job order moved to ${formatStatusLabel(updatedJobOrder.status)}.`,
      })
    } catch (error) {
      if (handleWorkClaimFailure(error)) {
        setStatusState({
          status: 'update_conflict',
          message: 'Your Job Order assignment changed or expired. Refresh ownership before changing status.',
        })
        return
      }
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

  const handleAddProgressEntry = async (draftOverride = null) => {
    const effectiveDraft =
      draftOverride && typeof draftOverride === 'object' && !('nativeEvent' in draftOverride)
        ? draftOverride
        : progressDraft

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
            : 'Only service advisers or super admins can append workshop progress entries.',
      })
      return
    }

    if (!hasMatchingJobOrderClaim) {
      setProgressState({
        status: 'progress_conflict',
        message: 'Take this Job Order before saving service progress.',
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

    const missingPhotoEvidence = (activeJobOrder.items ?? []).filter(
      (item) =>
        (effectiveDraft.completedItemIds ?? []).includes(item.id) &&
        item.requiresPhotoEvidence !== false &&
        !linkedWorkItemPhotoIds.has(item.id),
    )

    if (missingPhotoEvidence.length > 0) {
      setProgressState({
        status: 'progress_failed',
        message: `Add service photo evidence before marking complete: ${missingPhotoEvidence
          .map((item) => formatServiceItemName(item))
          .join(', ')}.`,
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
        workItemId: effectiveDraft.workItemId,
        entryType: effectiveDraft.entryType,
        message: effectiveDraft.message,
        completedItemIds: effectiveDraft.completedItemIds,
        expectedUpdatedAt: activeJobOrder.updatedAt,
        accessToken: user.accessToken,
        claimId: activeClaimId,
      })

      setActiveJobOrder(updatedJobOrder)
      if (effectiveDraft.entryType === 'work_started') {
        setWorkshopStageDraft({
          stage: updatedJobOrder.currentWorkshopStage ?? 'in_repair',
          note: '',
        })
      }
      setWorkbenchStage(getSuggestedControlCenterStage(updatedJobOrder, 'overview'))
      setProgressDraft(emptyProgressDraft)
      setProgressState({
        status: 'progress_saved',
        message:
          effectiveDraft.entryType === 'work_started'
            ? 'Service started.'
            : effectiveDraft.entryType === 'work_completed'
              ? 'Service completed.'
              : effectiveDraft.entryType === 'issue_found'
                ? 'Blocker saved. Resume this service when the issue is cleared.'
                : 'Service update saved.',
      })
    } catch (error) {
      if (handleWorkClaimFailure(error)) {
        setProgressState({
          status: 'progress_conflict',
          message: 'Your Job Order assignment changed or expired. Take this job again before saving progress.',
        })
        return
      }
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

  const openControlDrawer = (tab) => {
    setControlDrawerTab(tab)
    setControlDrawerOpen(true)
  }

  const handleOpenWorkItemEvidence = (workItemId) => {
    setPhotoDraft((current) => ({
      ...current,
      linkedEntityType: 'work_item',
      linkedEntityId: workItemId,
    }))
    setWorkbenchStage('evidence')
    window.setTimeout(() => {
      document.getElementById('job-order-stage-evidence')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 0)
  }

  const handleControlCenterPrimaryAction = () => {
    if (currentControlCenterStage === 'progress' && hasUnsavedProgressWork) {
      void handleAddProgressEntry()
      return
    }

    if (controlCenterNextAction.stageKey === 'qa_audit' && typeof window !== 'undefined') {
      window.location.assign(`/admin/qa-audit?jobOrderId=${encodeURIComponent(activeJobOrder.id)}`)
      return
    }

    navigateToWorkbenchStage(controlCenterNextAction.stageKey)
  }

  const controlCenterPrimaryLabel =
    currentControlCenterStage === 'progress'
      ? hasUnsavedProgressWork
        ? 'Save service update'
        : 'Review services'
      : controlCenterNextAction.actionLabel

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
        message: 'Only service advisers or super admins can attach photo evidence in the active workshop flow.',
      })
      return
    }

    if (!hasMatchingJobOrderClaim) {
      setPhotoState({
        status: 'photo_conflict',
        message: 'Take this Job Order before uploading evidence.',
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
        claimId: activeClaimId,
      })

      setActiveJobOrder(updatedJobOrder)
      setWorkbenchStage('evidence')
      setPhotoDraft({
        ...emptyPhotoDraft,
        linkedEntityType: recommendedPhotoTargetOption?.linkedEntityType ?? photoTargetOptions[0]?.linkedEntityType ?? 'job_order',
        linkedEntityId: recommendedPhotoTargetOption?.linkedEntityId ?? photoTargetOptions[0]?.linkedEntityId ?? '',
      })
      setPhotoInputResetKey((current) => current + 1)
      setPhotoState({
        status: 'photo_saved',
        message: 'Photo evidence uploaded and saved. Stay on Evidence to confirm the stored proof before continuing.',
      })
    } catch (error) {
      if (handleWorkClaimFailure(error)) {
        setPhotoState({
          status: 'photo_conflict',
          message: 'Your Job Order assignment changed or expired. Take this job again before uploading evidence.',
        })
        return
      }
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

    if (!canFinalizeClaimedWork) {
      setFinalizeState({
        status: 'finalize_forbidden_role',
        message: hasMatchingJobOrderClaim
          ? 'Only a service adviser or super admin can finalize this Job Order.'
          : 'Claim this QA-cleared Job Order before finalizing it.',
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
        claimId: activeClaimId,
      })

      setActiveJobOrder(updatedJobOrder)
      setActiveClaim(null)
      setClaimState({
        status: 'unclaimed',
        message: 'Finalization completed and released this Job Order assignment.',
      })
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
      if (handleWorkClaimFailure(error)) {
        setFinalizeState({
          status: 'finalize_conflict',
          message: 'Your Job Order assignment changed or expired. Claim the QA-cleared work before finalizing.',
        })
        return
      }
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

  const handleExportTechnicianChecklist = async (assignment) => {
    if (!activeJobOrder?.id || !assignment?.id) {
      setAssignmentState({
        status: 'assignment_failed',
        message: 'Save the assignment first before exporting the checklist PDF.',
      })
      return
    }

    if (!user?.accessToken) {
      setAssignmentState({
        status: 'assignment_failed',
        message: 'A valid staff session is required before exporting the checklist PDF.',
      })
      return
    }

    try {
      const pdfBlob = await exportTechnicianChecklistPdf({
        jobOrderId: activeJobOrder.id,
        assignmentId: assignment.id,
        accessToken: user.accessToken,
      })
      const downloadUrl = URL.createObjectURL(pdfBlob)
      const anchor = document.createElement('a')
      anchor.href = downloadUrl
      anchor.download = `${assignment.technicianCode || assignment.technicianName || 'technician-checklist'}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(downloadUrl)
      setAssignmentState({
        status: 'assignment_saved',
        message: 'Checklist PDF generated and downloaded for the selected technician profile.',
      })
    } catch (error) {
      setAssignmentState({
        status: 'assignment_failed',
        message: error?.message || 'Checklist PDF could not be generated.',
      })
    }
  }

  const renderBookingCreateWorkspace = ({ mode = 'primary' } = {}) => {
    if (!selectedCandidate) {
      return (
        <div className={mode === 'primary' ? 'empty-panel' : 'empty-panel mt-4'}>
          <AlertTriangle size={28} className="mx-auto text-ink-dim mb-3" />
          <p className="text-sm font-semibold text-ink-primary">Select a confirmed or workshop-handoff booking first</p>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">
            The workbench creates job orders from confirmed bookings and bookings already moved into workshop handoff.
          </p>
        </div>
      )
    }

    return (
      <div className={mode === 'primary' ? 'rounded-2xl border border-brand-orange/30 bg-brand-orange/10 p-4' : 'space-y-4 mt-4'}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-bold text-ink-primary">
              {mode === 'primary' ? 'Ready to create first job order from booking handoff' : 'Create / Load Job Order'}
            </p>
            <p className="text-xs text-ink-muted mt-1">
              {mode === 'primary'
                ? 'This date has a handoff-ready booking but no created job order yet. Use this booking as the primary workspace action.'
                : 'Convert the selected confirmed booking into a new job order without leaving the execution workspace.'}
            </p>
          </div>
          <span className="badge badge-orange">Booking handoff active</span>
        </div>

        <div className="grid gap-3 md:grid-cols-3 mt-4">
          <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Source booking</p>
            <p className="text-sm text-ink-primary mt-1">{formatBookingReference(selectedCandidate)}</p>
            <p className="text-xs text-ink-muted mt-2">{selectedCandidate.timeSlotLabel}</p>
          </div>
          <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Customer and vehicle</p>
            <p className="text-sm text-ink-primary mt-1">{selectedCandidate.customerLabel}</p>
            <p className="text-xs text-ink-muted mt-2">{selectedCandidate.vehicleLabel}</p>
          </div>
          <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Service and adviser</p>
            <p className="text-sm text-ink-primary mt-1">{selectedCandidate.serviceSummary}</p>
            <p className="text-xs text-ink-muted mt-2">{user?.staffCode ?? 'Missing staff code'}</p>
          </div>
        </div>

        <label className="text-xs text-ink-muted block mt-4">
          Services
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

        <div className="grid gap-3 md:grid-cols-2 mt-4">
          <label className="text-xs text-ink-muted block">
            Assigned technician profile
            <select
              value={createDraft.assignedTechnicianId}
              onChange={(event) =>
                setCreateDraft((current) => ({
                  ...current,
                  assignedTechnicianId: event.target.value,
                  assignedSpecialty:
                    technicianOptions.find((account) => account.id === event.target.value)?.specialties?.[0] || '',
                }))
              }
              className="mt-1 select"
            >
              <option value="">Create as draft - assign later</option>
              {technicianOptions.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.displayName || account.email} - Technician Profile
                  {account.staffCode ? ` (${account.staffCode})` : ''}
                </option>
              ))}
            </select>
            <span className="block text-[11px] text-ink-muted mt-1">
              Leaving this blank creates a draft job order instead of assigning a technician profile immediately.
            </span>
            {staffDirectoryState.message ? (
              <span className="block text-[11px] text-ink-muted mt-1">
                {staffDirectoryState.message}
              </span>
            ) : null}
          </label>

          <label className="text-xs text-ink-muted block">
            Assignment specialty
            <select
              value={createDraft.assignedSpecialty}
              onChange={(event) =>
                setCreateDraft((current) => ({
                  ...current,
                  assignedSpecialty: event.target.value,
                }))
              }
              className="mt-1 select"
              disabled={!createDraft.assignedTechnicianId}
            >
              <option value="">Select the checklist specialty</option>
              {(technicianOptions.find((account) => account.id === createDraft.assignedTechnicianId)?.specialties ?? []).map((specialty) => (
                <option key={specialty} value={specialty}>
                  {specialty}
                </option>
              ))}
            </select>
            <span className="block text-[11px] text-ink-muted mt-1">
              The selected specialty determines the printable checklist for this technician profile.
            </span>
          </label>

          <label className="text-xs text-ink-muted block md:col-span-2">
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
        </div>

        {createState.message ? <div className={`mt-4 ${createStateClassName}`}>{createState.message}</div> : null}

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={handleCreateJobOrder}
            disabled={
              !hasMatchingBookingHandoffClaim ||
              createState.status === 'create_submitting'
            }
            className="ops-action-primary"
          >
            {createState.status === 'create_submitting' ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <ClipboardList size={14} />
            )}
            Create job order
          </button>
        </div>
      </div>
    )
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
      {workspaceOnly ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border pb-4">
          <PortalLink href="/admin/job-orders" className="ops-action-secondary">
            <ArrowLeft size={15} />
            Back to board
          </PortalLink>
          <p className="text-sm text-ink-muted">Focused job workspace</p>
        </div>
      ) : (
      <div className={activeJobOrder ? 'hidden md:block' : ''}>
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
                    onClick={() => handleWorkbenchScopeChange(view.key)}
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
                  className="ops-action-secondary h-11 w-11 min-w-11 self-start px-0 sm:w-auto sm:min-w-[148px] sm:px-4 xl:self-auto"
                  aria-label="Refresh job orders"
                >
                  <RefreshCw size={14} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              ) : null}
            </div>
          )}
        />
      </div>
      )}

      {!workspaceOnly && (workbenchScope === 'history' ? (
        <>
          <section className="grid grid-cols-3 divide-x divide-surface-border rounded-[20px] border border-surface-border bg-surface-card px-2 py-4 sm:hidden">
            {[
              { label: 'Records', value: monthJobOrders.length },
              { label: 'Dates', value: markedWorkbenchDates.length },
              { label: 'Selected', value: selectedDateJobOrders.length },
            ].map((metric) => (
              <div key={metric.label} className="min-w-0 px-2 text-center">
                <p className="text-[10px] font-semibold uppercase text-ink-muted">{metric.label}</p>
                <p className="mt-1 text-xl font-semibold text-ink-primary">{metric.value}</p>
              </div>
            ))}
          </section>
          <section className="hidden gap-3 sm:grid sm:grid-cols-3">
            <SummaryTile
              icon={FileStack}
              label="History Records"
              value={monthJobOrders.length}
              sub="Finalized and cancelled job orders in the selected month"
            />
            <SummaryTile
              icon={CalendarDays}
              label="Dates Available"
              value={markedWorkbenchDates.length}
              sub="Choose a marked date to narrow the archive"
            />
            <SummaryTile
              icon={CheckCircle2}
              label="Selected Date"
              value={selectedDateJobOrders.length}
              sub={
                selectedDateJobOrders.length === 1
                  ? 'One job order is ready to review'
                  : `${selectedDateJobOrders.length} job orders are ready to review`
              }
            />
          </section>
        </>
      ) : !activeJobOrder || isQueueStageVisible ? (
        <section className="ops-summary-grid">
          {isTechnician ? (
            <SummaryTile
              icon={ClipboardList}
              label={workbenchScope === 'history' ? 'Assigned History' : 'Assigned Queue'}
              value={activeJobOrder ? 'Loaded' : 'Awaiting load'}
              sub={
                activeJobOrder
                  ? `Job order ${formatJobOrderReference(activeJobOrder)} is ready for technician updates`
                  : workbenchScope === 'history'
                    ? 'Choose one of your finalized or cancelled assigned job orders to review'
                    : 'Choose one of your assigned job orders to begin'
              }
            />
          ) : (
            <SummaryTile
              icon={ClipboardList}
              label={workbenchScope === 'history' ? 'Job Order History' : 'Booking Handoff Queue'}
              value={
                workbenchScope === 'history'
                  ? monthJobOrders.length
                  : queueMode === 'handoff_create'
                    ? 'Ready to create'
                    : handoffCandidates.length
              }
              sub={
                workbenchScope === 'history'
                  ? 'Finalized and cancelled work stays here instead of the live workshop queue.'
                  : queueMode === 'handoff_create'
                    ? 'A handoff-ready booking is selected and can now become the first job order for this date.'
                  : handoffState.status === 'handoff_empty'
                    ? 'No confirmed booking source is ready today'
                    : 'Ready for job-order handoff'
              }
            />
          )}
          <SummaryTile
            icon={Wrench}
            label="Active Phase"
            value={
              activeJobOrder
                ? formatStatusLabel(executionPhase)
                : queueMode === 'handoff_create'
                  ? 'Create first job order'
                  : 'Awaiting load'
            }
            sub={
              activeJobOrder
                ? `Current status: ${formatStatusLabel(activeJobOrder.status)}`
                : queueMode === 'handoff_create'
                  ? 'No job order exists yet for this date, but the booking handoff is ready to convert.'
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
                    ? queueMode === 'handoff_create'
                      ? 'Ready to create'
                      : 'Ready to assign'
                    : 'Awaiting source'
            }
            sub={
              isTechnician
                ? activeJobOrder
                  ? canAppendProgress
                    ? 'You can append workshop progress entries to this job order.'
                    : 'Only service advisers or super admins can append progress for this job order.'
                  : 'Load a job order to confirm assignment access.'
                : activeJobOrder
                  ? activeJobOrder.assignedTechnicianIds.join(', ') || 'No technician assigned'
                  : selectedCandidate
                    ? queueMode === 'handoff_create'
                      ? `${selectedCandidate.serviceSummary} is ready to become the first job order on this date.`
                      : selectedCandidate.serviceSummary
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
        <section className="hidden rounded-[20px] border border-surface-border bg-surface-card/90 px-4 py-3 shadow-[0_12px_24px_rgba(0,0,0,0.14)] backdrop-blur md:block">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-ink-secondary">
              <span className="badge badge-gray">Queue collapsed</span>
              <span>
                <span className="font-semibold text-ink-primary">{formatJobOrderReference(activeJobOrder)}</span>{' '}
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
      ))}

      {!workspaceOnly && isQueueStageVisible && workbenchScope === 'active' ? (
      !isTechnician ? (
        <div className="space-y-3">
          <StaffWorkQueue
            queueType="job_order"
            accessToken={user?.accessToken}
            title="Work Assignment"
            description="Start work to receive the next urgent handoff or active job automatically."
            onOpenWork={openQueueItem}
            selectedEntityId={activeJobOrder?.id || selectedBookingId}
          />
          {!showScheduleTools ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowScheduleTools(true)}
                className="ops-action-secondary"
              >
                <ClipboardList size={14} />
                Browse schedule and manual lookup
              </button>
            </div>
          ) : null}
        </div>
      ) : null
      ) : null}

      {isQueueStageVisible && (isTechnician || showScheduleTools) ? (
      <section id="job-order-queue-panel" className="ops-panel scroll-mt-48">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="card-title">
              {workbenchScope === 'history' ? 'Job Order History' : 'Job Order Queue'}
            </p>
            <p className="mt-1 text-sm leading-6 text-ink-secondary">
              {workbenchScope === 'history'
                ? 'Browse finalized and cancelled job orders by date, then load one when you need its full service record.'
                : queueMode === 'handoff_create' && !isTechnician
                  ? 'This date has a handoff-ready booking and no created job order yet, so the workspace is focused on creating the first job order.'
                  : 'Focus on the live execution queue first, then stay on one loaded record while you work through the guided stages below.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`badge ${workbenchScope === 'history' ? 'badge-blue' : 'badge-orange'}`}>
              {workbenchScope === 'history'
                ? 'Archive'
                : queueMode === 'handoff_create' && !isTechnician
                  ? 'Handoff create mode'
                  : 'Live queue'}
            </span>
            <span className="badge badge-gray">
              {workbenchScope === 'history'
                ? `${selectedDateJobOrders.length} record${selectedDateJobOrders.length === 1 ? '' : 's'} on this date`
                : isTechnician
                ? `${selectedDateJobOrders.length} assigned on this date`
                : queueMode === 'handoff_create'
                  ? `${handoffCandidates.length} ready booking source${handoffCandidates.length === 1 ? '' : 's'}`
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
                  {formatJobOrderReference(activeJobOrder)} is active in the workspace. Use Queue again whenever you need to switch records or create a new job order from booking handoff.
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
                  onChange={(event) => {
                    hasManuallySelectedDateRef.current = true
                    setSelectedDate(event.target.value || toDateKey())
                  }}
                  className="input"
                />
              </label>

              <div className="space-y-3">
                {queueMode === 'handoff_create' && !isTechnician ? (
                  <>
                    <div className="rounded-xl border border-brand-orange/30 bg-brand-orange/10 px-4 py-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-ink-primary">Queue mode: booking handoff creation</p>
                          <p className="mt-1 text-sm text-ink-secondary">
                            No job order exists yet for {formatDate(selectedDate)}. This workspace has switched into create-first mode for the selected booking handoff.
                          </p>
                        </div>
                        <span className="badge badge-orange">Create first job order</span>
                      </div>
                    </div>
                    {handoffCandidates.length > 1 ? (
                      <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-bold text-ink-primary">Choose Booking Handoff Source</p>
                            <p className="text-xs text-ink-muted mt-1">
                              More than one booking is ready for this date. Select the exact source before creating the first job order.
                            </p>
                          </div>
                          <span className="badge badge-gray">{handoffCandidates.length} sources</span>
                        </div>

                        <div className="space-y-3 mt-4">
                          {handoffCandidates.map((candidate) => {
                            const isSelected = candidate.bookingId === selectedBookingId
                            return (
                              <button
                                key={candidate.bookingId}
                                type="button"
                                onClick={() => handleSelectHandoffCandidate(candidate)}
                                className={`w-full text-left rounded-xl border px-4 py-4 transition ${
                                  isSelected
                                    ? 'border-brand-orange/45 bg-brand-orange/10'
                                    : 'border-surface-border bg-surface-raised hover:border-brand-orange/35'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-mono text-xs font-bold tracking-wide text-brand-orange">
                                      {formatBookingReference(candidate)}
                                    </p>
                                    <p className="text-sm font-semibold text-ink-primary mt-1">
                                      {candidate.serviceSummary}
                                    </p>
                                    <p className="text-xs text-ink-muted mt-2">{candidate.customerLabel}</p>
                                    <p className="text-xs text-ink-muted mt-1">{candidate.vehicleLabel}</p>
                                  </div>
                                  <span className={isSelected ? 'badge badge-orange' : 'badge badge-green'}>
                                    {isSelected ? 'Selected source' : 'Confirmed source'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-ink-muted mt-3">
                                  {formatDate(candidate.scheduledDate)} | {candidate.timeSlotLabel}
                                </p>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ) : null}
                    {renderBookingCreateWorkspace({ mode: 'primary' })}
                    {monthJobOrders.length > 0 ? (
                      <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-ink-primary">Existing job orders elsewhere this month</p>
                            <p className="mt-1 text-sm text-ink-secondary">
                              This date has no created job order yet. You can still load another record from {selectedMonth} if needed.
                            </p>
                          </div>
                          <span className="badge badge-gray">{monthJobOrders.length} in month</span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] mt-4">
                          <label>
                            <span className="label">Other job orders this month</span>
                            <select
                              value={manualJobOrderId}
                              onChange={(event) => setManualJobOrderId(event.target.value)}
                              className="select"
                            >
                              <option value="">Choose a job order from this month</option>
                              {monthJobOrders.map((jobOrder) => (
                                <option key={jobOrder.id} value={jobOrder.id}>
                                  {formatJobOrderReference(jobOrder)} - {formatDate(jobOrder.workDate)} - {formatStatusLabel(jobOrder.status)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button
                            onClick={handleLoadJobOrder}
                            className="ops-action-secondary sm:min-w-[168px] sm:self-end"
                            disabled={!manualJobOrderId}
                          >
                            <RefreshCw size={14} />
                            Load Other Job Order
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
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
                                {formatJobOrderReference(jobOrder)} - {formatStatusLabel(jobOrder.status)} - {formatDate(jobOrder.workDate)}
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
                                  {formatJobOrderReference(jobOrder)} - {formatDate(jobOrder.workDate)} - {formatStatusLabel(jobOrder.status)}
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
                      {workbenchScope === 'history' ? <FileStack size={14} /> : <RefreshCw size={14} />}
                      {workbenchScope === 'history' ? 'View record' : 'Load Job Order'}
                    </button>

                    {detailState.message ? (
                      <div className={`sm:col-span-2 ${detailStateClassName}`}>{detailState.message}</div>
                    ) : (
                      <p className="sm:col-span-2 text-[11px] text-ink-muted">
                        {isTechnician
                          ? 'Choose an assigned job order before updating it.'
                          : workbenchScope === 'history'
                            ? 'History mode keeps completed work out of the live queue.'
                            : handoffCandidates.length > 0
                              ? 'You can load an existing job order here or create a new one from the booking handoff sources below.'
                              : 'Use the selector to load a known live record.'}
                      </p>
                    )}

                    {!isTechnician &&
                    workbenchScope === 'active' &&
                    selectedDateJobOrders.length > 0 &&
                    handoffCandidates.length > 0 ? (
                      <div className="sm:col-span-2 rounded-xl border border-surface-border bg-surface-card px-4 py-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-ink-primary">Choose the exact source for this shared queue date</p>
                            <p className="mt-1 text-sm text-ink-secondary">
                              {formatDate(selectedDate)} contains both an existing job order and a fresh booking handoff. Load the JO from the lookup above, or use the selected booking handoff below to create the next record.
                            </p>
                          </div>
                          <span className="badge badge-orange">Mixed source date</span>
                        </div>
                        <div className="mt-4 grid gap-3 lg:grid-cols-2">
                          <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Existing job order selection</p>
                            <p className="mt-2 text-sm text-ink-primary">
                              {manualJobOrderId
                                ? `${formatJobOrderReference({ id: manualJobOrderId, workDate: selectedDate })} is selected in the lookup above.`
                                : 'Choose an existing JO in the lookup above before loading it into the control center.'}
                            </p>
                          </div>
                          <div className="rounded-xl border border-brand-orange/20 bg-brand-orange/10 px-4 py-3">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-brand-orange">Booking handoff selection</p>
                            <p className="mt-2 text-sm text-ink-primary">
                              {selectedCandidate
                                ? `${formatBookingReference(selectedCandidate)} is selected as the next create-from-handoff source.`
                                : 'Choose the handoff source below before creating the next job order for this same date.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {!isTechnician && workbenchScope === 'active' && handoffCandidates.length > 0 ? (
                      <div className="sm:col-span-2 rounded-xl border border-brand-orange/30 bg-brand-orange/10 px-4 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-bold text-ink-primary">Booking Handoff Sources</p>
                            <p className="text-xs text-ink-muted mt-1">
                              This date already has a job order, but these confirmed booking handoffs can still create the next job order from the queue.
                            </p>
                          </div>
                          <span className="badge badge-orange">Create from handoff</span>
                        </div>

                        {handoffState.message ? (
                          <div className={`mt-4 ${handoffStateClassName}`}>{handoffState.message}</div>
                        ) : null}

                        <div className="space-y-3 mt-4">
                          {handoffCandidates.map((candidate) => {
                            const isSelected = candidate.bookingId === selectedBookingId
                            return (
                              <button
                                key={candidate.bookingId}
                                type="button"
                                onClick={() => handleSelectHandoffCandidate(candidate)}
                                className={`w-full text-left rounded-xl border px-4 py-4 transition ${
                                  isSelected
                                    ? 'border-brand-orange/45 bg-surface-card'
                                    : 'border-brand-orange/20 bg-surface-raised hover:border-brand-orange/45'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-mono text-xs font-bold tracking-wide text-brand-orange">
                                      {formatBookingReference(candidate)}
                                    </p>
                                    <p className="text-sm font-semibold text-ink-primary mt-1">
                                      {candidate.serviceSummary}
                                    </p>
                                    <p className="text-xs text-ink-muted mt-2">{candidate.customerLabel}</p>
                                    <p className="text-xs text-ink-muted mt-1">{candidate.vehicleLabel}</p>
                                  </div>
                                  <span className={isSelected ? 'badge badge-orange' : 'badge badge-green'}>
                                    {isSelected ? 'Selected source' : 'Confirmed source'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-ink-muted mt-3">
                                  {formatDate(candidate.scheduledDate)} | {candidate.timeSlotLabel}
                                </p>
                              </button>
                            )
                          })}
                        </div>

                        {renderBookingCreateWorkspace({ mode: 'secondary' })}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="lg:col-span-2 border-t border-surface-border pt-4">
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
                          onClick={() => {
                            hasManuallySelectedDateRef.current = true
                            setSelectedDate(entry.date)
                          }}
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

            {workbenchScope === 'active' ? (
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
                      : queueMode === 'handoff_create'
                        ? 'This selected booking is now the primary action above. Create the first job order there, then the normal live queue will take over.'
                        : handoffCandidates.length > 0
                          ? 'Confirmed bookings on this date are ready for job-order creation and execution follow-through.'
                          : 'No confirmed or workshop-handoff bookings are queued for the selected date yet.'}
                  </p>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </section>
      ) : null}

      <section className="space-y-4">
        {activeJobOrder ? (
          <>
            <div
              className="border border-surface-border bg-surface-card/95 px-3 py-2 shadow-[0_12px_28px_rgba(0,0,0,0.18)] backdrop-blur"
              data-testid="job-order-command-bar"
            >
              <div className="flex min-h-[64px] items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="truncate text-base font-semibold text-ink-primary">
                      {formatJobOrderReference(activeJobOrder)}
                    </p>
                    <StatusBadge status={activeJobOrder.status} />
                    {!isTechnician ? (
                      <span className={`badge ${hasMatchingJobOrderClaim ? 'badge-green' : 'badge-gray'}`}>
                        {hasMatchingJobOrderClaim ? 'Assigned to you' : 'Unassigned here'}
                      </span>
                    ) : null}
                    {hasUnsavedProgressWork ? <span className="badge badge-orange">Unsaved changes</span> : null}
                  </div>
                  <p className="mt-1 truncate text-xs text-ink-secondary">
                    {WORKBENCH_STAGE_META[currentControlCenterStage]?.label ?? formatStatusLabel(currentControlCenterStage)}
                    {' - '}
                    {activeSourceCandidate?.vehicleLabel ?? activeJobOrder.vehicleLabel ?? 'Unknown vehicle'}
                  </p>
                </div>

                <div className="hidden shrink-0 items-center gap-2 md:flex">
                  <button
                    type="button"
                    onClick={() => openControlDrawer('my_work')}
                    className="ops-action-secondary"
                  >
                    <Users size={15} />
                    My Work
                  </button>
                  <button
                    type="button"
                    onClick={() => openControlDrawer('overview')}
                    className="ops-action-secondary"
                  >
                    <PanelRightOpen size={15} />
                    Overview
                  </button>
                  <button
                    type="button"
                    onClick={handleControlCenterPrimaryAction}
                    className="ops-action-primary hidden xl:inline-flex"
                  >
                    {hasUnsavedProgressWork && currentControlCenterStage === 'progress' ? (
                      <Save size={15} />
                    ) : (
                      <ChevronRight size={15} />
                    )}
                    {controlCenterPrimaryLabel}
                  </button>
                </div>

                <div className="flex shrink-0 items-center gap-2 md:hidden">
                  <button
                    type="button"
                    onClick={() => openControlDrawer('my_work')}
                    className="ops-action-secondary h-10 w-10 px-0"
                    aria-label="Open My Work"
                    title="My Work"
                  >
                    <Users size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openControlDrawer('overview')}
                    className="ops-action-secondary h-10 w-10 px-0"
                    aria-label="Open workflow overview"
                    title="Workflow overview"
                  >
                    <PanelRightOpen size={16} />
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={handleControlCenterPrimaryAction}
                className="ops-action-primary mt-2 w-full md:hidden"
              >
                {hasUnsavedProgressWork && currentControlCenterStage === 'progress' ? (
                  <Save size={15} />
                ) : (
                  <ChevronRight size={15} />
                )}
                {controlCenterPrimaryLabel}
              </button>
            </div>

            {!isTechnician && !hasMatchingJobOrderClaim ? (
              <div className="flex flex-col gap-3 border border-surface-border bg-surface-raised px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-ink-secondary">
                  {claimState.message || 'Claim this Job Order before making workflow changes.'}
                </p>
                {canTakeActiveJobOrder ? (
                  <button
                    type="button"
                    onClick={handleTakeThisJob}
                    disabled={claimState.status === 'loading'}
                    className="ops-action-primary shrink-0"
                  >
                    {claimState.status === 'loading' ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <ClipboardList size={14} />
                    )}
                    Take this job
                  </button>
                ) : null}
              </div>
            ) : null}

            {controlDrawerOpen ? (
              <>
                <button
                  type="button"
                  className="fixed inset-x-0 bottom-0 top-16 z-40 bg-black/60"
                  aria-label="Close control drawer"
                  onClick={() => setControlDrawerOpen(false)}
                />
                <aside
                  className="fixed inset-x-0 bottom-0 top-16 z-50 flex flex-col border border-surface-border bg-surface-card shadow-2xl md:left-auto md:w-[min(520px,calc(100vw-2rem))]"
                  aria-label="Job order control drawer"
                  aria-modal="true"
                  role="dialog"
                >
                  <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink-primary">Job order control</p>
                      <p className="mt-1 truncate text-xs text-ink-muted">{formatJobOrderReference(activeJobOrder)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setControlDrawerOpen(false)}
                      className="ops-action-secondary h-10 w-10 px-0"
                      aria-label="Close control drawer"
                      title="Close"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 border-b border-surface-border p-2">
                    {[
                      { key: 'overview', label: 'Workflow', icon: ListChecks },
                      { key: 'my_work', label: 'My Work', icon: Users },
                      { key: 'context', label: 'Context', icon: ClipboardList },
                    ].map((tab) => {
                      const Icon = tab.icon

                      return (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setControlDrawerTab(tab.key)}
                          className={`flex items-center justify-center gap-2 border-b-2 px-2 py-3 text-sm font-medium transition ${
                            controlDrawerTab === tab.key
                              ? 'border-brand-orange text-ink-primary'
                              : 'border-transparent text-ink-muted hover:text-ink-primary'
                          }`}
                        >
                          <Icon size={15} />
                          {tab.label}
                        </button>
                      )
                    })}
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    {controlDrawerTab === 'overview' ? (
                      <div className="space-y-4">
                        <div className={`border px-4 py-3 ${controlCenterNextAction.toneClass}`}>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-80">
                            Next - {controlCenterNextAction.stepLabel}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-ink-primary">{controlCenterNextAction.title}</p>
                          <p className="mt-2 text-xs leading-5 opacity-90">{controlCenterNextAction.body}</p>
                        </div>
                        <div className="space-y-2">
                          {controlCenterSteps.map((step, index) => {
                            const isActiveStep =
                              step.workbenchStage === currentControlCenterStage ||
                              (step.key === 'qa_audit' && activeJobOrder.status === 'ready_for_qa')
                            const rowTone =
                              step.state === 'done'
                                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-100'
                                : step.state === 'blocked'
                                  ? 'border-red-500/25 bg-red-500/10 text-red-100'
                                  : step.state === 'action_needed' || isActiveStep
                                    ? 'border-brand-orange/25 bg-brand-orange/10 text-amber-100'
                                    : 'border-surface-border bg-surface-raised text-ink-secondary'

                            return (
                              <button
                                key={`drawer-${step.key}`}
                                type="button"
                                disabled={step.state === 'locked'}
                                onClick={() => {
                                  if (step.key === 'qa_audit' && activeJobOrder.status === 'ready_for_qa') {
                                    window.location.assign(`/admin/qa-audit?jobOrderId=${encodeURIComponent(activeJobOrder.id)}`)
                                    return
                                  }

                                  setControlDrawerOpen(false)
                                  navigateToWorkbenchStage(step.workbenchStage)
                                }}
                                className={`flex w-full items-center gap-3 border px-3 py-3 text-left transition ${rowTone}`}
                              >
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current/25 text-[11px] font-semibold">
                                  {step.state === 'done' ? 'OK' : step.state === 'blocked' ? 'X' : step.state === 'action_needed' ? '!' : index + 1}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block text-sm font-medium">{step.label}</span>
                                  <span className="mt-1 block truncate text-xs opacity-80">{step.note}</span>
                                </span>
                                <ChevronRight size={15} className="shrink-0 opacity-70" />
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ) : null}

                    {controlDrawerTab === 'my_work' ? (
                      <div className="space-y-4">
                        <div className="border-b border-surface-border pb-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                            Current assignment
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <p className="min-w-0 flex-1 text-sm font-semibold text-ink-primary">
                              {formatJobOrderReference(activeJobOrder)}
                            </p>
                            <span className="badge badge-green">Assigned to you</span>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-ink-secondary">
                            {activeSourceCandidate?.vehicleLabel ?? activeJobOrder.vehicleLabel ?? 'Vehicle not recorded'}
                          </p>
                          <p className="mt-1 text-xs text-ink-muted">
                            {WORKBENCH_STAGE_META[currentControlCenterStage]?.label ?? formatStatusLabel(currentControlCenterStage)}
                            {activeClaimId ? ' · Claim active' : ''}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setControlDrawerOpen(false)}
                          className="ops-action-primary w-full"
                        >
                          <ChevronRight size={15} />
                          Resume this job
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!confirmDiscardUnsavedWork()) return
                            setControlDrawerOpen(false)
                            navigateToWorkbenchStage('queue')
                          }}
                          className="ops-action-secondary w-full"
                        >
                          <Users size={15} />
                          Open My Work board
                        </button>
                      </div>
                    ) : null}

                    {controlDrawerTab === 'context' ? (
                      <div className="space-y-3">
                        {[
                          ['Customer', activeSourceCandidate?.customerLabel ?? activeJobOrder.customerLabel ?? 'Unknown customer'],
                          ['Vehicle', activeSourceCandidate?.vehicleLabel ?? activeJobOrder.vehicleLabel ?? 'Unknown vehicle'],
                          [
                            'Source',
                            activeJobOrder.sourceType === 'booking'
                              ? `Booking ${formatBookingReference({ scheduledDate: activeJobOrder.workDate, plateNumber: activeJobOrder.plateNumber, bookingReference: activeJobOrder.sourceBookingReference })}`
                              : `Back-job ${normalizeBusinessToken(activeJobOrder.sourceId, 'REWORK')}`,
                          ],
                          ['Service adviser', activeJobOrder.serviceAdviserCode || activeJobOrder.serviceAdviserUserId],
                          ['Assigned team', hasSavedAssignments ? `${activeJobOrder.assignedTechnicianIds.length} saved` : 'No saved assignment'],
                          ['Evidence', `${activeJobOrder.photos.length} attached`],
                          ['Updated', formatDateTime(activeJobOrder.updatedAt)],
                        ].map(([label, value]) => (
                          <div key={label} className="border-b border-surface-border pb-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{label}</p>
                            <p className="mt-1 text-sm text-ink-primary">{value}</p>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            if (!confirmDiscardUnsavedWork()) return
                            setControlDrawerOpen(false)
                            navigateToWorkbenchStage('queue')
                          }}
                          className="ops-action-secondary w-full"
                        >
                          <ClipboardList size={15} />
                          Return to queue
                        </button>
                        <button
                          type="button"
                          onClick={() => handleWorkbenchScopeChange('history')}
                          className="ops-action-secondary w-full"
                        >
                          <FileStack size={15} />
                          Open job history
                        </button>
                      </div>
                    ) : null}
                  </div>
                </aside>
              </>
            ) : null}

          </>
        ) : (
          <section className="ops-panel">
            <div className="empty-panel mt-0">
              {workbenchScope === 'history' ? (
                <FileStack size={28} className="mx-auto mb-3 text-ink-dim" />
              ) : (
                <AlertTriangle size={28} className="mx-auto mb-3 text-ink-dim" />
              )}
              <p className="text-sm font-semibold text-ink-primary">
                {workbenchScope === 'history' ? 'Select a history record' : 'No job order loaded yet'}
              </p>
              <p className="mt-2 text-sm leading-6 text-ink-secondary">
                {workbenchScope === 'history'
                  ? 'Choose a marked date and open a record to review its completed service details.'
                  : isTechnician
                  ? 'Choose one of your assigned job orders to start technician execution updates.'
                  : 'Create a job order from a confirmed or workshop-handoff booking, or choose an existing job order from the selector.'}
              </p>
            </div>
          </section>
        )}
      </section>

      <section className="space-y-4">
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
                    <span className="badge badge-green">Service adviser / admin</span>
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
                            ? 'Use Send to QA only when every service and its evidence are complete.'
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
                        disabled={
                          !activeJobOrder ||
                          !hasMatchingJobOrderClaim ||
                          statusState.status === 'status_update_submitting'
                        }
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
                    !hasMatchingJobOrderClaim ||
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
                  <p className="card-title">{isProgressStageActive ? 'Service Progress' : 'Evidence'}</p>
                  <span className="badge badge-green">Service adviser / admin</span>
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
                  <p className="text-sm font-bold text-ink-primary">Workshop Progress Entry</p>
                  <p className="text-xs text-ink-muted mt-1">
                    Service advisers record the workshop trail and keep customer tracking in sync.
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
                            disabled={
                              !activeJobOrder ||
                              !hasMatchingJobOrderClaim ||
                              statusState.status === 'status_update_submitting'
                            }
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
                  <ServiceWorkItemsPanel
                    items={activeJobOrder?.items}
                    progressEntries={activeJobOrder?.progressEntries}
                    photos={activeJobOrder?.photos}
                    progressDraft={progressDraft}
                    setProgressDraft={setProgressDraft}
                    progressState={progressState}
                    progressStateClassName={progressStateClassName}
                    onSubmit={handleAddProgressEntry}
                    onAddEvidence={handleOpenWorkItemEvidence}
                    canMutate={hasMatchingJobOrderClaim}
                  />
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
                          <optgroup label="Services">
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
                        Choose the matching <span className="font-semibold">service</span> for completion proof. Use <span className="font-semibold">General</span> only for visit-wide photos.
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
                    disabled={
                      !activeJobOrder ||
                      !hasMatchingJobOrderClaim ||
                      photoState.status === 'photo_submitting'
                    }
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
                  Save technician profile coverage for the selected job order before pushing the work forward.
                </p>
                {activeJobOrder ? (
                  <div className="mt-3 space-y-3">
                    <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                        Current assignment
                      </p>
                      <p className="text-sm text-ink-primary mt-1">
                        {activeJobOrder.assignedTechnicianIds.length > 0
                          ? `${activeJobOrder.assignedTechnicianIds.length} technician profile${activeJobOrder.assignedTechnicianIds.length === 1 ? '' : 's'} assigned`
                          : 'No technician profile assigned'}
                      </p>
                      <p className="text-xs text-ink-muted mt-2">
                        Draft job orders may stay unassigned. Assigned and operational job orders require at least one saved technician profile.
                      </p>
                    </div>
                    {Array.isArray(activeJobOrder.assignments) && activeJobOrder.assignments.length > 0 ? (
                      <div className="space-y-2">
                        {activeJobOrder.assignments.map((assignment) => (
                          <div key={assignment.id} className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-ink-primary">
                                  {assignment.technicianName || assignment.technicianCode || 'Assigned technician profile'}
                                </p>
                                <p className="text-xs text-ink-muted mt-1">
                                  {assignment.selectedSpecialty || 'general repair'}
                                  {assignment.technicianCode ? ` · ${assignment.technicianCode}` : ''}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleExportTechnicianChecklist(assignment)}
                                className="ops-action-secondary"
                              >
                                <FileStack size={14} />
                                Checklist PDF
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {canManageAssignments ? (
                      <>
                        <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                          {technicianOptions.length > 0 ? (
                            technicianOptions.map((account) => {
                              const checked = assignmentDraftIds.includes(account.id)

                              return (
                                <div
                                  key={account.id}
                                  className="rounded-lg border border-surface-border bg-surface-raised px-3 py-3 text-sm text-ink-primary"
                                >
                                  <label className="flex items-start gap-3">
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
                                        Technician profile
                                        {account.staffCode ? ` - ${account.staffCode}` : ''}
                                      </span>
                                    </span>
                                  </label>
                                  {checked ? (
                                    <label className="mt-3 block text-xs text-ink-muted">
                                      Specialty for this job order
                                      <select
                                        value={assignmentDraftSpecialties[account.id] || ''}
                                        onChange={(event) =>
                                          setAssignmentDraftSpecialties((current) => ({
                                            ...current,
                                            [account.id]: event.target.value,
                                          }))
                                        }
                                        className="mt-1 select"
                                      >
                                        {(account.specialties ?? []).map((specialty) => (
                                          <option key={`${account.id}-${specialty}`} value={specialty}>
                                            {specialty}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                  ) : null}
                                </div>
                              )
                            })
                          ) : (
                            <div className="rounded-lg border border-surface-border bg-surface-raised px-3 py-3 text-xs text-ink-muted">
                              No active technician profiles are available in the directory yet.
                            </div>
                          )}
                        </div>
                        {assignmentState.message ? <div className={assignmentStateClassName}>{assignmentState.message}</div> : null}
                        <button
                          type="button"
                          onClick={handleSaveAssignments}
                          disabled={
                            !activeJobOrder ||
                            !hasMatchingJobOrderClaim ||
                            assignmentState.status === 'assignment_submitting'
                          }
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
                      {queueMode === 'handoff_create'
                        ? 'Use this list as the source picker for the promoted create workspace above.'
                        : 'Select a confirmed booking when you need to create another job order in the live queue.'}
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
                          onClick={() => handleSelectHandoffCandidate(candidate)}
                          className={`w-full text-left rounded-xl border px-4 py-4 transition ${
                            isSelected
                              ? 'border-brand-orange/45 bg-brand-orange/10'
                              : 'border-surface-border bg-surface-raised hover:border-brand-orange/35'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-mono text-xs font-bold tracking-wide text-brand-orange">
                                {formatBookingReference(candidate)}
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
                ) : queueMode === 'handoff_create' ? (
                  <div className="ops-panel-muted mt-4">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Promoted action</p>
                    <p className="text-sm text-ink-primary mt-1">
                      The selected booking is now driving the top create-first workspace. Change the source here if you want to create the job order from a different handoff.
                    </p>
                  </div>
                ) : (
                  renderBookingCreateWorkspace({ mode: 'secondary' })
                )}
              </div>
            </div>
          </div>
          ) : null}

          {isProgressStageActive ? (
          <div id="job-order-stage-progress" className="ops-panel scroll-mt-28 flex flex-col">
            <div className="order-1 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="card-title">Service Progress</p>
                  <span className="badge badge-green">Service adviser workflow</span>
                </div>
                <p className="text-xs text-ink-muted mt-1">
                  Track each service, blocker, update, and required evidence item.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {role === 'super_admin' ? <span className="badge badge-green">Super admin override access</span> : null}
              </div>
            </div>

            <details className="order-3 mt-4 border-t border-surface-border pt-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink-secondary">
                <span>Customer-facing workshop status</span>
                <span className="badge badge-gray">{formatStatusLabel(workshopStageDraft.stage)}</span>
              </summary>
              <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto] mt-3">
                <label className="text-xs text-ink-muted">
                  Current stage
                  <select
                    value={workshopStageDraft.stage}
                    onChange={(event) =>
                      setWorkshopStageDraft((current) => ({
                        ...current,
                        stage: event.target.value,
                      }))
                    }
                    className="mt-1 select"
                  >
                    <option value="received">Received</option>
                    <option value="diagnosis">Diagnosis</option>
                    <option value="in_repair">In Repair</option>
                    <option value="quality_check">Quality Check</option>
                    <option value="ready">Ready</option>
                  </select>
                </label>
                <label className="text-xs text-ink-muted">
                  Stage note
                  <input
                    type="text"
                    value={workshopStageDraft.note}
                    onChange={(event) =>
                      setWorkshopStageDraft((current) => ({
                        ...current,
                        note: event.target.value,
                      }))
                    }
                    className="mt-1 input"
                    placeholder="Explain what changed in this stage…"
                  />
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    if (!activeJobOrder?.id || !user?.accessToken || !hasMatchingJobOrderClaim) return

                    setWorkshopStageState({ status: 'submitting', message: '' })
                    try {
                      const updatedJobOrder = await updateJobOrderWorkshopStage({
                        jobOrderId: activeJobOrder.id,
                        stage: workshopStageDraft.stage,
                        note: workshopStageDraft.note,
                        expectedUpdatedAt: activeJobOrder.updatedAt,
                        accessToken: user.accessToken,
                        claimId: activeClaimId,
                      })

                      setActiveJobOrder(updatedJobOrder)
                      if (updatedJobOrder.status === 'ready_for_qa') {
                        setActiveClaim(null)
                        setClaimState({
                          status: 'unclaimed',
                          message: 'The Job Order claim was released when work entered QA.',
                        })
                      }
                      setWorkshopStageState({
                        status: 'saved',
                        message: 'Workshop stage saved and the customer-tracking source was refreshed.',
                      })
                    } catch (error) {
                      if (handleWorkClaimFailure(error)) {
                        setWorkshopStageState({
                          status: 'error',
                          message: 'Your Job Order assignment changed or expired. Take this job again before saving.',
                        })
                        return
                      }
                      setWorkshopStageState({
                        status: 'error',
                        message: error?.message || 'Unable to save the workshop stage right now.',
                      })
                    }
                  }}
                  disabled={
                    !hasMatchingJobOrderClaim ||
                    workshopStageState.status === 'submitting'
                  }
                  className="ops-action-secondary self-end"
                >
                  {workshopStageState.status === 'submitting' ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                  Save Workshop Stage
                </button>
              </div>
              {workshopStageState.message ? (
                <div className={`mt-3 ${workshopStageState.status === 'error' ? 'status-message status-message-danger' : 'status-message status-message-success'}`}>
                  {workshopStageState.message}
                </div>
              ) : null}
            </details>

            <div className="order-2 mt-2">
              <ServiceWorkItemsPanel
                items={activeJobOrder?.items}
                progressEntries={activeJobOrder?.progressEntries}
                photos={activeJobOrder?.photos}
                progressDraft={progressDraft}
                setProgressDraft={setProgressDraft}
                progressState={progressState}
                progressStateClassName={progressStateClassName}
                onSubmit={handleAddProgressEntry}
                onAddEvidence={handleOpenWorkItemEvidence}
                canMutate={hasMatchingJobOrderClaim}
              />
              {activeJobOrder?.progressEntries?.length ? (
                <div className="mt-4 border-t border-surface-border pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-ink-primary">Recent progress</p>
                    <span className="badge badge-gray">{activeJobOrder.progressEntries.length} saved</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {activeJobOrder.progressEntries
                      .slice()
                      .reverse()
                      .slice(0, 3)
                      .map((entry) => (
                        <div key={entry.id} className="border-l-2 border-surface-border pl-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-ink-primary">{formatStatusLabel(entry.entryType)}</span>
                            <span className="text-[11px] text-ink-muted">{formatDateTime(entry.createdAt)}</span>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-ink-secondary">{entry.message}</p>
                        </div>
                      ))}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="order-4">
              <ExecutionStatusPanel
                activeJobOrder={activeJobOrder}
                nextStatuses={nextStatuses}
                isReadyForQaChecklistSatisfied={isReadyForQaChecklistSatisfied}
                statusDraft={statusDraft}
                setStatusDraft={setStatusDraft}
                handleStatusUpdate={handleStatusUpdate}
                statusState={statusState}
                statusStateClassName={statusStateClassName}
                ownerLabel="Service adviser / admin"
                hasActiveClaim={hasMatchingJobOrderClaim}
              />
            </div>
          </div>
          ) : null}

          {isEvidenceStageActive ? (
          <div id="job-order-stage-evidence" className="ops-panel scroll-mt-48">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="card-title">Evidence</p>
                  <span className="badge badge-green">Service adviser / admin</span>
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
                      <optgroup label="Services">
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
                    Choose the matching <span className="font-semibold">service</span> for completion proof. Use <span className="font-semibold">General</span> only for visit-wide photos.
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
                disabled={
                  !activeJobOrder ||
                  !hasMatchingJobOrderClaim ||
                  photoState.status === 'photo_submitting'
                }
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

          {isQaStageActive ? (
          <div id="job-order-stage-qa" className="ops-panel scroll-mt-24">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="card-title">QA handoff</p>
                  <span className={qaClearedForFinalization ? 'badge badge-green' : 'badge badge-blue'}>
                    {qaClearedForFinalization ? 'QA passed' : 'Awaiting independent review'}
                  </span>
                </div>
                <p className="mt-2 text-sm text-ink-secondary">
                  {qaClearedForFinalization
                    ? 'The independent QA verdict passed. Continue to finalization for invoice preparation.'
                    : 'Workshop work is complete and this job is in the QA queue. Finalization unlocks after a passing verdict.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (qaClearedForFinalization) {
                    navigateToWorkbenchStage('finalize')
                    return
                  }
                  window.location.assign(`/admin/qa-audit?jobOrderId=${encodeURIComponent(activeJobOrder.id)}`)
                }}
                className="ops-action-primary shrink-0"
              >
                <ShieldCheck size={15} />
                {qaClearedForFinalization ? 'Continue to finalization' : 'Open QA Audit'}
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
                      !canFinalizeClaimedWork ||
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
