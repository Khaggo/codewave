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
  replaceJobOrderAssignments,
  updateJobOrderStatus,
} from '@/lib/jobOrderWorkbenchClient'
import { listStaffAccounts } from '@/lib/authClient'

const STATUS_META = {
  draft: { label: 'Draft', cls: 'badge-gray' },
  assigned: { label: 'Assigned', cls: 'badge-blue' },
  in_progress: { label: 'In Progress', cls: 'badge-orange' },
  ready_for_qa: { label: 'Ready For QA', cls: 'badge-green' },
  blocked: { label: 'Blocked', cls: 'badge-orange' },
  finalized: { label: 'Finalized', cls: 'badge-green' },
  cancelled: { label: 'Cancelled', cls: 'badge-gray' },
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

function SummaryTile({ icon: Icon, label, value, sub }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-ink-muted">{label}</p>
          <p className="text-2xl font-black text-ink-primary mt-1">{value}</p>
          {sub ? <p className="text-[11px] text-ink-muted mt-1">{sub}</p> : null}
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(240, 124, 0, 0.14)', color: '#f07c00' }}
        >
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

function BlockingState({ title, copy }) {
  return (
    <div className="card px-5 py-10 text-center">
      <ShieldAlert size={34} className="mx-auto mb-3" style={{ color: '#f07c00' }} />
      <p className="text-sm font-bold text-ink-primary">{title}</p>
      <p className="text-xs text-ink-muted mt-2 max-w-lg mx-auto">{copy}</p>
    </div>
  )
}

export default function JobOrderWorkbench() {
  const user = useUser()
  const role = user?.role ?? null
  const isTechnician = role === 'technician'
  const canUseWorkbench = canStaffReadExecutionJobOrder(role)
  const canManageHandoffs = staffJobOrderWorkbenchRoles.includes(role)
  const canManageAssignments = ['service_adviser', 'super_admin'].includes(role)

  const [workbenchScope, setWorkbenchScope] = useState('active')
  const [selectedDate, setSelectedDate] = useState(toDateKey())
  const [handoffCandidates, setHandoffCandidates] = useState([])
  const [handoffState, setHandoffState] = useState({
    status: 'handoff_empty',
    message: 'Choose a schedule date and refresh to load confirmed bookings.',
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
  const [progressDraft, setProgressDraft] = useState({
    entryType: 'work_started',
    message: '',
    completedItemIds: [],
  })
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
            account.role === 'technician'),
      ),
    [staffDirectoryState.accounts],
  )
  const selectedMonth = selectedDate.slice(0, 7)
  const finalizationBlockers = activeJobOrder?.finalizationReadiness?.blockers ?? []
  const finalizationSuggestedSummary = buildSuggestedFinalizationSummary(activeJobOrder)
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
        label: `Work item: ${item.name}`,
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
          label: `Progress ${index + 1}: ${entry.message?.slice(0, 48) || formatStatusLabel(entry.entryType)}`,
        })
      })

    return options
  }, [activeJobOrder])

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
    if (manualJobOrderId || selectedDateJobOrders.length === 0) {
      return
    }

    setManualJobOrderId(selectedDateJobOrders[0].id)
  }, [manualJobOrderId, selectedDateJobOrders])

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
      message: 'Loading confirmed booking handoffs...',
    })

    try {
      const schedule = await getDailySchedule(
        {
          scheduledDate: selectedDate,
          status: 'confirmed',
        },
        user.accessToken,
      )

      const confirmedBookings = (schedule?.slots ?? []).flatMap((slot) =>
        (slot?.bookings ?? []).filter((booking) => booking?.status === 'confirmed'),
      )

      const nextCandidates = confirmedBookings.map((booking) =>
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
            ? 'Confirmed bookings are ready for job-order handoff.'
            : 'No confirmed bookings are available for job-order handoff on this date.',
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
        message: `Job order ${jobOrder.id.slice(0, 8).toUpperCase()} created from confirmed booking handoff.`,
      })
      setActiveJobOrder(jobOrder)
      setManualJobOrderId(jobOrder.id)
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
        accessToken: user.accessToken,
      })

      setActiveJobOrder(updatedJobOrder)
      setManualJobOrderId(updatedJobOrder.id)
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
      }

      setAssignmentState({
        status: nextStatus,
        message: error?.message || 'Technician assignments could not be saved.',
      })
    }
  }

  const handleStatusUpdate = async () => {
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

    setStatusState({
      status: 'status_update_submitting',
      message: '',
    })

    try {
      const updatedJobOrder = await updateJobOrderStatus({
        jobOrderId: activeJobOrder.id,
        status: statusDraft.status,
        reason: statusDraft.reason,
        accessToken: user.accessToken,
      })

      setActiveJobOrder(updatedJobOrder)
      setManualJobOrderId(updatedJobOrder.id)
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
        nextStatus = 'invalid_transition'
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
        status: role === 'technician' ? 'progress_not_assigned' : 'progress_forbidden_role',
        message:
          role === 'technician'
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
        accessToken: user.accessToken,
      })

      setActiveJobOrder(updatedJobOrder)
      setProgressDraft({
        entryType: 'note',
        message: '',
        completedItemIds: [],
      })
      setProgressState({
        status: 'progress_saved',
        message: 'Progress entry saved and job-order detail refreshed.',
      })
    } catch (error) {
      let nextStatus = 'progress_failed'

      if (error instanceof ApiError && error.status === 403) {
        nextStatus = 'progress_forbidden_role'
      } else if (error instanceof ApiError && error.status === 404) {
        nextStatus = 'progress_job_order_not_found'
      } else if (error instanceof ApiError && error.status === 409) {
        nextStatus = 'progress_conflict'
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
        accessToken: user.accessToken,
      })

      setActiveJobOrder(updatedJobOrder)
      setPhotoDraft({
        ...emptyPhotoDraft,
        linkedEntityType: photoTargetOptions[0]?.linkedEntityType ?? 'job_order',
        linkedEntityId: photoTargetOptions[0]?.linkedEntityId ?? '',
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
        accessToken: user.accessToken,
      })

      setActiveJobOrder(updatedJobOrder)
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
        nextStatus = 'finalize_blocked_by_qa'
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
        accessToken: user.accessToken,
      })

      setActiveJobOrder(updatedJobOrder)
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
        nextStatus = errorMessage.includes('already paid') ? 'payment_already_paid' : 'payment_not_finalized'
      }

      setPaymentState({
        status: nextStatus,
        message: error?.message || 'Invoice payment could not be recorded.',
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

  const detailStateClassName =
    detailState.status === 'detail_loading'
      ? 'border-surface-border bg-surface-raised text-ink-primary'
      : detailState.status === 'detail_loaded'
        ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
        : 'border-red-500/25 bg-red-500/10 text-red-200'

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
      <section className="ops-page-header">
        <div className="space-y-2">
          <p className="ops-page-kicker">Workshop Operations</p>
          <h1 className="ops-page-title">Job Order Workbench</h1>
          <p className="ops-page-copy">
            {isTechnician
              ? 'Load your assigned job order, update execution status, add workshop progress, and attach evidence from one technician-focused control surface.'
              : 'Move confirmed bookings into workshop execution, track progress and evidence, then finalize invoice-ready work from one guided control surface.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-surface-border bg-surface-raised p-1">
            {[
              { key: 'active', label: 'Active' },
              { key: 'history', label: 'History' },
            ].map((view) => (
              <button
                key={view.key}
                type="button"
                onClick={() => setWorkbenchScope(view.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  workbenchScope === view.key ? 'text-white' : 'text-ink-secondary'
                }`}
                style={workbenchScope === view.key ? { background: '#f07c00' } : undefined}
              >
                {view.label}
              </button>
            ))}
          </div>
          {!isTechnician ? (
            <button
              onClick={loadBookingHandoffs}
              className="ops-action-secondary min-w-[148px] self-start xl:self-auto"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          ) : null}
        </div>
      </section>

      <section className="ops-control-strip">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
          <label className="text-xs text-ink-muted">
            {workbenchScope === 'history' ? 'History date' : isTechnician ? 'Assigned work date' : 'Schedule date'}
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value || toDateKey())}
              className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label className="text-xs text-ink-muted">
              {isTechnician ? 'Assigned job order' : 'Job-order lookup'}
              <select
                value={manualJobOrderId}
                onChange={(event) => setManualJobOrderId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
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
              <div
                className={`sm:col-span-2 rounded-xl border px-4 py-3 text-xs ${detailStateClassName}`}
              >
                {detailState.message}
              </div>
            ) : (
              <p className="sm:col-span-2 text-[11px] text-ink-muted">
                {isTechnician
                  ? 'Pick one of your assigned job orders from the selector before updating status, progress, or evidence.'
                  : workbenchScope === 'history'
                    ? 'History mode keeps finalized and cancelled job orders out of the active workbench queue while still letting you review or load them here.'
                    : 'Use the selector instead of pasting raw job-order IDs so this workbench stays tied to known live records.'}
              </p>
            )}
          </div>

          <div className="lg:col-span-2 rounded-xl border border-surface-border bg-surface-card px-4 py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-ink-primary">
                  {workbenchScope === 'history'
                    ? 'Dates with finalized and cancelled job orders'
                    : 'Dates with job orders and booking handoff queue'}
                </p>
                <p className="text-xs text-ink-muted mt-1">
                  {isTechnician
                    ? 'These dates already have assigned job orders in the selected month.'
                    : workbenchScope === 'history'
                      ? 'These dates contain history records so completed work stays out of the active workshop queue.'
                      : 'These dates already have job orders or booking handoff queue in the selected month.'}
                </p>
              </div>
              <span className="badge badge-gray">
                {markedWorkbenchDates.length} date{markedWorkbenchDates.length === 1 ? '' : 's'} marked
              </span>
            </div>

            {(jobOrderCalendarState.message || jobOrderSummaryState.message) ? (
              <div
                className={`mt-3 rounded-xl border px-4 py-3 text-xs ${
                  jobOrderCalendarState.status === 'error' || jobOrderSummaryState.status === 'error'
                    ? 'border-red-500/25 bg-red-500/10 text-red-200'
                    : 'border-surface-border bg-surface-raised text-ink-muted'
                }`}
              >
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
                          ? 'border-[#f07c00] bg-[#f07c00]/10 text-white'
                          : 'border-surface-border bg-surface-raised text-ink-secondary hover:border-[#f07c00]/50 hover:text-ink-primary'
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
      </section>

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
                  : 'Select a confirmed booking handoff first'
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

      <section
        className="ops-panel border-[#f07c00]/35 bg-[linear-gradient(180deg,rgba(240,124,0,0.14),rgba(15,23,42,0.94))] shadow-[0_24px_60px_rgba(15,23,42,0.28)]"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="card-title">Active Job Order</p>
            <p className="text-xs text-ink-muted mt-1">
              {isTechnician
                ? 'The loaded technician assignment stays pinned above your controls so status, progress, and workshop evidence remain in view while you work.'
                : 'The live workshop surface stays pinned above intake so status, assignments, evidence, and invoice readiness remain the primary context after a load or creation event.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`badge ${isTechnician ? 'badge-orange' : 'badge-blue'}`}>
              {isTechnician ? 'Technician live surface' : 'Pinned live surface'}
            </span>
            <span className="badge badge-gray">
              {activeJobOrder ? `JO-${activeJobOrder.id.slice(0, 8).toUpperCase()}` : 'Awaiting live detail'}
            </span>
          </div>
        </div>

        {activeJobOrder ? (
          <div className="mt-4 space-y-3">
            {activeJobOrderNeedsAssignmentRepair ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
                This job order has no saved technician assignment. Assign at least one technician,
                then retry the status change.
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
              <div className="grid gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-[#f07c00]/30 bg-surface-raised px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                      Job Order
                    </p>
                    <p className="text-sm text-ink-primary mt-1">
                      JO-{activeJobOrder.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-xs text-ink-muted mt-2">{activeJobOrder.sourceType} source</p>
                  </div>
                <div className="rounded-xl border border-[#f07c00]/30 bg-surface-raised px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                    Current Status
                  </p>
                  <div className="mt-1">
                    <StatusBadge status={activeJobOrder.status} />
                  </div>
                  <p className="text-xs text-ink-muted mt-2">
                    Updated {formatDateTime(activeJobOrder.updatedAt)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[#f07c00]/30 bg-surface-raised px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                  Work Items
                </p>
                <ul className="mt-2 space-y-2">
                  {activeJobOrder.items.map((item) => (
                    <li key={item.id} className="text-sm text-ink-primary">
                      {item.name}
                      {item.isCompleted ? ' (completed)' : ''}
                      {item.estimatedHours ? ` - ${item.estimatedHours}h` : ''}
                    </li>
                  ))}
                </ul>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                    Assignments
                  </p>
                  <p className="text-sm text-ink-primary mt-1">
                    {activeJobOrder.assignedTechnicianIds.length > 0
                      ? `${activeJobOrder.assignedTechnicianIds.length} technician${activeJobOrder.assignedTechnicianIds.length === 1 ? '' : 's'} assigned`
                      : 'No technician assigned'}
                  </p>
                  <p className="text-xs text-ink-muted mt-2">
                    {canManageAssignments
                      ? 'Draft job orders may stay unassigned. Assigned and operational job orders require at least one saved technician.'
                      : activeJobOrder.assignedTechnicianIds.join(', ') || 'Only advisers or super admins can change assignments.'}
                  </p>
                  {canManageAssignments ? (
                    <div className="mt-3 space-y-3">
                    <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                      {technicianOptions.length > 0 ? (
                        technicianOptions.map((account) => {
                          const checked = assignmentDraftIds.includes(account.id)

                          return (
                            <label
                              key={account.id}
                              className="flex items-start gap-3 rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-ink-primary"
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
                        <div className="rounded-lg border border-surface-border bg-surface-card px-3 py-3 text-xs text-ink-muted">
                          No active technician accounts are available in the staff directory yet.
                        </div>
                      )}
                    </div>

                    {assignmentState.message ? (
                      <div
                        className={`rounded-xl border px-4 py-3 text-xs ${
                          assignmentState.status === 'assignment_saved'
                            ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                            : 'border-red-500/25 bg-red-500/10 text-red-200'
                        }`}
                      >
                        {assignmentState.message}
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={handleSaveAssignments}
                      disabled={assignmentState.status === 'assignment_submitting'}
                      className="ops-action-primary w-full"
                    >
                      {assignmentState.status === 'assignment_submitting' ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <ShieldCheck size={14} />
                      )}
                      Save Assignments
                    </button>
                    </div>
                  ) : null}
                </div>
              <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                  Latest Progress
                </p>
                <p className="text-sm text-ink-primary mt-1">
                  {activeJobOrder.latestProgressEntry?.message ?? 'No progress entry yet'}
                </p>
              </div>
              <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                  Photo Evidence
                </p>
                <p className="text-sm text-ink-primary mt-1">{activeJobOrder.photos.length} attached</p>
                <p className="text-xs text-ink-muted mt-2">
                  {activeJobOrder.photos[0]?.caption ??
                    activeJobOrder.photos[0]?.fileName ??
                    'No photo evidence yet'}
                </p>
              </div>
              <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                  {isTechnician ? 'Completion Handoff' : 'Invoice Record'}
                </p>
                <p className="text-sm text-ink-primary mt-1">
                  {isTechnician
                    ? activeJobOrder.status === 'ready_for_qa'
                      ? 'Ready for QA review'
                      : 'Still in workshop'
                    : activeJobOrder.invoiceRecord?.invoiceReference ?? 'Not finalized yet'}
                </p>
                <p className="text-xs text-ink-muted mt-2">
                  {isTechnician
                    ? activeJobOrder.status === 'ready_for_qa'
                      ? 'Execution work is staged for the next review step.'
                      : 'Keep progress and evidence current until the work is ready for handoff.'
                    : activeJobOrder.invoiceRecord
                      ? `Payment: ${activeJobOrder.invoiceRecord.paymentStatus}`
                      : 'Finalization creates the invoice-ready record.'}
                </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-10 text-center mt-4">
            <AlertTriangle size={28} className="mx-auto text-ink-dim mb-3" />
            <p className="text-sm font-bold text-ink-primary">No job order loaded yet</p>
            <p className="text-xs text-ink-muted mt-2">
              {isTechnician
                ? 'Choose one of your assigned job orders to start technician execution updates.'
                : 'Create a job order from confirmed booking handoff or choose an existing job order from the selector.'}
            </p>
          </div>
        )}
      </section>

      {isTechnician ? (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
          <div className="space-y-5">
            <div className="ops-panel">
              <div>
                <p className="card-title">Technician Workflow Notes</p>
                <p className="text-xs text-ink-muted mt-1">
                  This workspace is focused on execution updates. Booking handoff, invoice finalization, and payment ownership stay with adviser or admin roles.
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

            <div className="ops-panel">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                <div>
                  <p className="card-title">Execution Control</p>
                  <p className="text-xs text-ink-muted mt-1">
                    Move the loaded job order through valid execution states as workshop work progresses.
                  </p>
                </div>
                <span className="badge badge-gray">
                  Next states: {nextStatuses.length > 0 ? nextStatuses.join(', ') : 'none'}
                </span>
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
                    className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
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
                    Use status updates to reflect the real workshop phase of the assigned job.
                  </p>
                  <p className="text-xs text-ink-muted mt-2">
                    If no transition appears, this job order is waiting on another workflow step or is already complete.
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
                    className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                    placeholder="Optional workshop reason for the selected transition."
                  />
                </label>
              </div>

              {statusState.message ? (
                <div
                  className={`rounded-xl border px-4 py-3 text-xs mt-4 ${
                    statusState.status === 'status_update_saved'
                      ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                      : 'border-red-500/25 bg-red-500/10 text-red-200'
                  }`}
                >
                  {statusState.message}
                </div>
              ) : null}

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
                  Save Status Update
                </button>
                <span className="badge badge-gray">Execution states only</span>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="ops-panel">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                <div>
                  <p className="card-title">Progress & Evidence</p>
                  <p className="text-xs text-ink-muted mt-1">
                    Keep the workshop trail current with technician notes and reviewable media.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="badge badge-gray">Progress: technician-owned</span>
                  <span className="badge badge-gray">Evidence: attached to job order</span>
                </div>
              </div>

              <div className="grid xl:grid-cols-2 gap-4 mt-4">
                <div className="rounded-xl border border-surface-border bg-surface-card p-4">
                  <p className="text-sm font-bold text-ink-primary">Technician Progress Entry</p>
                  <p className="text-xs text-ink-muted mt-1">
                    Only the assigned technician can append workshop progress.
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
                        className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
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
                        className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                        placeholder="Describe the work performed or issue found."
                      />
                    </label>
                  </div>
                  {progressState.message ? (
                    <div
                      className={`rounded-xl border px-4 py-3 text-xs mt-3 ${
                        progressState.status === 'progress_saved'
                          ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                          : 'border-red-500/25 bg-red-500/10 text-red-200'
                      }`}
                    >
                      {progressState.message}
                    </div>
                  ) : null}
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
                    Save Progress Entry
                  </button>
                </div>

                <div className="rounded-xl border border-surface-border bg-surface-card p-4">
                  <p className="text-sm font-bold text-ink-primary">Photo Evidence</p>
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
                        className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                      >
                        {photoTargetOptions.map((option) => (
                          <option
                            key={option.key}
                            value={`${option.linkedEntityType}:${option.linkedEntityId || ''}`}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-ink-muted md:col-span-2">
                      Selected file
                      <input
                        value={photoDraft.file?.name ?? ''}
                        readOnly
                        className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
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
                        className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                        placeholder="What this image proves for the next reviewer."
                      />
                    </label>
                  </div>
                  {photoState.message ? (
                    <div
                      className={`rounded-xl border px-4 py-3 text-xs mt-3 ${
                        photoState.status === 'photo_saved'
                          ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                          : 'border-red-500/25 bg-red-500/10 text-red-200'
                      }`}
                    >
                      {photoState.message}
                    </div>
                  ) : null}
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
                    Upload Photo Evidence
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="ops-workspace-grid">
        <div className="space-y-5">
          <div className="ops-panel">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="card-title">Booking Handoff Queue</p>
                <p className="text-xs text-ink-muted mt-1">
                  Select a confirmed booking, then create the matching workshop job order from the
                  guided surface on the right.
                </p>
              </div>
              <span className="badge badge-gray">{formatDate(selectedDate)}</span>
            </div>

            {handoffState.message ? (
              <div
                className={`rounded-xl border px-4 py-3 text-xs mt-4 ${
                  handoffState.status === 'handoff_load_failed' ||
                  handoffState.status === 'handoff_forbidden_role'
                    ? 'border-red-500/25 bg-red-500/10 text-red-200'
                    : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                }`}
              >
                {handoffState.message}
              </div>
            ) : null}

            <div className="space-y-3 mt-4">
              {handoffCandidates.length === 0 ? (
                <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-8 text-center">
                  <p className="text-sm font-bold text-ink-primary">No confirmed handoffs for this date</p>
                  <p className="text-xs text-ink-muted mt-2">
                    Booking handoff remains schedule-derived. Only confirmed bookings can move into
                    job-order creation.
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
                          ? 'border-[#f07c00] bg-[#f07c00]/10'
                          : 'border-surface-border bg-surface-card hover:border-[#f07c00]/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-mono font-bold" style={{ color: '#f07c00' }}>
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
          </div>
        </div>

        <div className="space-y-5">
          <div className="ops-panel">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <div>
                <p className="card-title">Create / Load Job Order</p>
                <p className="text-xs text-ink-muted mt-1">
                  Use this secondary intake surface to convert a confirmed booking into a new job
                  order. Manual lookup stays in the control strip, while the live job-order
                  surface remains pinned above.
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

            {!selectedCandidate ? (
              <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-10 text-center mt-4">
                <AlertTriangle size={28} className="mx-auto text-ink-dim mb-3" />
                <p className="text-sm font-bold text-ink-primary">Select a confirmed booking handoff first</p>
                <p className="text-xs text-ink-muted mt-2">
                  The workbench only creates job orders from confirmed booking intake in this slice.
                </p>
              </div>
            ) : (
              <div className="space-y-4 mt-4">
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
                            className="w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
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
                            className="w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                            placeholder="Whole hours"
                          />
                        </div>
                        <textarea
                          value={item.description ?? ''}
                          onChange={(event) =>
                            handleCreateItemChange(index, { description: event.target.value })
                          }
                          rows={2}
                          className="mt-3 w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
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
                    className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
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
                    Leaving this blank creates a draft job order instead of sending an invalid
                    technician ID.
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
                    className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                    placeholder="Add workshop notes carried into the job order."
                  />
                </label>

                {createState.message ? (
                  <div
                    className={`rounded-xl border px-4 py-3 text-xs ${
                      createState.status === 'create_saved'
                        ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                        : 'border-red-500/25 bg-red-500/10 text-red-200'
                    }`}
                  >
                    {createState.message}
                  </div>
                ) : null}

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
                  Create Job Order
                </button>
              </div>
            )}
          </div>

          <div className="ops-panel">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <div>
                <p className="card-title">Execution Control</p>
                <p className="text-xs text-ink-muted mt-1">
                  Only valid status transitions are shown. Progress, photos, finalization, and
                  payment stay in their dedicated workbench sections below.
                </p>
              </div>
              <span className="badge badge-gray">
                Next states: {nextStatuses.length > 0 ? nextStatuses.join(', ') : 'none'}
              </span>
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
                  className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
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
                  Choose the next allowed status for the loaded job order.
                </p>
                <p className="text-xs text-ink-muted mt-2">
                  If no transition appears, the job order is already blocked, finalized, or waiting
                  for another workflow step.
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
                  className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                  placeholder="Optional reason for the selected transition."
                />
              </label>
            </div>

            {statusState.message ? (
              <div
                className={`rounded-xl border px-4 py-3 text-xs mt-4 ${
                  statusState.status === 'status_update_saved'
                    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                    : 'border-red-500/25 bg-red-500/10 text-red-200'
                }`}
              >
                {statusState.message}
              </div>
            ) : null}

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
                Save Status Update
              </button>
              <span className="badge badge-gray">Live transition rules only</span>
            </div>
          </div>

          <div className="ops-panel">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <div>
                <p className="card-title">Progress & Evidence</p>
                <p className="text-xs text-ink-muted mt-1">
                  Execution evidence stays job-order-owned so the workshop team can record work and
                  attach reviewable media without changing booking truth.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="badge badge-gray">Progress: technician-owned</span>
                {role === 'super_admin' ? <span className="badge badge-green">Super admin override access</span> : null}
                <span className="badge badge-gray">Evidence: technician/adviser/admin</span>
              </div>
            </div>

            <div className="grid xl:grid-cols-2 gap-4 mt-4">
              <div className="rounded-xl border border-surface-border bg-surface-card p-4">
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
                      className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
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
                      className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                      placeholder="Describe the work performed or issue found."
                    />
                  </label>
                </div>
                {progressState.message ? (
                  <div
                    className={`rounded-xl border px-4 py-3 text-xs mt-3 ${
                      progressState.status === 'progress_saved'
                        ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                        : 'border-red-500/25 bg-red-500/10 text-red-200'
                    }`}
                  >
                    {progressState.message}
                  </div>
                ) : null}
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
                  Save Progress Entry
                </button>
              </div>

              <div className="rounded-xl border border-surface-border bg-surface-card p-4">
                <p className="text-sm font-bold text-ink-primary">Photo Evidence</p>
                <p className="text-xs text-ink-muted mt-1">
                  Upload images directly from camera or desktop so QA and finalization reviewers can inspect stored evidence.
                </p>
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
                      className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                    >
                      {photoTargetOptions.map((option) => (
                        <option
                          key={option.key}
                          value={`${option.linkedEntityType}:${option.linkedEntityId || ''}`}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-ink-muted md:col-span-2">
                    Selected file
                    <input
                      value={photoDraft.file?.name ?? ''}
                      readOnly
                      className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
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
                      className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                      placeholder="What this image proves for the next reviewer."
                    />
                  </label>
                </div>
                {photoState.message ? (
                  <div
                    className={`rounded-xl border px-4 py-3 text-xs mt-3 ${
                      photoState.status === 'photo_saved'
                        ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                        : 'border-red-500/25 bg-red-500/10 text-red-200'
                    }`}
                  >
                    {photoState.message}
                  </div>
                ) : null}
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
                  Upload Photo Evidence
                </button>
              </div>
            </div>
          </div>

          <div className="ops-panel">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <div>
                <p className="card-title">Finalize & Payment</p>
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
                    className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                    placeholder="Describe completed work for the invoice-ready record."
                  />
                </label>
                {!finalizationSuggestedSummary ? (
                  <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
                    No work notes found — please describe completed work before finalizing.
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
                      className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
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
                      className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
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
                      className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
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
                      className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                    />
                  </label>
                </div>
                {finalizationBlockers.length > 0 ? (
                  <div className="mt-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                    <p className="font-semibold text-red-100">Finalization blockers</p>
                    <ul className="mt-2 space-y-1 list-disc pl-4">
                      {finalizationBlockers.map((blocker) => (
                        <li key={blocker}>{blocker}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {finalizeState.message ? (
                  <div
                    className={`rounded-xl border px-4 py-3 text-xs mt-3 ${
                      finalizeState.status === 'finalize_saved'
                        ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                        : 'border-red-500/25 bg-red-500/10 text-red-200'
                    }`}
                  >
                    {finalizeState.message}
                  </div>
                ) : null}
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
                    {activeJobOrder?.invoiceRecord ? 'Invoice Already Generated' : 'Finalize & Record Payment'}
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
                    Retry Payment Recording
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
                {paymentState.message ? (
                  <div
                    className={`rounded-xl border px-4 py-3 text-xs mt-3 ${
                      paymentState.status === 'payment_saved'
                        ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                        : 'border-red-500/25 bg-red-500/10 text-red-200'
                    }`}
                  >
                    {paymentState.message}
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
                    Export Invoice PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        </section>
      )}
    </div>
  )
}
