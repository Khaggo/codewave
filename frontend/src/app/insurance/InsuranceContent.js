'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  FileClock,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { useUser } from '@/lib/userContext'
import { ApiError } from '@/lib/authClient'
import {
  getInsuranceInquiryById,
  listInsuranceInquiries,
  sendInsuranceBroadcasts,
  sendInsuranceReminders,
  updateInsuranceInquiryStatus,
} from '@/lib/insuranceStaffClient'
import {
  getAllowedInsuranceStatusTargets,
  insuranceReviewStaffRoles,
} from '@/lib/api/generated/insurance/staff-web-insurance'
import {
  buildInsuranceBroadcastRequest,
  buildInsuranceReminderRequest,
  buildInsuranceTableRow,
  formatStatusLabel,
  getInsuranceBroadcastComposerState,
  getInsuranceDetailTabs,
  getNextInsuranceWorkspaceViewState,
  getInsuranceQueueFilterSummary,
  getInsuranceReminderComposerState,
  getInsuranceSummaryCards,
  shouldApplyInsuranceAsyncResult,
  summarizeInsuranceBroadcastResult,
  summarizeInsuranceReminderResult,
} from './insuranceView.mjs'

const INQUIRY_STATUS_OPTIONS = [
  'submitted',
  'needs_documents',
  'under_review',
  'for_approval',
  'approved',
  'payment_pending',
  'active',
  'for_renewal',
  'closed',
  'rejected',
  'cancelled',
]

const PAYMENT_STATUS_OPTIONS = ['not_required', 'unpaid', 'proof_submitted', 'verifying', 'paid', 'overdue']
const RENEWAL_STATUS_OPTIONS = [
  'not_applicable',
  'upcoming',
  'quoted',
  'awaiting_customer',
  'renewed',
  'expired',
]
const REMINDER_TYPE_OPTIONS = ['missing_documents', 'payment_pending', 'overdue_payment', 'renewal_follow_up']
const REMINDER_TARGET_MODE_OPTIONS = ['single_case', 'selected_cases', 'filtered_results']
const BROADCAST_TARGET_MODE_OPTIONS = ['selected_cases', 'filtered_results']

const POSITIVE_BADGE_VALUES = new Set(['approved', 'active', 'complete', 'paid', 'renewed'])
const WARNING_BADGE_VALUES = new Set([
  'submitted',
  'needs_documents',
  'payment_pending',
  'for_renewal',
  'incomplete',
  'proof_submitted',
  'unpaid',
  'overdue',
  'upcoming',
  'quoted',
  'awaiting_customer',
  'expired',
])
const INFO_BADGE_VALUES = new Set(['under_review', 'for_approval', 'under_verification', 'verifying'])

const SUMMARY_CARD_ICONS = {
  'New Inquiries': ClipboardList,
  'Payment Pending': Wallet,
  'For Renewal': CalendarClock,
  'Needs Documents': FileClock,
}

const DEFAULT_FILTERS = {
  status: 'all',
  paymentStatus: 'all',
  renewalStatus: 'all',
  search: '',
}

const DEFAULT_UPDATE_DRAFT = {
  status: 'submitted',
  reviewNotes: '',
}
const DEFAULT_REMINDER_TYPE = 'missing_documents'
const DEFAULT_REMINDER_TARGET_MODE = 'selected_cases'
const DEFAULT_BROADCAST_TARGET_MODE = 'selected_cases'

const normalizeFilterValue = (value) => (value && value !== 'all' ? value : undefined)

const getBadgeClassName = (value) => {
  if (POSITIVE_BADGE_VALUES.has(value)) return 'badge-green'
  if (WARNING_BADGE_VALUES.has(value)) return 'badge-orange'
  if (INFO_BADGE_VALUES.has(value)) return 'badge-blue'
  return 'badge-gray'
}

const formatReminderTargetModeLabel = (value) => {
  switch (value) {
    case 'single_case':
      return 'Single Case'
    case 'selected_cases':
      return 'Selected Cases'
    case 'filtered_results':
      return 'Filtered Results'
    default:
      return formatStatusLabel(value)
  }
}

const formatDateTime = (value) => {
  if (!value) return 'Not available'

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Not available'
  }

  return parsedDate.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatDateOnly = (value) => {
  if (!value) return 'Not set'

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Not set'
  }

  return parsedDate.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const getTimelineItems = (inquiry) => [
  {
    key: 'submitted',
    label: 'Submitted',
    complete: Boolean(inquiry?.createdAt),
    note: inquiry?.subject || 'Customer intake created',
  },
  {
    key: 'review',
    label: 'Review',
    complete: ['under_review', 'for_approval', 'approved', 'payment_pending', 'active', 'for_renewal', 'closed'].includes(
      inquiry?.status,
    ),
    note: formatStatusLabel(inquiry?.documentStatus || 'incomplete'),
  },
  {
    key: 'payment',
    label: 'Payment',
    complete: ['proof_submitted', 'verifying', 'paid'].includes(inquiry?.paymentStatus),
    note: formatStatusLabel(inquiry?.paymentStatus || 'not_required'),
  },
  {
    key: 'renewal',
    label: 'Renewal',
    complete: ['upcoming', 'quoted', 'awaiting_customer', 'renewed', 'expired'].includes(inquiry?.renewalStatus),
    note: formatStatusLabel(inquiry?.renewalStatus || 'not_applicable'),
  },
]

