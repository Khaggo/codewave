'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  BadgeCheck,
  ClipboardCheck,
  ExternalLink,
  Lock,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'

import PortalLink from '@/components/PortalLink'
import { useToast } from '@/components/Toast.jsx'
import { ApiError } from '@/lib/authClient'
import { listJobOrderWorkbenchSummaries } from '@/lib/jobOrderWorkbenchClient'
import { getJobOrderQualityGate, overrideJobOrderQualityGate } from '@/lib/qualityGateClient'
import { useUser } from '@/lib/userContext.jsx'
import {
  canStaffOverrideQualityGate,
  canStaffReadQualityGate,
  getBlockingQualityGateFindings,
  getFindingRiskContribution,
  getLatestQualityGateOverride,
  getQualityGateReleaseState,
  getReviewNeededQualityGateFindings,
} from '@/lib/api/generated/quality-gates/staff-web-qa-review'

const initialQaState = {
  status: 'qa_ready',
  message: '',
}

const initialOverrideState = {
  status: 'override_ready',
  message: '',
}

const releaseSummaryByState = {
  release_allowed: {
    value: 'Allowed',
    toneClass: 'border-emerald-500/15 bg-emerald-500/10 text-emerald-400',
  },
  release_allowed_by_override: {
    value: 'Allowed by Override',
    toneClass: 'border-blue-500/15 bg-blue-500/10 text-blue-300',
  },
  release_blocked: {
    value: 'Blocked',
    toneClass: 'border-red-500/15 bg-red-500/10 text-red-400',
  },
  release_pending_audit: {
    value: 'Pending Audit',
    toneClass: 'border-amber-500/15 bg-amber-500/10 text-amber-300',
  },
  release_unavailable: {
    value: 'Awaiting Load',
    toneClass: 'border-surface-border bg-surface-raised text-ink-muted',
  },
}

const findingSeverityPriority = {
  critical: 0,
  warning: 1,
  info: 2,
}

const findingGroupDefinitions = [
  {
    key: 'critical',
    title: 'Blocking Findings',
    badgeClass: 'badge-red',
    matches: (finding) => finding.severity === 'critical',
  },
  {
    key: 'warning',
    title: 'Review Needed',
    badgeClass: 'badge-orange',
    matches: (finding) => finding.severity === 'warning',
  },
  {
    key: 'info',
    title: 'Informational Findings',
    badgeClass: 'badge-gray',
    matches: (finding) => finding.severity === 'info',
  },
  {
    key: 'other',
    title: 'Additional Findings',
    badgeClass: 'badge-gray',
    matches: (finding) => !Object.hasOwn(findingSeverityPriority, finding.severity ?? ''),
  },
]

