'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileStack,
  ReceiptText,
  RefreshCw,
} from 'lucide-react'

import { getDailySchedule } from '@/lib/bookingStaffClient'
import { ApiError, listTechnicianProfiles } from '@/lib/authClient'
import { useUser } from '@/lib/userContext'
import {
  claimMatchesWork,
  getJobOrderClaimConflictMessage,
  isStaffWorkClaimError,
  recoverMatchingJobOrderClaim,
  toJobOrderClaimSummary,
} from '@/lib/jobOrderClaimState.mjs'
import { formatServiceItemName } from '@/lib/jobOrderServiceProgressModel.mjs'
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
  normalizeJobOrderInvoicePaymentMethod,
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
  isQaClearedForFinalization,
} from '@/lib/jobOrderWorkspaceStage.mjs'
import StaffWorkQueue from '@/components/StaffWorkQueue'
import {
  BlockingState,
  ExecutionStatusPanel,
  StatusBadge,
} from './JobOrderWorkbenchSummary'
import JobOrderServiceItemsPanel from './JobOrderServiceItemsPanel'
import JobOrderAssignmentsPanel from './JobOrderAssignmentsPanel'
import JobOrderEvidencePanel from './JobOrderEvidencePanel'
import JobOrderFinalizationPanel from './JobOrderFinalizationPanel'
import JobOrderBookingCreatePanel from './JobOrderBookingCreatePanel'
import JobOrderControlDrawer from './JobOrderControlDrawer'
import JobOrderCommandBar from './JobOrderCommandBar'
import JobOrderWorkshopStagePanel from './JobOrderWorkshopStagePanel'
import JobOrderWorkspaceOverview from './JobOrderWorkspaceOverview'
import {
  JobOrderHandoffCandidateList,
  JobOrderQueueDateStrip,
} from './JobOrderQueueControls'
import useJobOrderQueueIndex from './useJobOrderQueueIndex'
import { createWorkshopStageDraft } from './jobOrderWorkshopStageView.mjs'
import {
  assignmentRequiredStatuses,
  buildJobOrderNextAction,
  buildSuggestedFinalizationSummary,
  CONTROL_CENTER_STEP_ORDER,
  emptyCreateDraft,
  emptyPhotoDraft,
  emptyProgressDraft,
  formatBookingReference,
  formatDate,
  formatDateTime,
  formatDateTimeInputValue,
  formatJobOrderReference,
  formatStatusLabel,
  getControlCenterRoleMeta,
  getSuggestedControlCenterStage,
  initialAssignmentState,
  initialCreateState,
  initialFinalizeState,
  initialPaymentState,
  initialPhotoState,
  initialProgressState,
  initialReadState,
  initialStatusState,
  toDateKey,
  WORKBENCH_STAGE_META,
  WORKSHOP_STATUS_ACTION_LABELS,
} from './jobOrderWorkbenchViewModel.mjs'
import { WORKSPACE_INFORMATION_ARCHITECTURE } from './workspaceInformationArchitecture.mjs'
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
  const [claimOwnerName, setClaimOwnerName] = useState('')
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
  const [workshopStageDraft, setWorkshopStageDraft] = useState(() =>
    createWorkshopStageDraft(),
  )
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
  const {
    jobOrderSummaryState,
    jobOrderCalendarState,
    refreshJobOrderQueueIndex,
  } = useJobOrderQueueIndex({
    accessToken: user?.accessToken,
    canUseWorkbench,
    selectedMonth,
    workbenchScope,
  })
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

  const refreshWorkbenchQueue = useCallback(() => {
    void refreshJobOrderQueueIndex()
    void loadBookingHandoffs()
  }, [loadBookingHandoffs, refreshJobOrderQueueIndex])

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
    setClaimOwnerName('')
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
      setClaimOwnerName('')
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
    setWorkshopStageDraft(createWorkshopStageDraft(activeJobOrder.currentWorkshopStage))
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
      paymentMethod: normalizeJobOrderInvoicePaymentMethod(activeJobOrder.invoiceRecord?.paymentMethod) ?? 'cash',
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
      setClaimOwnerName('')
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
        view: 'team',
        search: jobOrderId,
        limit: 25,
      })
      const nextClaim = recoverMatchingJobOrderClaim(result, jobOrderId)
      const matchingItem = result.items?.find(
        (item) => item.entityType === 'job_order' && item.entityId === jobOrderId,
      )
      setClaimOwnerName(
        nextClaim?.ownerName || (!nextClaim ? matchingItem?.claim?.ownerName : '') || '',
      )

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
      setClaimOwnerName('')
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
    setClaimOwnerName(nextClaim?.ownerName || item.claim?.ownerName || '')
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
      setClaimOwnerName('')
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
    setClaimOwnerName('')
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
      setClaimOwnerName('')
      setClaimState({
        status: 'unclaimed',
        message: 'The booking handoff is complete. Claim this Job Order before editing it.',
      })
      setSelectedDate(jobOrder.workDate ?? selectedDate)
      setManualJobOrderId(jobOrder.id)
      setWorkbenchStage(getSuggestedControlCenterStage(jobOrder, 'overview'))
      void refreshJobOrderQueueIndex()
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
      void refreshJobOrderQueueIndex()
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
        setClaimOwnerName('')
        setClaimState({
          status: 'unclaimed',
          message: updatedJobOrder.status === 'ready_for_qa'
            ? 'The Job Order claim was released when work entered QA.'
            : 'The Job Order claim was released when the work was cancelled.',
        })
      }
      setManualJobOrderId(updatedJobOrder.id)
      setWorkbenchStage(getSuggestedControlCenterStage(updatedJobOrder, 'overview'))
      void refreshJobOrderQueueIndex()
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

  const handleWorkshopStageUpdate = async () => {
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
      setClaimOwnerName('')

      setActiveJobOrder(updatedJobOrder)
      if (updatedJobOrder.status === 'ready_for_qa') {
        setActiveClaim(null)
        setClaimOwnerName('')
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
        setWorkshopStageDraft(
          createWorkshopStageDraft(updatedJobOrder.currentWorkshopStage ?? 'in_repair'),
        )
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
      setClaimOwnerName('')
      setClaimState({
        status: 'unclaimed',
        message: 'Finalization completed and released this Job Order assignment.',
      })
      setWorkbenchStage(getSuggestedControlCenterStage(updatedJobOrder, 'overview'))
      void refreshJobOrderQueueIndex()
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
      void refreshJobOrderQueueIndex()
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
    void refreshJobOrderQueueIndex()

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
      void refreshJobOrderQueueIndex()

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
      void refreshJobOrderQueueIndex()
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
      anchor.download = `${activeJobOrder.invoiceRecord.invoiceReference || 'invoice-reference-unavailable'}.pdf`
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

  const renderBookingCreateWorkspace = ({ mode = 'primary' } = {}) => (
    <JobOrderBookingCreatePanel
      mode={mode}
      selectedCandidate={selectedCandidate}
      staffCode={user?.staffCode}
      createDraft={createDraft}
      setCreateDraft={setCreateDraft}
      onCreateItemChange={handleCreateItemChange}
      technicianOptions={technicianOptions}
      staffDirectoryMessage={staffDirectoryState.message}
      createState={createState}
      createStateClassName={createStateClassName}
      hasMatchingBookingHandoffClaim={hasMatchingBookingHandoffClaim}
      onCreate={handleCreateJobOrder}
    />
  )

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
      <JobOrderWorkspaceOverview
        workspaceOnly={workspaceOnly}
        activeJobOrder={activeJobOrder}
        selectedDate={selectedDate}
        workbenchScope={workbenchScope}
        onScopeChange={handleWorkbenchScopeChange}
        isTechnician={isTechnician}
        onRefresh={refreshWorkbenchQueue}
        monthCount={monthJobOrders.length}
        markedDateCount={markedWorkbenchDates.length}
        selectedDateCount={selectedDateJobOrders.length}
        isQueueStageVisible={isQueueStageVisible}
        queueMode={queueMode}
        handoffCount={handoffCandidates.length}
        handoffStatus={handoffState.status}
        executionPhase={executionPhase}
        selectedCandidate={selectedCandidate}
        canAppendProgress={canAppendProgress}
        nextAction={controlCenterNextAction}
        onOpenQueue={() => navigateToWorkbenchStage('queue')}
      />

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

                        <JobOrderHandoffCandidateList
                          candidates={handoffCandidates}
                          selectedBookingId={selectedBookingId}
                          onSelect={handleSelectHandoffCandidate}
                        />
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

                        <JobOrderHandoffCandidateList
                          candidates={handoffCandidates}
                          selectedBookingId={selectedBookingId}
                          onSelect={handleSelectHandoffCandidate}
                          selectedSurface="card"
                        />

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
                  <JobOrderQueueDateStrip
                    entries={markedWorkbenchDates}
                    selectedDate={selectedDate}
                    selectedMonth={selectedMonth}
                    workbenchScope={workbenchScope}
                    onSelectDate={(date) => {
                      hasManuallySelectedDateRef.current = true
                      setSelectedDate(date)
                    }}
                  />
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
            <JobOrderCommandBar
              jobOrderReference={formatJobOrderReference(activeJobOrder)}
              status={activeJobOrder.status}
              isTechnician={isTechnician}
              hasMatchingClaim={hasMatchingJobOrderClaim}
              claimOwnerName={claimOwnerName}
              hasUnsavedProgressWork={hasUnsavedProgressWork}
              stageLabel={WORKBENCH_STAGE_META[currentControlCenterStage]?.label ?? formatStatusLabel(currentControlCenterStage)}
              currentStage={currentControlCenterStage}
              vehicleLabel={activeSourceCandidate?.vehicleLabel ?? activeJobOrder.vehicleLabel ?? 'Unknown vehicle'}
              primaryLabel={controlCenterPrimaryLabel}
              onOpenMyWork={() => openControlDrawer('my_work')}
              onOpenOverview={() => openControlDrawer('overview')}
              onPrimaryAction={handleControlCenterPrimaryAction}
            />

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

            <JobOrderControlDrawer
              open={controlDrawerOpen}
              activeTab={controlDrawerTab}
              onTabChange={setControlDrawerTab}
              activeJobOrder={activeJobOrder}
              activeSourceCandidate={activeSourceCandidate}
              currentStage={currentControlCenterStage}
              activeClaimId={activeClaimId}
              hasSavedAssignments={hasSavedAssignments}
              nextAction={controlCenterNextAction}
              steps={controlCenterSteps}
              onClose={() => setControlDrawerOpen(false)}
              onNavigateStage={(stage) => {
                setControlDrawerOpen(false)
                navigateToWorkbenchStage(stage)
              }}
              onOpenQaAudit={() => {
                window.location.assign(
                  `/admin/qa-audit?jobOrderId=${encodeURIComponent(activeJobOrder.id)}`,
                )
              }}
              onOpenMyWork={() => {
                if (!confirmDiscardUnsavedWork()) return
                setControlDrawerOpen(false)
                navigateToWorkbenchStage('queue')
              }}
              onOpenHistory={() => handleWorkbenchScopeChange('history')}
            />

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
                  <p className="card-title">
                    {isProgressStageActive
                      ? WORKSPACE_INFORMATION_ARCHITECTURE.jobOrders.sections.progress
                      : 'Evidence'}
                  </p>
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
                  <JobOrderServiceItemsPanel
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
            <JobOrderAssignmentsPanel
              activeJobOrder={activeJobOrder}
              assignmentDraftIds={assignmentDraftIds}
              assignmentDraftSpecialties={assignmentDraftSpecialties}
              assignmentState={assignmentState}
              assignmentStateClassName={assignmentStateClassName}
              canManageAssignments={canManageAssignments}
              formatBookingReference={formatBookingReference}
              formatDate={formatDate}
              handleAssignmentToggle={handleAssignmentToggle}
              handleExportTechnicianChecklist={handleExportTechnicianChecklist}
              handleSaveAssignments={handleSaveAssignments}
              handleSelectHandoffCandidate={handleSelectHandoffCandidate}
              handoffCandidates={handoffCandidates}
              handoffState={handoffState}
              handoffStateClassName={handoffStateClassName}
              hasMatchingJobOrderClaim={hasMatchingJobOrderClaim}
              queueMode={queueMode}
              renderBookingCreateWorkspace={renderBookingCreateWorkspace}
              selectedBookingId={selectedBookingId}
              selectedCandidate={selectedCandidate}
              selectedDate={selectedDate}
              setAssignmentDraftSpecialties={setAssignmentDraftSpecialties}
              staffDirectoryState={staffDirectoryState}
              technicianOptions={technicianOptions}
            />
          ) : null}

          {isProgressStageActive ? (
          <div id="job-order-stage-progress" className="ops-panel scroll-mt-28 flex flex-col">
            <div className="order-1 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="card-title">
                    {WORKSPACE_INFORMATION_ARCHITECTURE.jobOrders.sections.progress}
                  </p>
                  <span className="badge badge-green">Service adviser workflow</span>
                </div>
                <p className="text-xs text-ink-muted mt-1">
                  {WORKSPACE_INFORMATION_ARCHITECTURE.jobOrders.progressDescription}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {role === 'super_admin' ? <span className="badge badge-green">Super admin override access</span> : null}
              </div>
            </div>

            <JobOrderWorkshopStagePanel
              draft={workshopStageDraft}
              setDraft={setWorkshopStageDraft}
              state={workshopStageState}
              canSave={hasMatchingJobOrderClaim}
              onSave={handleWorkshopStageUpdate}
            />

            <div className="order-2 mt-2">
              <JobOrderServiceItemsPanel
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
            <JobOrderEvidencePanel
              activeJobOrder={activeJobOrder}
              role={role}
              photoInputResetKey={photoInputResetKey}
              photoDraft={photoDraft}
              setPhotoDraft={setPhotoDraft}
              selectedCompletedItemsMissingPhotoEvidence={selectedCompletedItemsMissingPhotoEvidence}
              recommendedPhotoTargetOption={recommendedPhotoTargetOption}
              isPhotoTargetRecommended={isPhotoTargetRecommended}
              photoTargetOptions={photoTargetOptions}
              workItemPhotoTargetOptions={workItemPhotoTargetOptions}
              progressPhotoTargetOptions={progressPhotoTargetOptions}
              photoState={photoState}
              photoStateClassName={photoStateClassName}
              handleAddPhotoEvidence={handleAddPhotoEvidence}
              hasMatchingJobOrderClaim={hasMatchingJobOrderClaim}
            />
          ) : null}

          {isQaStageActive ? (
          <div id="job-order-stage-qa" className="ops-panel scroll-mt-24">
            <div className="flex flex-col gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="card-title">
                    {WORKSPACE_INFORMATION_ARCHITECTURE.jobOrders.sections.qa}
                  </p>
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
              <p className="text-xs text-ink-muted">
                Use the workspace action above to continue. This stage remains read-only while QA owns the review.
              </p>
            </div>
          </div>
          ) : null}

          {isFinalizeStageActive ? (
            <JobOrderFinalizationPanel
              activeJobOrder={activeJobOrder}
              canFinalizeClaimedWork={canFinalizeClaimedWork}
              finalizationBlockers={finalizationBlockers}
              finalizationSuggestedSummary={finalizationSuggestedSummary}
              finalizeDraft={finalizeDraft}
              setFinalizeDraft={setFinalizeDraft}
              finalizeState={finalizeState}
              finalizeStateClassName={finalizeStateClassName}
              paymentDraft={paymentDraft}
              setPaymentDraft={setPaymentDraft}
              paymentState={paymentState}
              paymentStateClassName={paymentStateClassName}
              onFinalize={handleFinalizeJobOrder}
              onRecordManualPayment={handleRecordInvoicePayment}
              onStartOnlineCheckout={handleStartInvoicePaymongoCheckout}
              onRefreshOnlineCheckout={handleRefreshInvoicePaymongoCheckout}
              onExportInvoice={handleExportInvoice}
            />
          ) : null}
        </section>
      )}
      </section>
    </div>
  )
}