function SummaryTile({ icon: Icon, label, value, sub }) {
  return (
    <div className="card h-full p-4 md:p-5">
      <div className="flex h-full items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-ink-primary">{value}</p>
          {sub ? <p className="mt-2 max-w-[18rem] text-xs leading-5 text-ink-secondary">{sub}</p> : null}
        </div>
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#f07c00]/15"
          style={{ background: 'rgba(240, 124, 0, 0.14)', color: '#f07c00' }}
        >
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

function WorkspaceStatCard({ label, value, hint, tone = 'gray', badgeLabel = null }) {
  const toneClassName =
    tone === 'orange' ? 'badge-orange' : tone === 'green' ? 'badge-green' : tone === 'blue' ? 'badge-blue' : 'badge-gray'

  return (
    <div className="rounded-2xl border border-surface-border bg-surface-card px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{label}</p>
          <p className="mt-2 text-sm font-semibold text-ink-primary">{value}</p>
          {hint ? <p className="mt-1 text-xs leading-5 text-ink-secondary">{hint}</p> : null}
        </div>
        {badgeLabel ? <span className={`badge ${toneClassName}`}>{badgeLabel}</span> : null}
      </div>
    </div>
  )
}

function BlockingState({ title, copy }) {
  return (
    <div className="empty-panel px-5 py-10 text-center">
      <ShieldAlert size={34} className="mx-auto mb-3" style={{ color: '#f07c00' }} />
      <p className="text-sm font-bold text-ink-primary">{title}</p>
      <p className="mx-auto mt-2 max-w-lg text-xs text-ink-muted">{copy}</p>
    </div>
  )
}

function WorkflowBadge({ value, children }) {
  const label = children ?? formatStatusLabel(value)
  return <span className={`badge ${getBadgeClassName(value)}`}>{label}</span>
}

function DetailField({ label, value }) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">{label}</p>
      <p className="mt-1 text-sm text-ink-primary whitespace-pre-wrap">{value || 'Not set'}</p>
    </div>
  )
}

function EmptyPanel({ title, copy }) {
  return (
    <div className="empty-panel px-4 py-10 text-center">
      <AlertTriangle size={28} className="mx-auto mb-3 text-ink-dim" />
      <p className="text-sm font-bold text-ink-primary">{title}</p>
      <p className="mt-2 text-xs text-ink-muted">{copy}</p>
    </div>
  )
}

function FilterSelect({ label, value, onChange, options, includeAll = true, disabled = false }) {
  return (
    <label className="label">
      {label}
      <select value={value} onChange={onChange} className="select" disabled={disabled}>
        {includeAll ? <option value="all">All</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {formatStatusLabel(option)}
          </option>
        ))}
      </select>
    </label>
  )
}

function InsuranceDetailTabContent({ inquiry, tabKey }) {
  if (!inquiry) {
    return (
      <EmptyPanel
        title="No case selected"
        copy="Choose a case from the insurance table to review its workflow tabs and edit the phase-1 fields."
      />
    )
  }

  if (tabKey === 'overview') {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <DetailField label="Customer" value={inquiry.customerDisplayName} />
        <DetailField label="Vehicle" value={inquiry.vehicleLabel} />
        <DetailField label="Subject" value={inquiry.subject} />
        <DetailField label="Purpose" value={formatStatusLabel(inquiry.purpose)} />
        <DetailField label="Inquiry Type" value={formatStatusLabel(inquiry.inquiryType)} />
        <DetailField label="Assigned Staff" value={inquiry.assignedStaffId} />
        <DetailField label="Provider Name" value={inquiry.providerName} />
        <DetailField label="Policy Number" value={inquiry.policyNumber} />
        <DetailField label="Created" value={formatDateTime(inquiry.createdAt)} />
        <DetailField label="Last Updated" value={formatDateTime(inquiry.updatedAt)} />
        <div className="md:col-span-2">
          <DetailField label="Description" value={inquiry.description} />
        </div>
        <div className="md:col-span-2">
          <DetailField label="Review Notes" value={inquiry.reviewNotes || inquiry.notes} />
        </div>
      </div>
    )
  }

  if (tabKey === 'documents') {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-ink-primary">Document review status</p>
            <WorkflowBadge value={inquiry.documentStatus} />
            <span className="badge badge-gray">{inquiry.documentCount} file(s)</span>
          </div>
        </div>
        {inquiry.documents?.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {inquiry.documents.map((document) => (
              <div
                key={document.id ?? `${document.fileName}-${document.fileUrl}`}
                className="rounded-xl border border-surface-border bg-surface-card px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-ink-primary">{document.fileName}</p>
                    <p className="mt-1 break-all text-xs text-ink-muted">{document.fileUrl}</p>
                  </div>
                  <WorkflowBadge value={document.documentTypeLabel || document.documentType}>
                    {document.documentTypeLabel || formatStatusLabel(document.documentType)}
                  </WorkflowBadge>
                </div>
                {document.notes ? <p className="mt-3 text-xs leading-5 text-ink-secondary">{document.notes}</p> : null}
                <p className="mt-3 text-[11px] text-ink-muted">Uploaded {formatDateTime(document.createdAt)}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyPanel
            title="No uploaded documents yet"
            copy="This case has not received any phase-1 insurance attachments from customer or staff uploads."
          />
        )}
      </div>
    )
  }

  if (tabKey === 'timeline') {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {getTimelineItems(inquiry).map((item) => (
          <div key={item.key} className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink-primary">{item.label}</p>
              <span className={`badge ${item.complete ? 'badge-green' : 'badge-gray'}`}>
                {item.complete ? 'Tracked' : 'Waiting'}
              </span>
            </div>
            <p className="mt-2 text-xs text-ink-muted">{item.note}</p>
          </div>
        ))}
      </div>
    )
  }

  if (tabKey === 'payment') {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <DetailField label="Payment Status" value={formatStatusLabel(inquiry.paymentStatus)} />
        <DetailField label="Payment Due" value={formatDateOnly(inquiry.paymentDueAt)} />
        <div className="md:col-span-2">
          <DetailField label="Payment Notes" value={inquiry.reviewNotes || inquiry.notes} />
        </div>
      </div>
    )
  }

  if (tabKey === 'renewal') {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <DetailField label="Renewal Status" value={formatStatusLabel(inquiry.renewalStatus)} />
        <DetailField label="Policy Expiry" value={formatDateOnly(inquiry.policyExpiryAt)} />
        <DetailField label="Renewal Due" value={formatDateOnly(inquiry.renewalDueAt)} />
        <DetailField label="Assigned Staff" value={inquiry.assignedStaffId} />
      </div>
    )
  }

  return inquiry.activities?.length ? (
    <div className="space-y-3">
      {inquiry.activities.map((activityItem) => (
        <div
          key={activityItem.id ?? `${activityItem.action}-${activityItem.createdAt}`}
          className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-ink-dim" />
              <p className="text-sm font-semibold text-ink-primary">{formatStatusLabel(activityItem.action)}</p>
            </div>
            <p className="text-[11px] text-ink-muted">{formatDateTime(activityItem.createdAt)}</p>
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            Actor: {activityItem.actorUserId || 'System'}{activityItem.documentType ? ` | ${formatStatusLabel(activityItem.documentType)}` : ''}
          </p>
          {activityItem.notes ? <p className="mt-2 text-sm text-ink-secondary">{activityItem.notes}</p> : null}
        </div>
      ))}
    </div>
  ) : (
    <EmptyPanel
      title="No activity recorded yet"
      copy="Activity entries will appear here as staff or customer actions land on the case."
    />
  )
}

