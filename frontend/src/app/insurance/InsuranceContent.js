'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as CheckboxPrimitives from '@radix-ui/react-checkbox'
import * as Collapsible from '@radix-ui/react-collapsible'
import * as ScrollAreaPrimitives from '@radix-ui/react-scroll-area'
import * as TabsPrimitives from '@radix-ui/react-tabs'
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
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
  buildInsurancePrimaryFocus,
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
  buildInsuranceWorkspaceSections,
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

function SurfaceCheckbox({ checked, onCheckedChange, label }) {
  return (
    <CheckboxPrimitives.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={label}
      className="primitive-checkbox"
    >
      <CheckboxPrimitives.Indicator className="flex items-center justify-center text-black">
        <Check size={12} strokeWidth={3} />
      </CheckboxPrimitives.Indicator>
    </CheckboxPrimitives.Root>
  )
}

function WorkspaceSectionHeader({ title, description, action = null }) {
  return (
    <div className="flex flex-col gap-3 border-b border-surface-border px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="max-w-2xl">
        <p className="card-title">{title}</p>
        {description ? <p className="mt-1 text-xs leading-5 text-ink-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

function FocusPanel({ title, description, tone = 'neutral', meta = [] }) {
  const badgeClass =
    tone === 'ready' ? 'badge-green' : tone === 'attention' ? 'badge-orange' : 'badge-gray'

  return (
    <div className="rounded-2xl border border-surface-border bg-surface-raised px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink-primary">{title}</p>
          <p className="mt-1 text-xs leading-5 text-ink-secondary">{description}</p>
        </div>
        <span className={`badge ${badgeClass}`}>{tone === 'ready' ? 'Ready' : tone === 'attention' ? 'Next step' : 'Guide'}</span>
      </div>
      {meta.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {meta.map((item) => (
            <span key={item} className="badge badge-gray">
              {item}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function CompactActionPanel({
  title,
  description,
  open,
  onOpenChange,
  summary,
  children,
}) {
  return (
    <Collapsible.Root open={open} onOpenChange={onOpenChange} className="rounded-2xl border border-surface-border bg-surface-card">
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-primary">{title}</p>
          <p className="mt-1 text-xs leading-5 text-ink-muted">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {summary}
          <Collapsible.Trigger className="ops-action-secondary">
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {open ? 'Hide panel' : 'Open panel'}
          </Collapsible.Trigger>
        </div>
      </div>
      <Collapsible.Content className="border-t border-surface-border px-4 py-4">
        {children}
      </Collapsible.Content>
    </Collapsible.Root>
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
  const [isReminderPanelOpen, setIsReminderPanelOpen] = useState(false)
  const [isBroadcastPanelOpen, setIsBroadcastPanelOpen] = useState(false)
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

  const queueFilterSummary = useMemo(
    () =>
      getInsuranceQueueFilterSummary({
        totalCount: inquiries.length,
        visibleCount: filteredInquiries.length,
        filters,
      }),
    [filteredInquiries.length, filters, inquiries.length],
  )

  const activeFilterCount = useMemo(
    () =>
      [filters.status, filters.paymentStatus, filters.renewalStatus]
        .filter((value) => value && value !== 'all').length + (filters.search.trim() ? 1 : 0),
    [filters],
  )

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
  const workspaceSections = useMemo(() => buildInsuranceWorkspaceSections(), [])
  const primaryFocus = useMemo(
    () =>
      buildInsurancePrimaryFocus({
        selectedInquiry,
        selectedCount: selectedInquiryIds.length,
        filteredCount: filteredInquiries.length,
        activeFilterCount,
      }),
    [activeFilterCount, filteredInquiries.length, selectedInquiry, selectedInquiryIds.length],
  )

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
        description="Review cases, update status, and manage follow-ups in one workspace."
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
      />

      <div className="ops-summary-grid">
        {summaryCards.map((card) => {
          const Icon = SUMMARY_CARD_ICONS[card.label] ?? ClipboardList
          return <SummaryTile key={card.label} icon={Icon} {...card} />
        })}
      </div>

      <div className="card p-4 md:p-5">
        <WorkspaceSectionHeader
          title={workspaceSections.queue.title}
          description={workspaceSections.queue.description}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <span className={`badge ${selectedInquiryIds.length ? 'badge-orange' : 'badge-gray'}`}>{selectedInquiryIds.length} selected</span>
              <span className={`badge ${filteredInquiries.length ? 'badge-blue' : 'badge-gray'}`}>{filteredInquiries.length} visible</span>
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
        />

        <div className="grid gap-4 px-4 py-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="label xl:col-span-1">
              Search
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim" />
                <input
                  value={filters.search}
                  onChange={handleFilterChange('search')}
                  className="input pl-9"
                  placeholder="Find by case, customer, or vehicle"
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

          <FocusPanel
            title={primaryFocus.title}
            description={primaryFocus.description}
            tone={primaryFocus.tone}
            meta={[
              queueFilterSummary.headline,
              activeFilterCount ? `${activeFilterCount} active filter${activeFilterCount === 1 ? '' : 's'}` : 'All live cases in view',
            ]}
          />
        </div>

        {listMessage ? <div className="status-message status-message-danger mx-4 mb-4">{listMessage}</div> : null}

        <div className="grid gap-4 px-4 pb-4">
          <CompactActionPanel
            title="Manual Reminder Send"
            description="Open only when you need to follow up on a selected case or filtered queue."
            open={isReminderPanelOpen}
            onOpenChange={setIsReminderPanelOpen}
            summary={
              <>
                <span className={`badge ${selectedInquiry ? 'badge-green' : 'badge-gray'}`}>{selectedInquiry ? 'Case ready' : 'Pick a case'}</span>
                <span className={`badge ${reminderComposerState.canSend ? 'badge-orange' : 'badge-gray'}`}>{reminderComposerState.canSend ? 'Ready to send' : 'Pending'}</span>
              </>
            }
          >
            <div className="grid gap-3 md:grid-cols-2">
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
              <span className="text-xs text-ink-secondary">
                {reminderComposerState.audienceLabel} • {reminderComposerState.summaryLabel}
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
          </CompactActionPanel>

          <CompactActionPanel
            title="Custom Broadcast Send"
            description="Use this only when you need a broader insurance-only in-app message."
            open={isBroadcastPanelOpen}
            onOpenChange={setIsBroadcastPanelOpen}
            summary={
              <>
                <span className={`badge ${selectedInquiryIds.length ? 'badge-orange' : 'badge-gray'}`}>{selectedInquiryIds.length} selected</span>
                <span className={`badge ${broadcastComposerState.canSend ? 'badge-green' : 'badge-gray'}`}>{broadcastComposerState.canSend ? 'Draft ready' : 'Drafting'}</span>
              </>
            }
          >
            <div className="grid gap-3 md:grid-cols-2">
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
                  placeholder="Tell customers the next step."
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
              <span className="text-xs text-ink-secondary">
                {broadcastComposerState.audienceLabel} • {broadcastComposerState.summaryLabel}
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
          </CompactActionPanel>
        </div>
      </div>

      <div className="grid gap-5">
        <section className="table-surface">
          <WorkspaceSectionHeader
            title="Insurance Case List"
            description={queueFilterSummary.detail}
            action={
              <span className={`badge ${filteredInquiries.length ? 'badge-orange' : 'badge-gray'}`}>
                {filteredInquiries.length} visible case{filteredInquiries.length === 1 ? '' : 's'}
              </span>
            }
          />

          {listState === 'loading' ? (
            <div className="px-4 py-8 text-sm text-ink-muted">Loading live insurance cases...</div>
          ) : filteredInquiries.length ? (
            <ScrollAreaPrimitives.Root className="table-scroll">
              <ScrollAreaPrimitives.Viewport>
              <table className="data-table w-full min-w-[1120px]">
                <thead>
                  <tr>
                    <th>
                      <SurfaceCheckbox
                        checked={allVisibleSelected}
                        onCheckedChange={handleToggleAllVisible}
                        label="Select all visible insurance cases"
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
                          <SurfaceCheckbox
                            checked={selectedInquiryIds.includes(inquiry.id)}
                            onCheckedChange={() => toggleInquirySelection(inquiry.id)}
                            label={`Select insurance case ${inquiry.subject || inquiry.id}`}
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
              </ScrollAreaPrimitives.Viewport>
              <ScrollAreaPrimitives.Scrollbar orientation="horizontal" className="primitive-scrollbar">
                <ScrollAreaPrimitives.Thumb className="primitive-scrollbar-thumb" />
              </ScrollAreaPrimitives.Scrollbar>
            </ScrollAreaPrimitives.Root>
          ) : (
            <EmptyPanel
              title="No cases match the current filters"
              copy={
                queueFilterSummary.hasActiveFilters
                  ? 'Broaden the filters or refresh the queue.'
                  : 'No live insurance cases yet. Refresh when new intake arrives.'
              }
            />
          )}
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="card p-4 md:p-5">
            <WorkspaceSectionHeader
              title={workspaceSections.detail.title}
              description={workspaceSections.detail.description}
              action={
                <button
                  onClick={handleRefreshDetail}
                  disabled={!selectedInquiry || detailState === 'loading'}
                  className="ops-action-secondary"
                >
                  {detailState === 'loading' ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  Refresh Detail
                </button>
              }
            />

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

            <TabsPrimitives.Root value={activeDetailTab} onValueChange={setActiveDetailTab} className="mt-4">
              <TabsPrimitives.List className="flex flex-wrap gap-2">
                {detailTabs.map((tab) => (
                  <TabsPrimitives.Trigger
                    key={tab.key}
                    value={tab.key}
                    className="primitive-tab-trigger"
                  >
                    {tab.label}
                  </TabsPrimitives.Trigger>
                ))}
              </TabsPrimitives.List>

              {detailTabs.map((tab) => (
                <TabsPrimitives.Content key={tab.key} value={tab.key} className="mt-4">
                  <ScrollAreaPrimitives.Root className="max-h-[640px]">
                    <ScrollAreaPrimitives.Viewport className="pr-2">
                      <InsuranceDetailTabContent inquiry={selectedInquiry} tabKey={tab.key} />
                    </ScrollAreaPrimitives.Viewport>
                    <ScrollAreaPrimitives.Scrollbar orientation="vertical" className="primitive-scrollbar">
                      <ScrollAreaPrimitives.Thumb className="primitive-scrollbar-thumb" />
                    </ScrollAreaPrimitives.Scrollbar>
                  </ScrollAreaPrimitives.Root>
                </TabsPrimitives.Content>
              ))}
            </TabsPrimitives.Root>
          </div>

          <div className="card p-4 md:p-5">
            <WorkspaceSectionHeader
              title={workspaceSections.actions.title}
              description={workspaceSections.actions.description}
              action={
                <span className={`badge ${nextStatuses.length ? 'badge-green' : 'badge-gray'}`}>
                  {nextStatuses.length ? `${nextStatuses.length} valid next state${nextStatuses.length === 1 ? '' : 's'}` : 'No valid transition'}
                </span>
              }
            />

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
                  placeholder="Add staff notes."
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