function formatLabel(value) {
  return String(value ?? '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatDateTime(value) {
  if (!value) return 'Not recorded'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getQualityStatusTone(status) {
  if (status === 'passed') return 'badge-green'
  if (status === 'blocked') return 'badge-red'
  if (status === 'overridden') return 'badge-blue'
  return 'badge-orange'
}

function getReleaseTone(state) {
  if (state === 'release_allowed_by_override') return 'badge-blue'
  if (state === 'release_allowed') return 'badge-green'
  if (state === 'release_blocked') return 'badge-red'
  if (state === 'release_pending_audit') return 'badge-orange'
  return 'badge-gray'
}

function getReleaseCopy(state) {
  if (state === 'release_allowed_by_override') return 'Release allowed by super-admin override'
  if (state === 'release_allowed') return 'Release allowed after QA pass'
  if (state === 'release_blocked') return 'Release blocked by QA findings'
  if (state === 'release_pending_audit') return 'Release pending QA audit'
  return 'Awaiting QA load before release decision'
}

function getFindingSortPriority(finding) {
  const severity = finding?.severity ?? ''
  return Object.hasOwn(findingSeverityPriority, severity)
    ? findingSeverityPriority[severity]
    : findingGroupDefinitions.length
}

function sortQualityFindings(findings) {
  return [...findings].sort((left, right) => {
    const severityDelta = getFindingSortPriority(left) - getFindingSortPriority(right)
    if (severityDelta !== 0) return severityDelta

    const riskDelta = (getFindingRiskContribution(right) ?? -1) - (getFindingRiskContribution(left) ?? -1)
    if (riskDelta !== 0) return riskDelta

    const createdAtDelta = String(right.createdAt ?? '').localeCompare(String(left.createdAt ?? ''))
    if (createdAtDelta !== 0) return createdAtDelta

    return `${left.gate}:${left.code}`.localeCompare(`${right.gate}:${right.code}`)
  })
}

function getGroupedQualityFindings(findings) {
  const sortedFindings = sortQualityFindings(findings)
  const groupedFindingIds = new Set()

  return findingGroupDefinitions
    .map((group) => {
      const items = sortedFindings.filter((finding) => {
        if (groupedFindingIds.has(finding.id) || !group.matches(finding)) {
          return false
        }

        groupedFindingIds.add(finding.id)
        return true
      })

      return {
        ...group,
        items,
      }
    })
    .filter((group) => group.items.length > 0)
}

function StatCard({ icon: Icon, label, value, toneClass }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-muted">{label}</p>
          <p className="mt-3 text-3xl font-bold text-ink-primary">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${toneClass}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}

function EmptyPanelState({ title, copy }) {
  return (
    <div className="rounded-2xl border border-dashed border-surface-border bg-surface-raised px-5 py-10 text-center">
      <ShieldCheck size={28} className="mx-auto text-ink-muted" />
      <p className="mt-3 text-sm font-bold text-ink-primary">{title}</p>
      <p className="mt-2 text-sm leading-6 text-ink-muted">{copy}</p>
    </div>
  )
}

function StatusMessage({ state }) {
  if (!state.message) return null

  const toneClass =
    state.status === 'qa_loaded'
      ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
      : state.status === 'qa_unavailable'
        ? 'border-amber-500/25 bg-amber-500/10 text-amber-100'
        : 'border-red-500/25 bg-red-500/10 text-red-200'

  return <div className={`rounded-xl border px-4 py-3 text-sm ${toneClass}`}>{state.message}</div>
}

function OverrideMessage({ state }) {
  if (!state.message) return null

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        state.status === 'override_saved'
          ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
          : 'border-red-500/25 bg-red-500/10 text-red-200'
      }`}
    >
      {state.message}
    </div>
  )
}

function QualityFindingCard({ finding }) {
  const riskContribution = getFindingRiskContribution(finding)
  const severityTone =
    finding.severity === 'critical'
      ? 'border-red-500/25 bg-red-500/10 text-red-200'
      : finding.severity === 'warning'
        ? 'border-amber-500/25 bg-amber-500/10 text-amber-200'
        : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'

  return (
    <article className="rounded-2xl border border-surface-border bg-surface-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="badge badge-gray">{formatLabel(finding.gate)}</span>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${severityTone}`}>
          {formatLabel(finding.severity)}
        </span>
        {riskContribution !== null ? <span className="badge badge-orange">Risk {riskContribution}</span> : null}
      </div>
      <p className="mt-3 text-sm font-semibold text-ink-primary">{finding.code}</p>
      <p className="mt-2 text-sm leading-6 text-ink-secondary">{finding.message}</p>
      {finding.provenance ? (
        <div className="mt-4 rounded-xl border border-surface-border bg-surface-raised p-3 text-xs leading-5 text-ink-muted">
          <p>
            {finding.provenance.provider} / {finding.provenance.model} - {formatLabel(finding.provenance.recommendation)}
          </p>
          {finding.provenance.evidenceSummary ? (
            <p className="mt-2 text-ink-secondary">{finding.provenance.evidenceSummary}</p>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

function ReleaseDecisionPanel({ qualityGate, releaseState }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="card-title">Release Decision</p>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">
            Completion and customer release should follow this QA state, not generic job-order status alone.
          </p>
        </div>
        <span className={`badge ${getReleaseTone(releaseState)}`}>{getReleaseCopy(releaseState)}</span>
      </div>
      {qualityGate ? (
        <div className="space-y-4">
          <div className="ops-panel-muted">
            <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Job Order</p>
            <p className="mt-2 break-all text-sm font-semibold text-ink-primary">{qualityGate.jobOrderId}</p>
          </div>
          {qualityGate.blockingReason ? (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {qualityGate.blockingReason}
            </p>
          ) : null}
        </div>
      ) : (
        <EmptyPanelState
          title="No QA gate loaded"
          copy="Load a known ready-for-QA job order from the Job Order Workbench to review its live release decision."
        />
      )}
    </div>
  )
}

function FindingsReviewPanel({ qualityGate }) {
  if (!qualityGate) {
    return (
      <div className="space-y-4">
        <div>
          <p className="card-title">Findings Review</p>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">
            Blocking and review-needed findings stay grouped here once a live QA gate is loaded.
          </p>
        </div>
        <EmptyPanelState
          title="No findings to review yet"
          copy="This panel will show live severity, provenance, and risk contribution details after a QA gate is loaded."
        />
      </div>
    )
  }

  const findings = Array.isArray(qualityGate.findings) ? qualityGate.findings : []
  const blockingFindings = getBlockingQualityGateFindings(qualityGate)
  const reviewFindings = getReviewNeededQualityGateFindings(qualityGate)
  const groupedFindings = getGroupedQualityFindings(findings)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="card-title">Findings Review</p>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">
            Review blocking and advisory findings before approving release or recording an override.
          </p>
        </div>
        <span className={`badge ${getQualityStatusTone(qualityGate.status)}`}>{formatLabel(qualityGate.status)}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="badge badge-red">{blockingFindings.length} blocking</span>
        <span className="badge badge-orange">{reviewFindings.length} review needed</span>
      </div>
      {findings.length ? (
        <div className="space-y-4">
          {groupedFindings.map((group) => (
            <section key={group.key} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-bold text-ink-primary">{group.title}</p>
                <span className={`badge ${group.badgeClass}`}>{group.items.length} findings</span>
              </div>
              <div className="grid gap-3 xl:grid-cols-2">
                {group.items.map((finding) => (
                  <QualityFindingCard key={finding.id} finding={finding} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-surface-border bg-surface-card p-4 text-sm text-ink-muted">
          No findings have been recorded yet.
        </div>
      )}
    </div>
  )
}

function AuditTimelinePanel({ qualityGate, releaseState }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="card-title">Audit Timeline / Worker Detail</p>
        <p className="mt-2 text-sm leading-6 text-ink-secondary">
          Monitor audit request timing, worker completion, and the release state that staff should follow.
        </p>
      </div>
      {qualityGate ? (
        <div className="grid gap-3 text-sm text-ink-secondary">
          <div className="ops-panel-muted flex items-center justify-between gap-4">
            <span className="text-ink-muted">Requested</span>
            <span>{formatDateTime(qualityGate.lastAuditRequestedAt)}</span>
          </div>
          <div className="ops-panel-muted flex items-center justify-between gap-4">
            <span className="text-ink-muted">Completed</span>
            <span>{formatDateTime(qualityGate.lastAuditCompletedAt)}</span>
          </div>
          <div className="ops-panel-muted flex items-center justify-between gap-4">
            <span className="text-ink-muted">Queue status</span>
            <span>{formatLabel(qualityGate.auditJob?.status ?? 'not_available')}</span>
          </div>
          <div className="ops-panel-muted flex items-center justify-between gap-4">
            <span className="text-ink-muted">Release state</span>
            <span>{formatLabel(releaseState)}</span>
          </div>
        </div>
      ) : (
        <EmptyPanelState
          title="No audit worker detail available"
          copy="Once a gate is loaded, this panel will show the last audit request, completion, and queue state."
        />
      )}
    </div>
  )
}

function OverrideAuditPanel({
  canOverrideLiveQa,
  overrideReason,
  overrideState,
  qualityGate,
  releaseState,
  onOverrideReasonChange,
  onSubmit,
}) {
  const latestOverride = qualityGate ? getLatestQualityGateOverride(qualityGate) : null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="card-title">Override Audit</p>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">
            Overrides remain fully auditable and never remove the original QA findings that caused the release block.
          </p>
        </div>
        <span className={`badge ${getReleaseTone(releaseState)}`}>{getReleaseCopy(releaseState)}</span>
      </div>
      {latestOverride ? (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-100">
          <p className="font-semibold">{formatLabel(latestOverride.actorRole)} override</p>
          <p className="mt-2 leading-6">{latestOverride.reason}</p>
          <p className="mt-2 text-xs text-blue-200">{formatDateTime(latestOverride.createdAt)}</p>
        </div>
      ) : (
        <div className="ops-panel-muted text-sm leading-6 text-ink-muted">
          No override has been recorded. Blocked gates require a super-admin reason before release can continue.
        </div>
      )}
      <label className="block text-xs text-ink-muted">
        Override reason
        <textarea
          value={overrideReason}
          onChange={(event) => onOverrideReasonChange(event.target.value)}
          rows={4}
          disabled={!qualityGate || !canOverrideLiveQa || qualityGate.status !== 'blocked'}
          className="mt-1 w-full rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-sm text-ink-primary outline-none focus:border-[#f07c00] disabled:cursor-not-allowed disabled:opacity-60"
          placeholder="Explain why a supervisor is approving release despite the blocked QA state."
        />
      </label>
      <OverrideMessage state={overrideState} />
      <button
        type="button"
        onClick={onSubmit}
        disabled={overrideState.status === 'override_submitting' || !qualityGate || !canOverrideLiveQa || qualityGate.status !== 'blocked'}
        className="ops-action-danger w-full disabled:cursor-not-allowed disabled:opacity-50"
      >
        {overrideState.status === 'override_submitting' ? (
          <RefreshCw size={15} className="animate-spin" />
        ) : canOverrideLiveQa ? (
          <ShieldAlert size={15} />
        ) : (
          <Lock size={15} />
        )}
        Record Manual Override
      </button>
    </div>
  )
}

function ContractSourcesPanel() {
  return (
    <div className="space-y-4">
      <div>
        <div>
          <p className="card-title">Contract Sources / Linked Context</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-secondary">
            QA Audit is a live review and override surface. It does not create inspections, job orders, or fake audit queues.
          </p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
          <p className="text-sm font-bold text-ink-primary">Staff Action</p>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">
            Load one live job order from the selector, inspect its findings, then return to Job Orders for execution work.
          </p>
        </div>
        <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
          <p className="text-sm font-bold text-ink-primary">Super Admin Action</p>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">
            Override only blocked gates, with a clear reason that stays in the audit trail.
          </p>
        </div>
        <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
          <p className="text-sm font-bold text-ink-primary">Next Step</p>
          <PortalLink href="/admin/job-orders" className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-brand-orange">
            Continue in Job Orders <ExternalLink size={14} />
          </PortalLink>
        </div>
      </div>
    </div>
  )
}

export default function QAAuditWorkspace() {
  const user = useUser()
  const { toast } = useToast()
  const role = user?.role ?? null
  const canReadLiveQa = canStaffReadQualityGate(role)
  const canOverrideLiveQa = canStaffOverrideQualityGate(role)
  const [jobOrderId, setJobOrderId] = useState('')
  const [qualityGate, setQualityGate] = useState(null)
  const [jobOrderOptions, setJobOrderOptions] = useState([])
  const [overrideReason, setOverrideReason] = useState('')
  const [qaState, setQaState] = useState(initialQaState)
  const [overrideState, setOverrideState] = useState(initialOverrideState)
  const qaLoadInFlightRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const nextJobOrderId = new URLSearchParams(window.location.search).get('jobOrderId')
    if (nextJobOrderId) {
      setJobOrderId(nextJobOrderId)
    }
  }, [])

  useEffect(() => {
    if (!user?.accessToken || !canReadLiveQa) {
      setJobOrderOptions([])
      return
    }

    let cancelled = false

    void listJobOrderWorkbenchSummaries({
      accessToken: user.accessToken,
      month: new Date().toISOString().slice(0, 7),
    })
      .then((items) => {
        if (!cancelled) {
          setJobOrderOptions(items)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setJobOrderOptions([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [canReadLiveQa, user?.accessToken])

  const selectedReleaseState = getQualityGateReleaseState(qualityGate)
  const releaseSummary = releaseSummaryByState[selectedReleaseState] ?? releaseSummaryByState.release_unavailable
  const blockingFindings = qualityGate ? getBlockingQualityGateFindings(qualityGate) : []

  async function loadQualityGate() {
    if (qaLoadInFlightRef.current) {
      return
    }

    if (!jobOrderId.trim()) {
      setQaState({
        status: 'qa_not_found',
        message: 'Choose a job order before loading QA.',
      })
      return
    }

    if (!canReadLiveQa) {
      setQaState({
        status: 'qa_forbidden_role',
        message: 'Only assigned technicians, service advisers, and super admins can read quality gates.',
      })
      return
    }

    if (!user?.accessToken) {
      setQaState({
        status: 'qa_failed',
        message: 'A valid staff session is required before loading QA.',
      })
      return
    }

    qaLoadInFlightRef.current = true
    setQaState({
      status: 'qa_loading',
      message: '',
    })

    try {
      const loadedQualityGate = await getJobOrderQualityGate({
        jobOrderId: jobOrderId.trim(),
        accessToken: user.accessToken,
      })

      setQualityGate(loadedQualityGate)
      setOverrideState(initialOverrideState)
      setQaState({
        status: 'qa_loaded',
        message: 'Live QA gate loaded from the backend.',
      })
    } catch (error) {
      let nextStatus = 'qa_failed'

      if (error instanceof ApiError && error.status === 403) {
        nextStatus = 'qa_forbidden_role'
      } else if (error instanceof ApiError && error.status === 404) {
        nextStatus = 'qa_not_found'
      } else if (error instanceof ApiError && error.status === 409) {
        nextStatus = 'qa_unavailable'
      }

      setQualityGate(null)
      setQaState({
        status: nextStatus,
        message: error?.message || 'QA gate could not be loaded.',
      })
    } finally {
      qaLoadInFlightRef.current = false
    }
  }

  async function handleOverrideQualityGate() {
    if (!qualityGate) {
      setOverrideState({
        status: 'override_not_found',
        message: 'Load a blocked quality gate before recording an override.',
      })
      return
    }

    if (!canOverrideLiveQa) {
      setOverrideState({
        status: 'override_forbidden_role',
        message: 'Only super admins can approve manual quality-gate overrides.',
      })
      return
    }

    if (qualityGate.status !== 'blocked') {
      setOverrideState({
        status: 'override_not_blocked',
        message: 'Only blocked quality gates can be manually overridden.',
      })
      return
    }

    if (!overrideReason.trim()) {
      setOverrideState({
        status: 'override_failed',
        message: 'Enter a clear reason before recording a QA override.',
      })
      return
    }

    if (!user?.accessToken) {
      setOverrideState({
        status: 'override_failed',
        message: 'A valid super-admin session is required before overriding QA.',
      })
      return
    }

    setOverrideState({
      status: 'override_submitting',
      message: '',
    })

    try {
      const updatedQualityGate = await overrideJobOrderQualityGate({
        jobOrderId: qualityGate.jobOrderId,
        reason: overrideReason.trim(),
        accessToken: user.accessToken,
      })

      setQualityGate(updatedQualityGate)
      setOverrideReason('')
      setOverrideState({
        status: 'override_saved',
        message: 'Manual QA override recorded. Release is now allowed by override.',
      })
      toast({
        type: 'success',
        title: 'QA Override Recorded',
        message: `${qualityGate.jobOrderId} now has an auditable super-admin override.`,
      })
    } catch (error) {
      let nextStatus = 'override_failed'

      if (error instanceof ApiError && error.status === 403) {
        nextStatus = 'override_forbidden_role'
      } else if (error instanceof ApiError && error.status === 404) {
        nextStatus = 'override_not_found'
      } else if (error instanceof ApiError && error.status === 409) {
        nextStatus = 'override_not_blocked'
      }

      setOverrideState({
        status: nextStatus,
        message: error?.message || 'Manual QA override could not be recorded.',
      })
    }
  }

  return (
    <div className="ops-page-shell">
      <section className="ops-page-header">
        <div className="space-y-2">
          <p className="ops-page-kicker">Quality Governance</p>
          <h1 className="ops-page-title">QA Audit Workspace</h1>
          <p className="ops-page-copy">
            Review live quality gates, scan blocking findings, and record auditable overrides when release exceptions are justified.
          </p>
        </div>
        <button
          type="button"
          onClick={loadQualityGate}
          disabled={qaState.status === 'qa_loading'}
          className="ops-action-secondary min-w-[148px] self-start disabled:cursor-not-allowed disabled:opacity-60 xl:self-auto"
        >
          <RefreshCw size={14} className={qaState.status === 'qa_loading' ? 'animate-spin' : undefined} />
          Refresh
        </button>
      </section>

      <section className="ops-control-strip">
        <form
          className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]"
          onSubmit={(event) => {
            event.preventDefault()
            loadQualityGate()
          }}
        >
          <label className="text-xs text-ink-muted">
            Job-order selector
            <select
              value={jobOrderId}
              onChange={(event) => setJobOrderId(event.target.value)}
              className="mt-1 w-full rounded-xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
            >
              <option value="">Choose a job order for QA review</option>
              {jobOrderOptions.map((jobOrder) => (
                <option key={jobOrder.id} value={jobOrder.id}>
                  JO-{jobOrder.id.slice(0, 8).toUpperCase()} / {formatLabel(jobOrder.status)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge ${canReadLiveQa ? 'badge-green' : 'badge-red'}`}>
              Read: {canReadLiveQa ? formatLabel(role) : 'Forbidden role'}
            </span>
            <span className={`badge ${canOverrideLiveQa ? 'badge-green' : 'badge-gray'}`}>
              Override: {canOverrideLiveQa ? 'Super Admin' : 'Locked'}
            </span>
          </div>
          <button type="submit" disabled={qaState.status === 'qa_loading'} className="ops-action-primary">
            {qaState.status === 'qa_loading' ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Search size={14} />
            )}
            Load QA Gate
          </button>
        </form>
        <StatusMessage state={qaState} />
      </section>

      <section className="ops-summary-grid">
        <StatCard
          icon={ShieldCheck}
          label="QA Status"
          value={qualityGate ? formatLabel(qualityGate.status) : 'Awaiting Load'}
          toneClass={
            qualityGate
              ? qualityGate.status === 'blocked'
                ? 'border-red-500/15 bg-red-500/10 text-red-400'
                : 'border-emerald-500/15 bg-emerald-500/10 text-emerald-400'
              : 'border-surface-border bg-surface-raised text-ink-muted'
          }
        />
        <StatCard
          icon={AlertTriangle}
          label="Risk Score"
          value={qualityGate ? qualityGate.riskScore : '—'}
          toneClass={
            qualityGate
              ? qualityGate.riskScore >= 60
                ? 'border-red-500/15 bg-red-500/10 text-red-400'
                : 'border-brand-orange/15 bg-brand-orange/10 text-brand-orange'
              : 'border-surface-border bg-surface-raised text-ink-muted'
          }
        />
        <StatCard
          icon={ClipboardCheck}
          label="Blocking Findings"
          value={blockingFindings.length}
          toneClass={
            qualityGate
              ? 'border-amber-500/15 bg-amber-500/10 text-amber-300'
              : 'border-surface-border bg-surface-raised text-ink-muted'
          }
        />
        <StatCard
          icon={BadgeCheck}
          label="Release"
          value={releaseSummary.value}
          toneClass={releaseSummary.toneClass}
        />
      </section>

      <section className="space-y-5">
        <div className="ops-panel">
          <ReleaseDecisionPanel qualityGate={qualityGate} releaseState={selectedReleaseState} />
        </div>
        <div className="ops-panel">
          <FindingsReviewPanel qualityGate={qualityGate} />
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="ops-panel">
            <AuditTimelinePanel qualityGate={qualityGate} releaseState={selectedReleaseState} />
          </div>
          <div className="ops-panel">
            <OverrideAuditPanel
              canOverrideLiveQa={canOverrideLiveQa}
              overrideReason={overrideReason}
              overrideState={overrideState}
              qualityGate={qualityGate}
              releaseState={selectedReleaseState}
              onOverrideReasonChange={setOverrideReason}
              onSubmit={handleOverrideQualityGate}
            />
          </div>
        </div>
        <div className="ops-panel">
          <ContractSourcesPanel />
        </div>
      </section>
    </div>
  )
}
