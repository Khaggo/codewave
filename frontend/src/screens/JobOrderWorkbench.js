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
  jobOrderWorkbenchContractSources,
  staffJobOrderWorkbenchRoles,
} from '@/lib/api/generated/job-orders/staff-web-workbench'
import {
  canStaffAppendProgress,
  canStaffCreateEvidencePhoto,
  canStaffFinalizeOrRecordPayment,
  canStaffReadExecutionJobOrder,
  getJobOrderExecutionPhase,
  jobOrderExecutionContractSources,
} from '@/lib/api/generated/job-orders/staff-web-execution'
import {
  createJobOrderFromBooking,
  addJobOrderPhotoEvidence,
  addJobOrderProgressEntry,
  finalizeJobOrder,
  getJobOrderById,
  recordJobOrderInvoicePayment,
  updateJobOrderStatus,
} from '@/lib/jobOrderWorkbenchClient'

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

const initialReadState = {
  status: 'detail_loaded',
  message: '',
}

const initialStatusState = {
  status: 'status_update_ready',
  message: '',
}

const initialProgressState = {
  status: 'progress_ready',
  message: '',
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

const formatStatusLabel = (value) =>
  STATUS_META[value]?.label ??
  String(value ?? '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const splitCommaSeparatedIds = (value) =>
  String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

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
  const canUseWorkbench = canStaffReadExecutionJobOrder(role)
  const canManageHandoffs = staffJobOrderWorkbenchRoles.includes(role)

  const [selectedDate, setSelectedDate] = useState(toDateKey())
  const [handoffCandidates, setHandoffCandidates] = useState([])
  const [handoffState, setHandoffState] = useState({
    status: 'handoff_empty',
    message: 'Choose a schedule date and refresh to load confirmed bookings from the live backend.',
  })
  const [selectedBookingId, setSelectedBookingId] = useState('')
  const [createDraft, setCreateDraft] = useState({
    notes: '',
    items: [],
    assignedTechnicianIdsText: '',
  })
  const [createState, setCreateState] = useState(initialCreateState)
  const [activeJobOrder, setActiveJobOrder] = useState(null)
  const [manualJobOrderId, setManualJobOrderId] = useState('')
  const [detailState, setDetailState] = useState(initialReadState)
  const [statusDraft, setStatusDraft] = useState({
    status: 'draft',
    reason: '',
  })
  const [statusState, setStatusState] = useState(initialStatusState)
  const [progressDraft, setProgressDraft] = useState({
    entryType: 'work_started',
    message: '',
    completedItemIdsText: '',
  })
  const [progressState, setProgressState] = useState(initialProgressState)
  const [photoDraft, setPhotoDraft] = useState({
    fileName: '',
    fileUrl: '',
    caption: '',
  })
  const [photoState, setPhotoState] = useState(initialPhotoState)
  const [finalizeDraft, setFinalizeDraft] = useState({
    summary: '',
  })
  const [finalizeState, setFinalizeState] = useState(initialFinalizeState)
  const [paymentDraft, setPaymentDraft] = useState({
    amountPaidCents: '',
    paymentMethod: 'cash',
    reference: '',
    receivedAt: '',
  })
  const [paymentState, setPaymentState] = useState(initialPaymentState)

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
  const executionPhase = getJobOrderExecutionPhase(activeJobOrder)

  const loadBookingHandoffs = useCallback(async () => {
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
      message: 'Loading confirmed booking handoffs from the live booking schedule...',
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
  }, [canManageHandoffs, selectedDate, user?.accessToken])

  useEffect(() => {
    void loadBookingHandoffs()
  }, [loadBookingHandoffs])

  useEffect(() => {
    if (!selectedCandidate) {
      setCreateDraft({
        notes: '',
        items: [],
        assignedTechnicianIdsText: '',
      })
      return
    }

    setCreateDraft({
      notes: selectedCandidate.sourceNotes ?? '',
      items: selectedCandidate.defaultItems,
      assignedTechnicianIdsText: '',
    })
    setCreateState(initialCreateState)
  }, [selectedCandidate])

  useEffect(() => {
    if (!activeJobOrder) {
      setStatusDraft({
        status: 'draft',
        reason: '',
      })
      setStatusState(initialStatusState)
      setProgressState(initialProgressState)
      setPhotoState(initialPhotoState)
      setFinalizeState(initialFinalizeState)
      setPaymentState(initialPaymentState)
      return
    }

    setStatusDraft({
      status: nextStatuses[0] ?? activeJobOrder.status,
      reason: '',
    })
    setStatusState(initialStatusState)
    setProgressState(initialProgressState)
    setPhotoState(initialPhotoState)
    setFinalizeState(initialFinalizeState)
    setPaymentState(initialPaymentState)
  }, [activeJobOrder, nextStatuses])

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
      status: 'detail_loaded',
      message: 'Loading job-order detail from the live backend route...',
    })

    try {
      const jobOrder = await getJobOrderById({
        jobOrderId: manualJobOrderId.trim(),
        accessToken: user.accessToken,
      })

      setActiveJobOrder(jobOrder)
      setManualJobOrderId(jobOrder.id)
      setDetailState({
        status: 'detail_loaded',
        message: 'Live job-order detail loaded.',
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
        assignedTechnicianIds: createDraft.assignedTechnicianIdsText
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      })

      setActiveJobOrder(jobOrder)
      setManualJobOrderId(jobOrder.id)
      setCreateState({
        status: 'create_saved',
        message: `Job order ${jobOrder.id.slice(0, 8).toUpperCase()} created from confirmed booking handoff.`,
      })
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
        message: error?.message || 'Job-order status could not be updated.',
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
        completedItemIds: splitCommaSeparatedIds(progressDraft.completedItemIdsText),
        accessToken: user.accessToken,
      })

      setActiveJobOrder(updatedJobOrder)
      setProgressDraft({
        entryType: 'note',
        message: '',
        completedItemIdsText: '',
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

    setPhotoState({
      status: 'photo_submitting',
      message: '',
    })

    try {
      const updatedJobOrder = await addJobOrderPhotoEvidence({
        jobOrderId: activeJobOrder.id,
        fileName: photoDraft.fileName,
        fileUrl: photoDraft.fileUrl,
        caption: photoDraft.caption,
        accessToken: user.accessToken,
      })

      setActiveJobOrder(updatedJobOrder)
      setPhotoDraft({
        fileName: '',
        fileUrl: '',
        caption: '',
      })
      setPhotoState({
        status: 'photo_saved',
        message: 'Photo evidence attached and job-order detail refreshed.',
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
        message: error?.message || 'Photo evidence could not be attached.',
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
        accessToken: user.accessToken,
      })

      setActiveJobOrder(updatedJobOrder)
      setFinalizeState({
        status: 'finalize_saved',
        message: `Invoice-ready record ${updatedJobOrder.invoiceRecord?.invoiceReference ?? ''} generated.`,
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
        amountPaidCents: paymentDraft.amountPaidCents,
        paymentMethod: paymentDraft.paymentMethod,
        reference: paymentDraft.reference,
        receivedAt: paymentDraft.receivedAt,
        accessToken: user.accessToken,
      })

      setActiveJobOrder(updatedJobOrder)
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

  if (!canUseWorkbench) {
    return (
      <div className="space-y-5">
        <BlockingState
          title="Job-order workbench is staff-only"
          copy="This route is reserved for technicians, service advisers, and super admins. Customer accounts remain mobile-only."
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="card p-4 md:p-5">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-muted">Job Order Workbench</p>
            <h1 className="text-xl md:text-2xl font-black text-ink-primary mt-1">
              Booking Handoff, Execution Evidence, and Invoice-Ready Finalization
            </h1>
            <p className="text-sm text-ink-muted mt-2 max-w-3xl">
              Confirmed bookings stay booking-owned until handoff. This workbench uses the live booking
              schedule to discover eligible sources, then uses live job-order create, read, status,
              progress, photo, finalization, and invoice-payment routes without inventing a list endpoint.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="badge badge-green">Handoff {jobOrderWorkbenchContractSources.handoff.status}</span>
            <span className="badge badge-green">Create {jobOrderWorkbenchContractSources.create.status}</span>
            <span className="badge badge-green">Detail {jobOrderWorkbenchContractSources.detail.status}</span>
            <span className="badge badge-green">Status {jobOrderWorkbenchContractSources.updateStatus.status}</span>
            <span className="badge badge-green">Progress {jobOrderExecutionContractSources.progress.status}</span>
            <span className="badge badge-green">Photos {jobOrderExecutionContractSources.photo.status}</span>
            <span className="badge badge-green">Finalize {jobOrderExecutionContractSources.finalize.status}</span>
            <span className="badge badge-green">Payment {jobOrderExecutionContractSources.payment.status}</span>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <SummaryTile
          icon={ClipboardList}
          label="Confirmed Handoffs"
          value={handoffCandidates.length}
          sub={
            handoffState.status === 'handoff_empty'
              ? 'No confirmed booking source is ready today'
              : 'Derived from live booking schedule'
          }
        />
        <SummaryTile
          icon={Wrench}
          label="Selected Source"
          value={selectedCandidate ? selectedCandidate.timeSlotLabel : 'None'}
          sub={selectedCandidate ? selectedCandidate.serviceSummary : 'Pick a confirmed booking handoff'}
        />
        <SummaryTile
          icon={FileStack}
          label="Loaded Job Order"
          value={activeJobOrder ? formatStatusLabel(activeJobOrder.status) : 'None'}
          sub={activeJobOrder ? `${activeJobOrder.itemCount} work item(s)` : 'Load or create one from this page'}
        />
        <SummaryTile
          icon={ShieldCheck}
          label="Execution Phase"
          value={String(executionPhase).replaceAll('_', ' ')}
          sub={activeJobOrder?.invoiceRecord ? activeJobOrder.invoiceRecord.invoiceReference : 'Progress/photos stay job-order-owned'}
        />
      </div>

      <div className="grid xl:grid-cols-[360px_minmax(0,1fr)] gap-5">
        <div className="card p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="card-title">Confirmed Booking Handoffs</p>
              <p className="text-xs text-ink-muted mt-1">
                Confirmed bookings stay booking-owned. This panel only selects eligible handoff sources.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value || toDateKey())}
                className="rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
              />
              <button onClick={loadBookingHandoffs} className="btn-ghost">
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>

          {handoffState.message ? (
            <div
              className={`rounded-xl border px-4 py-3 text-xs mt-4 ${
                handoffState.status === 'handoff_load_failed' || handoffState.status === 'handoff_forbidden_role'
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
                        ? 'border-[#f07c00] bg-[#f07c00]/10'
                        : 'border-surface-border bg-surface-card hover:border-[#f07c00]/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-mono font-bold" style={{ color: '#f07c00' }}>
                          BK-{candidate.bookingId.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-sm font-semibold text-ink-primary mt-1">{candidate.serviceSummary}</p>
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

          <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3 mt-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Workflow rule</p>
            <p className="text-sm text-ink-primary mt-1">
              Pending, cancelled, and completed bookings are hidden from handoff creation.
            </p>
            <p className="text-xs text-ink-muted mt-2">
              Confirm the booking on the schedule page first, then refresh this workbench for the live handoff candidate.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-4 md:p-5">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <div>
                <p className="card-title">Create Job Order From Booking</p>
                <p className="text-xs text-ink-muted mt-1">
                  The create route is live. This form seeds work items from requested services and keeps
                  booking fields separate from job-order fields.
                </p>
              </div>
              <span className="badge badge-gray">
                Technician directory lookup is not live yet
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
                    <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Source Booking</p>
                    <p className="text-sm text-ink-primary mt-1">BK-{selectedCandidate.bookingId.slice(0, 8).toUpperCase()}</p>
                    <p className="text-xs text-ink-muted mt-2">{selectedCandidate.customerLabel}</p>
                  </div>
                  <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Adviser Snapshot</p>
                    <p className="text-sm text-ink-primary mt-1">{user?.staffCode ?? 'Missing staff code'}</p>
                    <p className="text-xs text-ink-muted mt-2">Live create route requires adviser id + code snapshot.</p>
                  </div>
                </div>

                <label className="text-xs text-ink-muted block">
                  Work items
                  <div className="space-y-3 mt-2">
                    {createDraft.items.map((item, index) => (
                      <div key={`${item.name}-${index}`} className="rounded-xl border border-surface-border bg-surface-raised p-3">
                        <div className="grid md:grid-cols-[minmax(0,1fr)_120px] gap-3">
                          <input
                            value={item.name}
                            onChange={(event) => handleCreateItemChange(index, { name: event.target.value })}
                            className="w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                            placeholder="Work item name"
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={item.estimatedHours ?? ''}
                            onChange={(event) =>
                              handleCreateItemChange(index, {
                                estimatedHours:
                                  event.target.value === '' ? undefined : Number(event.target.value),
                              })
                            }
                            className="w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                            placeholder="Hours"
                          />
                        </div>
                        <textarea
                          value={item.description ?? ''}
                          onChange={(event) => handleCreateItemChange(index, { description: event.target.value })}
                          rows={2}
                          className="mt-3 w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                          placeholder="Optional work-item description"
                        />
                      </div>
                    ))}
                  </div>
                </label>

                <label className="text-xs text-ink-muted block">
                  Assigned technician ids
                  <input
                    value={createDraft.assignedTechnicianIdsText}
                    onChange={(event) =>
                      setCreateDraft((current) => ({
                        ...current,
                        assignedTechnicianIdsText: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                    placeholder="Comma-separated technician ids"
                  />
                  <span className="block text-[11px] text-ink-muted mt-1">
                    Keep assignment explicit until a live staff directory route is approved.
                  </span>
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
                      ['create_saved'].includes(createState.status)
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
                  className="btn-primary"
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

          <div className="card p-4 md:p-5">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
              <div>
                <p className="card-title">Job-Order Detail</p>
                <p className="text-xs text-ink-muted mt-1">
                  There is no live list route for job orders in this slice. Load by created id or a known id.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                <input
                  value={manualJobOrderId}
                  onChange={(event) => setManualJobOrderId(event.target.value)}
                  placeholder="Job-order id"
                  className="w-full lg:w-[320px] rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                />
                <button onClick={handleLoadJobOrder} className="btn-primary justify-center">
                  <RefreshCw size={14} /> Load Live Detail
                </button>
              </div>
            </div>

            {detailState.message ? (
              <div
                className={`rounded-xl border px-4 py-3 text-xs mt-4 ${
                  detailState.status === 'detail_loaded'
                    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                    : 'border-red-500/25 bg-red-500/10 text-red-200'
                }`}
              >
                {detailState.message}
              </div>
            ) : null}

            {activeJobOrder ? (
              <div className="grid md:grid-cols-2 gap-3 mt-4">
                <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Job Order</p>
                  <p className="text-sm text-ink-primary mt-1">JO-{activeJobOrder.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-ink-muted mt-2">{activeJobOrder.sourceType} source</p>
                </div>
                <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Current Status</p>
                  <div className="mt-1">
                    <StatusBadge status={activeJobOrder.status} />
                  </div>
                  <p className="text-xs text-ink-muted mt-2">Updated {formatDateTime(activeJobOrder.updatedAt)}</p>
                </div>
                <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3 md:col-span-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Work Items</p>
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
                <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Assignments</p>
                  <p className="text-sm text-ink-primary mt-1">
                    {activeJobOrder.assignedTechnicianIds.length > 0
                      ? activeJobOrder.assignedTechnicianIds.join(', ')
                      : 'No technician assigned'}
                  </p>
                </div>
                <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Latest Progress</p>
                  <p className="text-sm text-ink-primary mt-1">
                    {activeJobOrder.latestProgressEntry?.message ?? 'No progress entry yet'}
                  </p>
                </div>
                <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Photo Evidence</p>
                  <p className="text-sm text-ink-primary mt-1">{activeJobOrder.photos.length} attached</p>
                  <p className="text-xs text-ink-muted mt-2">
                    {activeJobOrder.photos[0]?.caption ?? activeJobOrder.photos[0]?.fileName ?? 'No photo evidence yet'}
                  </p>
                </div>
                <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Invoice Record</p>
                  <p className="text-sm text-ink-primary mt-1">
                    {activeJobOrder.invoiceRecord?.invoiceReference ?? 'Not finalized yet'}
                  </p>
                  <p className="text-xs text-ink-muted mt-2">
                    {activeJobOrder.invoiceRecord
                      ? `Payment: ${activeJobOrder.invoiceRecord.paymentStatus}`
                      : 'Finalization creates the invoice-ready record.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-10 text-center mt-4">
                <AlertTriangle size={28} className="mx-auto text-ink-dim mb-3" />
                <p className="text-sm font-bold text-ink-primary">No job order loaded yet</p>
                <p className="text-xs text-ink-muted mt-2">
                  Create a job order from confirmed booking handoff or load a known id from the live route.
                </p>
              </div>
            )}
          </div>

          <div className="card p-4 md:p-5">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <div>
                <p className="card-title">Status Update</p>
                <p className="text-xs text-ink-muted mt-1">
                  Only live job-order status transitions are allowed. Progress, photos, finalization, and payment use separate job-order routes below.
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
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Route</p>
                <p className="text-sm text-ink-primary mt-1">
                  {jobOrderWorkbenchContractSources.updateStatus.method} {jobOrderWorkbenchContractSources.updateStatus.path}
                </p>
                <p className="text-xs text-ink-muted mt-2">
                  Invalid transition and forbidden-role failures stay distinct in this workbench.
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
                disabled={!activeJobOrder || nextStatuses.length === 0 || statusState.status === 'status_update_submitting'}
                className="btn-primary"
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

          <div className="card p-4 md:p-5">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <div>
                <p className="card-title">Progress, Photos, Finalization, and Payment</p>
                <p className="text-xs text-ink-muted mt-1">
                  Execution evidence stays job-order-owned. Finalization creates the invoice-ready record only after backend QA and work-completion rules pass.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="badge badge-gray">Progress: technician-owned</span>
                <span className="badge badge-gray">Finalize: adviser/admin</span>
              </div>
            </div>

            <div className="grid xl:grid-cols-2 gap-4 mt-4">
              <div className="rounded-xl border border-surface-border bg-surface-card p-4">
                <p className="text-sm font-bold text-ink-primary">Technician Progress Entry</p>
                <p className="text-xs text-ink-muted mt-1">
                  Only the assigned technician can use the live progress route.
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
                  <label className="text-xs text-ink-muted">
                    Completed item ids
                    <input
                      value={progressDraft.completedItemIdsText}
                      onChange={(event) =>
                        setProgressDraft((current) => ({
                          ...current,
                          completedItemIdsText: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                      placeholder="Comma-separated item ids"
                    />
                  </label>
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
                  className="btn-primary mt-3"
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
                  This records an evidence URL; file storage/upload remains outside this route.
                </p>
                <div className="grid md:grid-cols-2 gap-3 mt-3">
                  <label className="text-xs text-ink-muted">
                    File name
                    <input
                      value={photoDraft.fileName}
                      onChange={(event) =>
                        setPhotoDraft((current) => ({
                          ...current,
                          fileName: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                      placeholder="front-brake-after.jpg"
                    />
                  </label>
                  <label className="text-xs text-ink-muted">
                    File URL
                    <input
                      value={photoDraft.fileUrl}
                      onChange={(event) =>
                        setPhotoDraft((current) => ({
                          ...current,
                          fileUrl: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                      placeholder="https://files.example.com/job-orders/photo.jpg"
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
                      placeholder="Customer-safe evidence caption."
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
                  className="btn-primary mt-3"
                >
                  {photoState.status === 'photo_submitting' ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <FileStack size={14} />
                  )}
                  Attach Photo Evidence
                </button>
              </div>

              <div className="rounded-xl border border-surface-border bg-surface-card p-4">
                <p className="text-sm font-bold text-ink-primary">Finalize Invoice-Ready Work</p>
                <p className="text-xs text-ink-muted mt-1">
                  Finalization is separate from status updates and stays blocked when QA or work-item rules fail.
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
                    placeholder="Summarize completed work for the invoice-ready record."
                  />
                </label>
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
                <button
                  onClick={handleFinalizeJobOrder}
                  disabled={!activeJobOrder || finalizeState.status === 'finalize_submitting'}
                  className="btn-primary mt-3"
                >
                  {finalizeState.status === 'finalize_submitting' ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  Generate Invoice-Ready Record
                </button>
              </div>

              <div className="rounded-xl border border-surface-border bg-surface-card p-4">
                <p className="text-sm font-bold text-ink-primary">Record Invoice Payment</p>
                <p className="text-xs text-ink-muted mt-1">
                  Payment tracking belongs to the invoice-ready record and does not mutate booking truth.
                </p>
                <div className="grid md:grid-cols-2 gap-3 mt-3">
                  <label className="text-xs text-ink-muted">
                    Amount paid in cents
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={paymentDraft.amountPaidCents}
                      onChange={(event) =>
                        setPaymentDraft((current) => ({
                          ...current,
                          amountPaidCents: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                      placeholder="159900"
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
                    Reference
                    <input
                      value={paymentDraft.reference}
                      onChange={(event) =>
                        setPaymentDraft((current) => ({
                          ...current,
                          reference: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                      placeholder="OR-2026-0001"
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
                <button
                  onClick={handleRecordInvoicePayment}
                  disabled={!activeJobOrder || paymentState.status === 'payment_submitting'}
                  className="btn-primary mt-3"
                >
                  {paymentState.status === 'payment_submitting' ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <ShieldCheck size={14} />
                  )}
                  Record Invoice Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