export default function InsuranceContent() {
  const user = useUser()
  const role = user?.role ?? null
  const canReviewInsurance = insuranceReviewStaffRoles.includes(role)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [inquiries, setInquiries] = useState([])
  const [selectedInquiryId, setSelectedInquiryId] = useState('')
  const [activeDetailTab, setActiveDetailTab] = useState('overview')
  const [listState, setListState] = useState('idle')
  const [listMessage, setListMessage] = useState('')
  const [detailState, setDetailState] = useState('idle')
  const [detailMessage, setDetailMessage] = useState('')
  const [updateState, setUpdateState] = useState('status_update_ready')
  const [updateMessage, setUpdateMessage] = useState('')
  const [updateDraft, setUpdateDraft] = useState(DEFAULT_UPDATE_DRAFT)
  const [reloadTick, setReloadTick] = useState(0)
  const [selectedInquiryIds, setSelectedInquiryIds] = useState([])
  const [reminderType, setReminderType] = useState(DEFAULT_REMINDER_TYPE)
  const [reminderTargetMode, setReminderTargetMode] = useState(DEFAULT_REMINDER_TARGET_MODE)
  const [reminderState, setReminderState] = useState('idle')
  const [reminderMessage, setReminderMessage] = useState('')
  const [reminderResults, setReminderResults] = useState([])
  const [broadcastTitle, setBroadcastTitle] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastTargetMode, setBroadcastTargetMode] = useState(DEFAULT_BROADCAST_TARGET_MODE)
  const [broadcastState, setBroadcastState] = useState('idle')
  const [broadcastStatusMessage, setBroadcastStatusMessage] = useState('')
  const [broadcastSummary, setBroadcastSummary] = useState(null)
  const [broadcastResults, setBroadcastResults] = useState([])
  const previousSelectedInquiryIdRef = useRef('')
  const selectedInquiryIdRef = useRef('')
  const workspaceStateRef = useRef({
    activeDetailTab: 'overview',
    detailMessage: '',
    detailState: 'idle',
    updateDraft: DEFAULT_UPDATE_DRAFT,
    updateMessage: '',
    updateState: 'status_update_ready',
  })

  workspaceStateRef.current = {
    activeDetailTab,
    detailMessage,
    detailState,
    updateDraft,
    updateMessage,
    updateState,
  }
  selectedInquiryIdRef.current = selectedInquiryId

  const detailTabs = useMemo(() => getInsuranceDetailTabs(), [])

  useEffect(() => {
    if (!user?.accessToken || !canReviewInsurance) {
      setInquiries([])
      setListState('idle')
      return
    }

    let ignore = false

    const loadInquiries = async () => {
      setListState('loading')
      setListMessage('')

      try {
        const records = await listInsuranceInquiries({
          accessToken: user.accessToken,
          status: normalizeFilterValue(filters.status),
          paymentStatus: normalizeFilterValue(filters.paymentStatus),
          renewalStatus: normalizeFilterValue(filters.renewalStatus),
        })

        if (ignore) return

        setInquiries(records)
        setListState('loaded')
      } catch (error) {
        if (ignore) return

        setListState('load_failed')
        setListMessage(error?.message || 'Insurance cases could not be loaded.')
      }
    }

    void loadInquiries()

    return () => {
      ignore = true
    }
  }, [canReviewInsurance, filters.paymentStatus, filters.renewalStatus, filters.status, reloadTick, user?.accessToken])

  const filteredInquiries = useMemo(() => {
    const searchNeedle = filters.search.trim().toLowerCase()

    if (!searchNeedle) {
      return inquiries
    }

    return inquiries.filter((inquiry) =>
      [
        inquiry.id,
        inquiry.customerDisplayName,
        inquiry.vehicleLabel,
        inquiry.subject,
        inquiry.purpose,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchNeedle)),
    )
  }, [filters.search, inquiries])

  useEffect(() => {
    if (!inquiries.length) {
      setSelectedInquiryId('')
      return
    }

    if (!inquiries.some((inquiry) => inquiry.id === selectedInquiryId)) {
      setSelectedInquiryId(inquiries[0].id)
    }
  }, [inquiries, selectedInquiryId])

  const selectedInquiry = useMemo(
    () => inquiries.find((inquiry) => inquiry.id === selectedInquiryId) ?? null,
    [inquiries, selectedInquiryId],
  )

  const nextStatuses = useMemo(
    () => getAllowedInsuranceStatusTargets(selectedInquiry?.status ?? 'closed'),
    [selectedInquiry?.status],
  )

  useEffect(() => {
    if (!selectedInquiry) {
      previousSelectedInquiryIdRef.current = ''
      if (!inquiries.length) {
        setActiveDetailTab(detailTabs[0]?.key ?? 'overview')
        setDetailState('idle')
        setDetailMessage('')
        setUpdateDraft(DEFAULT_UPDATE_DRAFT)
        setUpdateState('status_update_ready')
        setUpdateMessage('')
      }
      return
    }

    const nextViewState = getNextInsuranceWorkspaceViewState({
      currentActiveDetailTab: workspaceStateRef.current.activeDetailTab,
      currentDetailMessage: workspaceStateRef.current.detailMessage,
      currentDetailState: workspaceStateRef.current.detailState,
      currentUpdateDraft: workspaceStateRef.current.updateDraft,
      currentUpdateMessage: workspaceStateRef.current.updateMessage,
      currentUpdateState: workspaceStateRef.current.updateState,
      detailTabs,
      nextInquiry: selectedInquiry,
      nextStatuses,
      previousInquiryId: previousSelectedInquiryIdRef.current,
    })

    previousSelectedInquiryIdRef.current = selectedInquiry.id
    setActiveDetailTab(nextViewState.activeDetailTab)
    setDetailState(nextViewState.detailState)
    setDetailMessage(nextViewState.detailMessage)
    setUpdateDraft(nextViewState.updateDraft)
    setUpdateState(nextViewState.updateState)
    setUpdateMessage(nextViewState.updateMessage)
  }, [detailTabs, inquiries.length, nextStatuses, selectedInquiry])

  const summaryCards = useMemo(
    () => getInsuranceSummaryCards({ inquiries }),
    [inquiries],
  )
  const queueFilterSummary = useMemo(
    () =>
      getInsuranceQueueFilterSummary({
        totalCount: inquiries.length,
        visibleCount: filteredInquiries.length,
        filters,
      }),
    [filteredInquiries.length, filters, inquiries.length],
  )

  const tableRows = useMemo(
    () => filteredInquiries.map((inquiry) => buildInsuranceTableRow(inquiry)),
    [filteredInquiries],
  )
  const selectedVisibleInquiryIds = useMemo(
    () => filteredInquiries.filter((inquiry) => selectedInquiryIds.includes(inquiry.id)).map((inquiry) => inquiry.id),
    [filteredInquiries, selectedInquiryIds],
  )
  const allVisibleSelected =
    filteredInquiries.length > 0 && selectedVisibleInquiryIds.length === filteredInquiries.length
  const reminderResultBreakdown = useMemo(
    () => ({
      skipped: reminderResults.filter((result) => result.result === 'skipped'),
      failed: reminderResults.filter((result) => result.result === 'failed'),
    }),
    [reminderResults],
  )
  const broadcastResultBreakdown = useMemo(
    () => ({
      sent: broadcastResults.filter((result) => result.status === 'sent'),
      skipped: broadcastResults.filter((result) => result.status === 'skipped'),
      failed: broadcastResults.filter((result) => result.status === 'failed'),
    }),
    [broadcastResults],
  )
  const reminderComposerState = useMemo(
    () =>
      getInsuranceReminderComposerState({
        targetMode: reminderTargetMode,
        selectedInquiryId,
        selectedInquiryIds,
        selectedVisibleInquiryIds,
        filteredCount: filteredInquiries.length,
      }),
    [filteredInquiries.length, reminderTargetMode, selectedInquiryId, selectedInquiryIds, selectedVisibleInquiryIds],
  )
  const broadcastComposerState = useMemo(
    () =>
      getInsuranceBroadcastComposerState({
        targetMode: broadcastTargetMode,
        selectedInquiryIds,
        filteredCount: filteredInquiries.length,
        title: broadcastTitle,
        message: broadcastMessage,
      }),
    [broadcastMessage, broadcastTargetMode, broadcastTitle, filteredInquiries.length, selectedInquiryIds],
  )
  const currentCaseLabel = selectedInquiry?.subject || selectedInquiry?.id || 'No case selected'

  const handleFilterChange = (field) => (event) => {
    const nextValue = event.target.value

    setFilters((current) => ({
      ...current,
      [field]: nextValue,
    }))
  }

  useEffect(() => {
    setSelectedInquiryIds((currentIds) =>
      currentIds.filter((inquiryId) => inquiries.some((inquiry) => inquiry.id === inquiryId)),
    )
  }, [inquiries])

  const toggleInquirySelection = (inquiryId) => {
    setSelectedInquiryIds((currentIds) =>
      currentIds.includes(inquiryId)
        ? currentIds.filter((currentId) => currentId !== inquiryId)
        : [...currentIds, inquiryId],
    )
  }

  const handleToggleAllVisible = () => {
    if (!filteredInquiries.length) {
      return
    }

    setSelectedInquiryIds((currentIds) => {
      const visibleIds = filteredInquiries.map((inquiry) => inquiry.id)

      if (visibleIds.every((id) => currentIds.includes(id))) {
        return currentIds.filter((id) => !visibleIds.includes(id))
      }

      return [...new Set([...currentIds, ...visibleIds])]
    })
  }

  const handleRefreshDetail = async () => {
    if (!selectedInquiry?.id || !user?.accessToken) {
      return
    }

    const requestInquiryId = selectedInquiry.id

    setDetailState('loading')
    setDetailMessage('')

    try {
      const liveInquiry = await getInsuranceInquiryById({
        inquiryId: requestInquiryId,
        accessToken: user.accessToken,
      })

      setInquiries((currentInquiries) =>
        currentInquiries.map((inquiry) => (inquiry.id === liveInquiry.id ? liveInquiry : inquiry)),
      )
      if (
        shouldApplyInsuranceAsyncResult({
          requestInquiryId,
          selectedInquiryId: selectedInquiryIdRef.current,
        })
      ) {
        setDetailState('detail_loaded')
        setDetailMessage('Live insurance detail refreshed from the backend.')
      }
    } catch (error) {
      if (
        !shouldApplyInsuranceAsyncResult({
          requestInquiryId,
          selectedInquiryId: selectedInquiryIdRef.current,
        })
      ) {
        return
      }

      if (error instanceof ApiError && error.status === 404) {
        setDetailState('inquiry_not_found')
      } else if (error instanceof ApiError && error.status === 403) {
        setDetailState('forbidden_role')
      } else {
        setDetailState('load_failed')
      }

      setDetailMessage(error?.message || 'Insurance inquiry detail could not be refreshed.')
    }
  }

  const handleSaveStatus = async () => {
    if (!selectedInquiry?.id) {
      setUpdateState('inquiry_not_found')
      setUpdateMessage('Select a live insurance case before saving workflow changes.')
      return
    }

    if (!user?.accessToken) {
      setUpdateState('update_failed')
      setUpdateMessage('A valid staff session is required before saving workflow changes.')
      return
    }

    const requestInquiryId = selectedInquiry.id

    setUpdateState('status_update_submitting')
    setUpdateMessage('')

    try {
      const updatedInquiry = await updateInsuranceInquiryStatus({
        inquiryId: requestInquiryId,
        status: updateDraft.status,
        reviewNotes: updateDraft.reviewNotes,
        accessToken: user.accessToken,
      })

      setInquiries((currentInquiries) =>
        currentInquiries.map((inquiry) => (inquiry.id === updatedInquiry.id ? updatedInquiry : inquiry)),
      )
      if (
        shouldApplyInsuranceAsyncResult({
          requestInquiryId,
          selectedInquiryId: selectedInquiryIdRef.current,
        })
      ) {
        setUpdateState('status_update_saved')
        setUpdateMessage(`Insurance workflow updated to ${formatStatusLabel(updatedInquiry.status)}.`)
      }
    } catch (error) {
      if (
        !shouldApplyInsuranceAsyncResult({
          requestInquiryId,
          selectedInquiryId: selectedInquiryIdRef.current,
        })
      ) {
        return
      }

      if (error instanceof ApiError && error.status === 404) {
        setUpdateState('inquiry_not_found')
      } else if (error instanceof ApiError && error.status === 403) {
        setUpdateState('forbidden_role')
      } else if (error instanceof ApiError && error.status === 409) {
        setUpdateState('invalid_transition')
      } else {
        setUpdateState('update_failed')
      }

      setUpdateMessage(error?.message || 'Insurance workflow could not be updated.')
    }
  }

  const handleSendReminder = async () => {
    if (!user?.accessToken) {
      setReminderState('failed')
      setReminderMessage('A valid staff session is required before sending insurance reminders.')
      return
    }

    setReminderState('submitting')
    setReminderMessage('')
    setReminderResults([])

    try {
      const reminderPayload = buildInsuranceReminderRequest({
        reminderType,
        targetMode: reminderTargetMode,
        selectedIds: reminderTargetMode === 'single_case' ? [selectedInquiryId] : selectedInquiryIds,
        filters,
      })

      const reminderSummary = await sendInsuranceReminders({
        ...reminderPayload,
        accessToken: user.accessToken,
      })

      setReminderState('sent')
      setReminderResults(Array.isArray(reminderSummary?.results) ? reminderSummary.results : [])
      setReminderMessage(summarizeInsuranceReminderResult(reminderSummary))
    } catch (error) {
      setReminderState('failed')
      setReminderMessage(error?.message || 'Insurance reminders could not be sent.')
    }
  }

  const handleSendBroadcast = async () => {
    if (!user?.accessToken) {
      setBroadcastState('failed')
      setBroadcastStatusMessage('A valid staff session is required before sending custom broadcasts.')
      return
    }

    setBroadcastState('submitting')
    setBroadcastStatusMessage('')
    setBroadcastSummary(null)
    setBroadcastResults([])

    try {
      const broadcastPayload = buildInsuranceBroadcastRequest({
        targetMode: broadcastTargetMode,
        selectedIds: selectedInquiryIds,
        filters,
        title: broadcastTitle,
        message: broadcastMessage,
      })

      const broadcastSummary = await sendInsuranceBroadcasts({
        ...broadcastPayload,
        accessToken: user.accessToken,
      })

      setBroadcastState('sent')
      setBroadcastSummary(broadcastSummary)
      setBroadcastResults(Array.isArray(broadcastSummary?.results) ? broadcastSummary.results : [])
      setBroadcastStatusMessage(summarizeInsuranceBroadcastResult(broadcastSummary))
    } catch (error) {
      setBroadcastState('failed')
      setBroadcastStatusMessage(error?.message || 'Custom insurance broadcasts could not be sent.')
    }
  }

  if (!canReviewInsurance) {
    return (
      <div className="space-y-5">
        <BlockingState
          title="Insurance review is adviser/admin only"
          copy="This workspace is reserved for service advisers and super admins. The page also blocks direct navigation for non-authorized roles."
        />
      </div>
    )
  }

  return (
    <div className="ops-page-shell">
      <PageHeader
        eyebrow="Insurance Review Workspace"
        title="Live Staff Insurance Queue"
        description="Phase-1 insurance cases now load from the staff list contract, with workflow summary cards, queue filters, detail tabs, and follow-up updates in one workspace."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className={`badge ${selectedInquiryIds.length ? 'badge-orange' : 'badge-gray'}`}>
              {selectedInquiryIds.length} selected
            </span>
            <span className={`badge ${filteredInquiries.length ? 'badge-blue' : 'badge-gray'}`}>
              {filteredInquiries.length} visible
            </span>
            <button
              onClick={() => setReloadTick((current) => current + 1)}
              className="ops-action-secondary"
              disabled={listState === 'loading'}
            >
              <RefreshCw size={14} className={listState === 'loading' ? 'animate-spin' : undefined} />
              Refresh Queue
            </button>
          </div>
        }
        meta={
          <>
            <span className="badge badge-green">Staff list ready</span>
            <span className="badge badge-orange">Payment follow-up ready</span>
            <span className="badge badge-green">Renewal review ready</span>
            <span className="badge badge-orange">Manual reminders ready</span>
            <span className="badge badge-green">Custom broadcasts ready</span>
          </>
        }
      />

      <div className="ops-summary-grid">
        {summaryCards.map((card) => {
          const Icon = SUMMARY_CARD_ICONS[card.label] ?? ClipboardList
          return <SummaryTile key={card.label} icon={Icon} {...card} />
        })}
      </div>

      <div className="card p-4 md:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <p className="card-title">Queue Filters</p>
            <p className="mt-1 text-xs leading-5 text-ink-muted">
              Status filters call the live staff list route. Search narrows the visible table without another request.
            </p>
            <p className="mt-3 text-sm font-semibold text-ink-primary">{queueFilterSummary.headline}</p>
            <p className="mt-1 text-xs leading-5 text-ink-secondary">{queueFilterSummary.detail}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[480px] xl:max-w-[640px]">
            <WorkspaceStatCard
              label="Current case"
              value={currentCaseLabel}
              hint={selectedInquiry ? formatStatusLabel(selectedInquiry.status) : 'Select a row below to load detail tabs and workflow actions.'}
              tone={selectedInquiry ? 'green' : 'gray'}
              badgeLabel={selectedInquiry ? 'Focused' : 'Idle'}
            />
            <WorkspaceStatCard
              label="Queue selection"
              value={allVisibleSelected ? 'All visible cases selected' : `${selectedVisibleInquiryIds.length} visible selected`}
              hint={selectedInquiryIds.length ? `${selectedInquiryIds.length} total case${selectedInquiryIds.length === 1 ? '' : 's'} checked` : 'Use checkboxes to prepare reminder or broadcast sends.'}
              tone={selectedInquiryIds.length ? 'orange' : 'gray'}
              badgeLabel={selectedInquiryIds.length ? 'Checked' : 'Empty'}
            />
            <WorkspaceStatCard
              label="Queue health"
              value={listState === 'loading' ? 'Refreshing live queue' : listState === 'load_failed' ? 'Attention needed' : 'Live queue ready'}
              hint={listState === 'load_failed' ? 'Refresh the queue or relax one of the server filters.' : queueFilterSummary.hasActiveFilters ? 'Filters are active on the live queue.' : 'All live cases are currently in view.'}
              tone={listState === 'load_failed' ? 'orange' : 'blue'}
              badgeLabel={listState === 'load_failed' ? 'Watch' : listState === 'loading' ? 'Syncing' : 'Live'}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="label xl:col-span-1">
            Search
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim" />
              <input
                value={filters.search}
                onChange={handleFilterChange('search')}
                className="input pl-9"
                placeholder="Case id, customer, vehicle, or purpose"
              />
            </div>
          </label>
          <FilterSelect
            label="Status"
            value={filters.status}
            onChange={handleFilterChange('status')}
            options={INQUIRY_STATUS_OPTIONS}
          />
          <FilterSelect
            label="Payment"
            value={filters.paymentStatus}
            onChange={handleFilterChange('paymentStatus')}
            options={PAYMENT_STATUS_OPTIONS}
          />
          <FilterSelect
            label="Renewal"
            value={filters.renewalStatus}
            onChange={handleFilterChange('renewalStatus')}
            options={RENEWAL_STATUS_OPTIONS}
          />
        </div>

        {listMessage ? <div className="status-message status-message-danger mt-4">{listMessage}</div> : null}

        <div className="mt-4 rounded-2xl border border-surface-border bg-surface-raised px-4 py-4 md:px-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-ink-primary">Manual Reminder Send</p>
              <p className="mt-1 text-xs leading-5 text-ink-muted">
                Send in-app insurance reminders to the current case, checked cases, or the current server-side queue filters.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 xl:max-w-[460px] xl:justify-end">
              <span className={`badge ${selectedInquiryId ? 'badge-green' : 'badge-gray'}`}>Current case {selectedInquiryId ? 'ready' : 'missing'}</span>
              <span className={`badge ${selectedInquiryIds.length ? 'badge-orange' : 'badge-gray'}`}>{selectedInquiryIds.length} selected</span>
              <span className={`badge ${filteredInquiries.length ? 'badge-blue' : 'badge-gray'}`}>{filteredInquiries.length} visible</span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="label">
              Reminder Type
              <select value={reminderType} onChange={(event) => setReminderType(event.target.value)} className="select">
                {REMINDER_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {formatStatusLabel(option)}
                  </option>
                ))}
              </select>
            </label>

            <label className="label">
              Target Mode
              <select
                value={reminderTargetMode}
                onChange={(event) => setReminderTargetMode(event.target.value)}
                className="select"
              >
                {REMINDER_TARGET_MODE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {formatReminderTargetModeLabel(option)}
                  </option>
                ))}
              </select>
            </label>

            <WorkspaceStatCard
              label="Audience"
              value={reminderComposerState.audienceLabel}
              hint={reminderComposerState.scopeLabel}
              tone={reminderComposerState.canSend ? 'green' : 'gray'}
              badgeLabel={reminderComposerState.canSend ? 'Ready' : 'Pending'}
            />

            <WorkspaceStatCard
              label="Readiness"
              value={reminderComposerState.readinessLabel}
              hint={reminderTargetMode === 'filtered_results' ? queueFilterSummary.detail : currentCaseLabel}
              tone={reminderComposerState.canSend ? 'orange' : 'gray'}
              badgeLabel={reminderComposerState.canSend ? 'Ready' : 'Hold'}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <button onClick={handleToggleAllVisible} disabled={!filteredInquiries.length} className="ops-action-secondary">
              {allVisibleSelected ? 'Clear visible selection' : 'Select visible cases'}
            </button>
            <button
              onClick={() => setSelectedInquiryIds([])}
              disabled={!selectedInquiryIds.length}
              className="ops-action-secondary"
            >
              Clear selected cases
            </button>
            <button
              onClick={handleSendReminder}
              disabled={reminderState === 'submitting' || !reminderComposerState.canSend}
              className="ops-action-primary"
            >
              {reminderState === 'submitting' ? <RefreshCw size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
              Send Reminder
            </button>
            <span className="text-xs text-ink-muted">
              {reminderComposerState.canSend ? 'Send is scoped and ready.' : reminderComposerState.readinessLabel}
            </span>
          </div>

          {reminderMessage ? (
            <div
              className={`mt-4 ${
                reminderState === 'sent'
                  ? 'status-message status-message-success'
                  : 'status-message status-message-danger'
              }`}
            >
              {reminderMessage}
            </div>
          ) : null}

          {reminderResults.length ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-3">
                <p className="text-sm font-semibold text-ink-primary">Skipped cases</p>
                {reminderResultBreakdown.skipped.length ? (
                  <ul className="mt-2 space-y-2 text-xs text-ink-secondary">
                    {reminderResultBreakdown.skipped.map((result) => (
                      <li key={`${result.inquiryId}-${result.result}`}>
                        {result.inquiryId}: {formatStatusLabel(result.reason ?? 'skipped')}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-ink-muted">No cases were skipped in the last reminder send.</p>
                )}
              </div>
              <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-3">
                <p className="text-sm font-semibold text-ink-primary">Failed cases</p>
                {reminderResultBreakdown.failed.length ? (
                  <ul className="mt-2 space-y-2 text-xs text-ink-secondary">
                    {reminderResultBreakdown.failed.map((result) => (
                      <li key={`${result.inquiryId}-${result.result}`}>
                        {result.inquiryId}: {formatStatusLabel(result.reason ?? 'failed')}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-ink-muted">No cases failed in the last reminder send.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-4 rounded-2xl border border-surface-border bg-surface-raised px-4 py-4 md:px-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-ink-primary">Custom Broadcast Send</p>
              <p className="mt-1 text-xs leading-5 text-ink-muted">
                Send a custom in-app broadcast to checked cases or the current server-filtered insurance queue audience.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 xl:max-w-[460px] xl:justify-end">
              <span className={`badge ${selectedInquiryIds.length ? 'badge-orange' : 'badge-gray'}`}>
                {selectedInquiryIds.length} selected
              </span>
              <span className={`badge ${filteredInquiries.length ? 'badge-blue' : 'badge-gray'}`}>
                {filteredInquiries.length} visible
              </span>
              <span className={`badge ${broadcastSummary ? 'badge-green' : 'badge-gray'}`}>
                {broadcastSummary ? 'Last send recorded' : 'No send yet'}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="label">
              Target Mode
              <select
                value={broadcastTargetMode}
                onChange={(event) => setBroadcastTargetMode(event.target.value)}
                className="select"
              >
                {BROADCAST_TARGET_MODE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {formatReminderTargetModeLabel(option)}
                  </option>
                ))}
              </select>
            </label>

            <WorkspaceStatCard
              label="Audience"
              value={broadcastComposerState.audienceLabel}
              hint={broadcastComposerState.scopeLabel}
              tone={broadcastComposerState.canSend ? 'green' : 'gray'}
              badgeLabel={broadcastComposerState.canSend ? 'Ready' : 'Pending'}
            />

            <WorkspaceStatCard
              label="Readiness"
              value={broadcastComposerState.readinessLabel}
              hint={broadcastTargetMode === 'filtered_results' ? queueFilterSummary.detail : `${selectedInquiryIds.length} manually selected case${selectedInquiryIds.length === 1 ? '' : 's'}`}
              tone={broadcastComposerState.canSend ? 'orange' : 'gray'}
              badgeLabel={broadcastComposerState.canSend ? 'Ready' : 'Hold'}
            />

            <WorkspaceStatCard
              label="Message health"
              value={broadcastTitle.trim() ? 'Title ready' : 'Title required'}
              hint={broadcastMessage.trim() ? 'Broadcast message is filled in.' : 'Add a concise in-app message before sending.'}
              tone={broadcastTitle.trim() && broadcastMessage.trim() ? 'blue' : 'gray'}
              badgeLabel={broadcastTitle.trim() && broadcastMessage.trim() ? 'Draft ready' : 'Drafting'}
            />
          </div>

          <div className="mt-4 grid gap-3">
            <label className="label">
              Broadcast Title
              <input
                value={broadcastTitle}
                onChange={(event) => setBroadcastTitle(event.target.value)}
                className="input"
                maxLength={120}
                placeholder="Insurance update for your app inbox"
              />
            </label>

            <label className="label">
              Broadcast Message
              <textarea
                value={broadcastMessage}
                onChange={(event) => setBroadcastMessage(event.target.value)}
                rows={4}
                maxLength={1000}
                className="input min-h-[140px] resize-y"
                placeholder="Share the next action customers should take for the selected insurance audience."
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <button onClick={handleToggleAllVisible} disabled={!filteredInquiries.length} className="ops-action-secondary">
              {allVisibleSelected ? 'Clear visible selection' : 'Select visible cases'}
            </button>
            <button
              onClick={() => setSelectedInquiryIds([])}
              disabled={!selectedInquiryIds.length}
              className="ops-action-secondary"
            >
              Clear selected cases
            </button>
            <button
              onClick={handleSendBroadcast}
              disabled={broadcastState === 'submitting' || !broadcastComposerState.canSend}
              className="ops-action-primary"
            >
              {broadcastState === 'submitting' ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <ShieldCheck size={14} />
              )}
              Send Broadcast
            </button>
            <span className="text-xs text-ink-muted">
              {broadcastComposerState.canSend ? 'Custom broadcast is ready for the selected audience.' : broadcastComposerState.readinessLabel}
            </span>
          </div>

          {broadcastStatusMessage ? (
            <div
              className={`mt-4 ${
                broadcastState === 'sent'
                  ? 'status-message status-message-success'
                  : 'status-message status-message-danger'
              }`}
            >
              {broadcastStatusMessage}
            </div>
          ) : null}

          {broadcastSummary ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-3">
                <p className="text-sm font-semibold text-ink-primary">Broadcast Results</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`badge ${broadcastResultBreakdown.sent.length ? 'badge-green' : 'badge-gray'}`}>
                    {broadcastResultBreakdown.sent.length} sent
                  </span>
                  <span className={`badge ${broadcastResultBreakdown.skipped.length ? 'badge-orange' : 'badge-gray'}`}>
                    {broadcastResultBreakdown.skipped.length} skipped
                  </span>
                  <span className={`badge ${broadcastResultBreakdown.failed.length ? 'badge-red' : 'badge-gray'}`}>
                    {broadcastResultBreakdown.failed.length} failed
                  </span>
                </div>
                <div className="mt-3 space-y-1 text-xs text-ink-muted">
                  <p>
                    Targeted at send time: {broadcastSummary.targetedCaseCount ?? 0} case
                    {(broadcastSummary.targetedCaseCount ?? 0) === 1 ? '' : 's'}.
                  </p>
                  <p>
                    Eligible: {broadcastSummary.eligibleCaseCount ?? 0} case
                    {(broadcastSummary.eligibleCaseCount ?? 0) === 1 ? '' : 's'}.
                  </p>
                  <p>
                    Deduplicated audience: {broadcastSummary.deduplicatedCustomerCount ?? 0} customer
                    {(broadcastSummary.deduplicatedCustomerCount ?? 0) === 1 ? '' : 's'}.
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-3">
                <p className="text-sm font-semibold text-ink-primary">Last Broadcast Results</p>
                <ul className="mt-3 space-y-2 text-xs text-ink-secondary">
                  {broadcastResults.map((result) => (
                    <li key={`${result.inquiryId}-${result.customerId ?? 'no-customer'}-${result.status}`}>
                      <span className="font-semibold text-ink-primary">{result.inquiryId}</span>
                      {`: ${formatStatusLabel(result.status)}`}
                      {result.customerId ? ` | ${result.customerId}` : ' | No customer linked'}
                      {result.reason ? ` | ${formatStatusLabel(result.reason)}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="table-surface">
          <div className="flex flex-col gap-2 border-b border-surface-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="card-title">Insurance Case List</p>
              <p className="mt-1 text-xs text-ink-muted">
                Customer, vehicle, and workflow tags stay visible in the main review table.
              </p>
            </div>
            <span className={`badge ${filteredInquiries.length ? 'badge-orange' : 'badge-gray'}`}>
              {filteredInquiries.length} visible case{filteredInquiries.length === 1 ? '' : 's'}
            </span>
          </div>

          {listState === 'loading' ? (
            <div className="px-4 py-8 text-sm text-ink-muted">Loading live insurance cases...</div>
          ) : filteredInquiries.length ? (
            <div className="table-scroll">
              <table className="data-table min-w-[920px]">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={handleToggleAllVisible}
                        aria-label="Select all visible insurance cases"
                      />
                    </th>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th>Status</th>
                    <th>Documents</th>
                    <th>Payment</th>
                    <th>Renewal</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, index) => {
                    const inquiry = filteredInquiries[index]
                    const isSelected = inquiry.id === selectedInquiryId

                    return (
                      <tr
                        key={row.key}
                        onClick={() => setSelectedInquiryId(inquiry.id)}
                        className={isSelected ? 'bg-[#f07c00]/10' : undefined}
                        style={{ cursor: 'pointer' }}
                      >
                        <td onClick={(event) => event.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedInquiryIds.includes(inquiry.id)}
                            onChange={() => toggleInquirySelection(inquiry.id)}
                            aria-label={`Select insurance case ${inquiry.subject || inquiry.id}`}
                          />
                        </td>
                        <td>
                          <div className="space-y-1">
                            <p className="font-semibold text-ink-primary">{row.customer}</p>
                            <p className="text-xs text-ink-muted">{inquiry.subject || inquiry.id}</p>
                          </div>
                        </td>
                        <td>{row.vehicle}</td>
                        <td>
                          <WorkflowBadge value={inquiry.status}>{row.status}</WorkflowBadge>
                        </td>
                        <td>
                          <WorkflowBadge value={inquiry.documentStatus}>{row.documentStatus}</WorkflowBadge>
                        </td>
                        <td>
                          <WorkflowBadge value={inquiry.paymentStatus}>{row.paymentStatus}</WorkflowBadge>
                        </td>
                        <td>
                          <WorkflowBadge value={inquiry.renewalStatus}>
                            {row.renewalStatus || formatStatusLabel(inquiry.renewalStatus)}
                          </WorkflowBadge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel
              title="No cases match the current filters"
              copy={
                queueFilterSummary.hasActiveFilters
                  ? 'Relax one of the active queue filters or refresh the live list to bring cases back into view.'
                  : 'No live insurance cases are showing yet. Refresh the queue after new intake arrives.'
              }
            />
          )}
        </section>

        <div className="space-y-5">
          <div className="card p-4 md:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="card-title">Case Detail</p>
                <p className="mt-1 text-xs text-ink-muted">
                  The detail workspace is split into helper-driven tabs so overview, documents, payment, renewal, and activity stay predictable.
                </p>
              </div>
              <button
                onClick={handleRefreshDetail}
                disabled={!selectedInquiry || detailState === 'loading'}
                className="ops-action-secondary"
              >
                {detailState === 'loading' ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Refresh Detail
              </button>
            </div>

            {detailMessage ? (
              <div
                className={`mt-4 ${
                  detailState === 'detail_loaded'
                    ? 'status-message status-message-success'
                    : detailState === 'forbidden_role'
                      ? 'status-message status-message-warning'
                      : 'status-message status-message-danger'
                }`}
              >
                {detailMessage}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {detailTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveDetailTab(tab.key)}
                  className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                    activeDetailTab === tab.key
                      ? 'border-[#f07c00] bg-[#f07c00]/10 text-[#f5a13d]'
                      : 'border-surface-border bg-surface-card text-ink-secondary hover:border-[#f07c00]/40 hover:text-ink-primary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <InsuranceDetailTabContent inquiry={selectedInquiry} tabKey={activeDetailTab} />
            </div>
          </div>

          <div className="card p-4 md:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="card-title">Workflow Update</p>
                <p className="mt-1 text-xs text-ink-muted">
                  This save form follows the live backend contract. Other workflow fields stay visible in the detail tabs for review.
                </p>
              </div>
              <span className={`badge ${nextStatuses.length ? 'badge-green' : 'badge-gray'}`}>
                {nextStatuses.length ? `${nextStatuses.length} valid next state${nextStatuses.length === 1 ? '' : 's'}` : 'No valid transition'}
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="label">
                Next Status
                <select
                  value={updateDraft.status}
                  onChange={(event) =>
                    setUpdateDraft((current) => ({ ...current, status: event.target.value }))
                  }
                  className="select"
                  disabled={!selectedInquiry || !nextStatuses.length}
                >
                  {nextStatuses.length ? (
                    nextStatuses.map((status) => (
                      <option key={status} value={status}>
                        {formatStatusLabel(status)}
                      </option>
                    ))
                  ) : (
                    <option value={selectedInquiry?.status ?? 'closed'}>
                      {selectedInquiry ? 'No valid transition available' : 'Select a case first'}
                    </option>
                  )}
                </select>
              </label>

              <label className="label md:col-span-2">
                Review Notes
                <textarea
                  value={updateDraft.reviewNotes}
                  onChange={(event) =>
                    setUpdateDraft((current) => ({ ...current, reviewNotes: event.target.value }))
                  }
                  rows={4}
                  className="input min-h-[120px] resize-y"
                  placeholder="Capture staff notes for the next workflow step."
                />
              </label>
            </div>

            {updateMessage ? (
              <div
                className={`mt-4 ${
                  updateState === 'status_update_saved'
                    ? 'status-message status-message-success'
                    : updateState === 'forbidden_role'
                      ? 'status-message status-message-warning'
                      : 'status-message status-message-danger'
                }`}
              >
                {updateMessage}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={handleSaveStatus}
                disabled={!selectedInquiry || !nextStatuses.length || updateState === 'status_update_submitting'}
                className="ops-action-primary"
              >
                {updateState === 'status_update_submitting' ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <ShieldCheck size={14} />
                )}
                Save Workflow Update
              </button>
              <span className="badge badge-gray">
                {!selectedInquiry
                  ? 'Pick a case to edit'
                  : nextStatuses.length
                    ? 'Status and review notes only'
                    : 'No transition available'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
