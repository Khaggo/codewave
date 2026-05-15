'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  BadgeCheck,
  ExternalLink,
  Lock,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'

import PageHeader from '@/components/ui/PageHeader'
import PortalLink from '@/components/PortalLink'
import { useToast } from '@/components/Toast.jsx'
import { ApiError } from '@/lib/authClient'
import { listJobOrderWorkbenchSummaries } from '@/lib/jobOrderWorkbenchClient'
import {
  getJobOrderQualityGate,
  overrideJobOrderQualityGate,
  recordJobOrderQualityGateVerdict,
} from '@/lib/qualityGateClient'
import { useUser } from '@/lib/userContext.jsx'
import {
  canStaffOverrideQualityGate,
  canStaffReadQualityGate,
  canStaffRecordQualityGateVerdict,
  getBlockingQualityGateFindings,
  getFindingRiskContribution,
  getLatestQualityGateOverride,
  getQualityGateReleaseState,
  getReviewNeededQualityGateFindings,
} from '@/lib/api/generated/quality-gates/staff-web-qa-review'
import { getGroupedQualityFindings } from './qaAuditView.mjs'

const initialQaState = {
  status: 'qa_ready',
  message: '',
}

const initialOverrideState = {
  status: 'override_ready',
  message: '',
}

const initialVerdictState = {
  status: 'verdict_ready',
  message: '',
}

const releaseSummaryByState = {
  release_allowed: {
    value: 'Allowed',
    toneClass: 'badge badge-green',
  },
  release_allowed_by_override: {
    value: 'Allowed by Override',
    toneClass: 'badge badge-blue',
  },
  release_blocked: {
    value: 'Blocked',
    toneClass: 'badge badge-red',
  },
  release_pending_audit: {
    value: 'Pending Review',
    toneClass: 'badge badge-orange',
  },
  release_unavailable: {
    value: 'Awaiting Load',
    toneClass: 'badge badge-gray',
  },
}

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

function getReleaseCopy(state) {
  if (state === 'release_allowed_by_override') return 'Release allowed by override.'
  if (state === 'release_allowed') return 'Release allowed.'
  if (state === 'release_blocked') return 'Release blocked.'
  if (state === 'release_pending_audit') return 'Awaiting review.'
  return 'Load a QA gate to review release.'
}

function EmptyPanelState({ title, copy }) {
  return (
    <div className="empty-panel">
      <ShieldCheck size={28} className="mx-auto text-ink-muted" />
      <p className="mt-3 text-sm font-semibold text-ink-primary">{title}</p>
      <p className="mt-2 text-sm text-ink-secondary">{copy}</p>
    </div>
  )
}

function StatusMessage({ state }) {
  if (!state.message) return null

  const toneClass =
    state.status === 'qa_loaded'
      ? 'status-message status-message-success'
      : state.status === 'qa_unavailable'
        ? 'status-message status-message-warning'
        : 'status-message status-message-danger'

  return <div className={toneClass}>{state.message}</div>
}

function InlineMessage({ state, successStatus }) {
  if (!state.message) return null

  return (
    <div className={state.status === successStatus ? 'status-message status-message-success' : 'status-message status-message-danger'}>
      {state.message}
    </div>
  )
}

function QualityFindingCard({ finding }) {
  const riskContribution = getFindingRiskContribution(finding)
  const severityTone =
    finding.severity === 'critical'
      ? 'badge badge-red'
      : finding.severity === 'warning'
        ? 'badge badge-orange'
        : 'badge badge-gray'

  return (
    <article className="rounded-2xl border border-surface-border bg-surface-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="badge badge-gray">{formatLabel(finding.gate)}</span>
        <span className={severityTone}>{formatLabel(finding.severity)}</span>
        {riskContribution !== null ? <span className="badge badge-gray">Risk {riskContribution}</span> : null}
      </div>
      <p className="mt-3 text-sm font-semibold text-ink-primary">{finding.code}</p>
      {finding.message ? <p className="mt-2 text-sm text-ink-secondary">{finding.message}</p> : null}
      {finding.provenance?.evidenceSummary ? (
        <p className="mt-3 text-xs text-ink-muted">{finding.provenance.evidenceSummary}</p>
      ) : null}
    </article>
  )
}

function SectionFrame({ title, copy, badge, children }) {
  return (
    <section className="ops-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="card-title">{title}</p>
          {copy ? <p className="mt-2 text-sm text-ink-secondary">{copy}</p> : null}
        </div>
        {badge ? badge : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export default function QAAuditWorkspace() {
  const user = useUser()
  const { toast } = useToast()
  const role = user?.role ?? null
  const canReadLiveQa = canStaffReadQualityGate(role)
  const canRecordLiveVerdict = canStaffRecordQualityGateVerdict(role)
  const canOverrideLiveQa = canStaffOverrideQualityGate(role)
  const [jobOrderId, setJobOrderId] = useState('')
  const [qualityGate, setQualityGate] = useState(null)
  const [jobOrderOptions, setJobOrderOptions] = useState([])
  const [verdictDraft, setVerdictDraft] = useState('passed')
  const [verdictNote, setVerdictNote] = useState('')
  const [overrideReason, setOverrideReason] = useState('')
  const [qaState, setQaState] = useState(initialQaState)
  const [verdictState, setVerdictState] = useState(initialVerdictState)
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
  const reviewNeededFindings = qualityGate ? getReviewNeededQualityGateFindings(qualityGate) : []
  const groupedFindings = useMemo(
    () => getGroupedQualityFindings(Array.isArray(qualityGate?.findings) ? qualityGate.findings : []),
    [qualityGate],
  )
  const blockingGroup = groupedFindings.find((group) => group.key === 'critical') ?? null
  const reviewGroups = groupedFindings.filter((group) => group.key !== 'critical')
  const latestOverride = qualityGate ? getLatestQualityGateOverride(qualityGate) : null

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
        message: 'This workspace is limited to QA-capable staff roles.',
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
      setVerdictDraft(loadedQualityGate.reviewerVerdict === 'blocked' ? 'blocked' : 'passed')
      setVerdictNote(loadedQualityGate.reviewerNote ?? '')
      setVerdictState(initialVerdictState)
      setOverrideState(initialOverrideState)
      setQaState({
        status: 'qa_loaded',
        message: 'Release review loaded.',
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
        message: error?.message || 'Review workspace could not be loaded.',
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
        message: 'Only super admins can record an override.',
      })
      return
    }

    if (qualityGate.status !== 'blocked') {
      setOverrideState({
        status: 'override_not_blocked',
        message: 'Only blocked quality gates can be overridden.',
      })
      return
    }

    if (!overrideReason.trim()) {
      setOverrideState({
        status: 'override_failed',
        message: 'Enter an override reason first.',
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
        message: 'Override recorded.',
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

  async function handleRecordQualityGateVerdict() {
    if (!qualityGate) {
      setVerdictState({
        status: 'verdict_not_found',
        message: 'Load a pre-check review before recording a verdict.',
      })
      return
    }

    if (!canRecordLiveVerdict) {
      setVerdictState({
        status: 'verdict_forbidden_role',
        message: 'Only the head technician can record the release verdict.',
      })
      return
    }

    if (!user?.accessToken) {
      setVerdictState({
        status: 'verdict_failed',
        message: 'A valid head-technician session is required before recording the verdict.',
      })
      return
    }

    setVerdictState({
      status: 'verdict_submitting',
      message: '',
    })

    try {
      const updatedQualityGate = await recordJobOrderQualityGateVerdict({
        jobOrderId: qualityGate.jobOrderId,
        verdict: verdictDraft,
        note: verdictNote,
        accessToken: user.accessToken,
      })

      setQualityGate(updatedQualityGate)
      setVerdictDraft(updatedQualityGate.reviewerVerdict === 'blocked' ? 'blocked' : 'passed')
      setVerdictNote(updatedQualityGate.reviewerNote ?? '')
      setVerdictState({
        status: 'verdict_saved',
        message: updatedQualityGate.reviewerVerdict === 'blocked' ? 'Block recorded.' : 'Pass recorded.',
      })
      toast({
        type: 'success',
        title: 'Head-Technician Verdict Recorded',
        message:
          updatedQualityGate.reviewerVerdict === 'blocked'
            ? `${qualityGate.jobOrderId} was returned for technician remediation.`
            : `${qualityGate.jobOrderId} is now cleared for release review.`,
      })
    } catch (error) {
      let nextStatus = 'verdict_failed'

      if (error instanceof ApiError && error.status === 403) {
        nextStatus = 'verdict_forbidden_role'
      } else if (error instanceof ApiError && error.status === 404) {
        nextStatus = 'verdict_not_found'
      }

      setVerdictState({
        status: nextStatus,
        message: error?.message || 'Head-technician verdict could not be recorded.',
      })
    }
  }

  return (
    <div className="ops-page-shell">
      <PageHeader
        eyebrow="Quality Governance"
        title="QA Audit"
        description="Review release checks, record verdicts, and keep overrides auditable."
        actions={(
          <button
            type="button"
            onClick={loadQualityGate}
            disabled={qaState.status === 'qa_loading'}
            className="ops-action-secondary min-w-[148px] self-start disabled:cursor-not-allowed disabled:opacity-60 xl:self-auto"
          >
            <RefreshCw size={14} className={qaState.status === 'qa_loading' ? 'animate-spin' : undefined} />
            Refresh
          </button>
        )}
      />

      <div className="space-y-5">
        <SectionFrame
          title="QA Queue"
          copy="Focus on the jobs waiting for release review."
          badge={<span className={`badge ${canReadLiveQa ? 'badge-green' : 'badge-red'}`}>{canReadLiveQa ? formatLabel(role) : 'Read locked'}</span>}
        >
          <form
            className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]"
            onSubmit={(event) => {
              event.preventDefault()
              loadQualityGate()
            }}
          >
            <label>
              <span className="label">Job order</span>
              <select
                value={jobOrderId}
                onChange={(event) => setJobOrderId(event.target.value)}
                className="select"
              >
                <option value="">Choose a release review</option>
                {jobOrderOptions.map((jobOrder) => (
                  <option key={jobOrder.id} value={jobOrder.id}>
                    JO-{jobOrder.id.slice(0, 8).toUpperCase()} / {formatLabel(jobOrder.status)}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={qaState.status === 'qa_loading'} className="ops-action-primary self-end">
              {qaState.status === 'qa_loading' ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Search size={14} />
              )}
              Load Review
            </button>
          </form>

          <div className="mt-4 grid gap-3 xl:grid-cols-3">
            {jobOrderOptions.slice(0, 6).map((jobOrder) => {
              const isSelected = jobOrderId === jobOrder.id

              return (
                <button
                  key={jobOrder.id}
                  type="button"
                  onClick={() => setJobOrderId(jobOrder.id)}
                  className={`rounded-2xl border p-4 text-left transition-colors ${
                    isSelected
                      ? 'border-brand-orange bg-brand-orange/10'
                      : 'border-surface-border bg-surface-card hover:border-brand-orange/40'
                  }`}
                >
                  <p className="text-sm font-semibold text-ink-primary">JO-{jobOrder.id.slice(0, 8).toUpperCase()}</p>
                  <p className="mt-2 text-sm text-ink-secondary">{formatLabel(jobOrder.status)}</p>
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className={`badge ${canRecordLiveVerdict ? 'badge-green' : 'badge-gray'}`}>
              Verdict {canRecordLiveVerdict ? 'open' : 'locked'}
            </span>
            <span className={`badge ${canOverrideLiveQa ? 'badge-blue' : 'badge-gray'}`}>
              Override {canOverrideLiveQa ? 'open' : 'locked'}
            </span>
          </div>

          <div className="mt-4">
            <StatusMessage state={qaState} />
          </div>
        </SectionFrame>

        <SectionFrame
          title="Selected Audit"
          copy="Review the loaded release decision."
          badge={<span className={releaseSummary.toneClass}>{releaseSummary.value}</span>}
        >
          {qualityGate ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="ops-panel-muted">
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Job Order</p>
                <p className="mt-2 break-all text-sm font-semibold text-ink-primary">{qualityGate.jobOrderId}</p>
              </div>
              <div className="ops-panel-muted">
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">QA Status</p>
                <p className="mt-2 text-sm font-semibold text-ink-primary">{formatLabel(qualityGate.status)}</p>
              </div>
              <div className="ops-panel-muted">
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Risk Score</p>
                <p className="mt-2 text-sm font-semibold text-ink-primary">{qualityGate.riskScore ?? '—'}</p>
              </div>
              <div className="ops-panel-muted">
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Blocking</p>
                <p className="mt-2 text-sm font-semibold text-ink-primary">{blockingFindings.length}</p>
              </div>
              {qualityGate.blockingReason ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100 md:col-span-2 xl:col-span-4">
                  {qualityGate.blockingReason}
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyPanelState
              title="No audit loaded"
              copy="Select a job order from the queue to review its release state."
            />
          )}
        </SectionFrame>

        <SectionFrame
          title="Pre-Check Summary"
          copy="Use the validator summary before recording a verdict."
          badge={qualityGate ? <span className="badge badge-gray">{formatLabel(qualityGate.preCheckStatus)}</span> : null}
        >
          {qualityGate ? (
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="ops-panel-muted">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Work Items</p>
                  <p className="mt-2 text-sm font-semibold text-ink-primary">
                    {qualityGate.preCheckSummary?.completedWorkItemCount ?? 0} / {qualityGate.preCheckSummary?.totalWorkItemCount ?? 0}
                  </p>
                </div>
                <div className="ops-panel-muted">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Photos</p>
                  <p className="mt-2 text-sm font-semibold text-ink-primary">{qualityGate.preCheckSummary?.attachedPhotoCount ?? 0}</p>
                </div>
                <div className="ops-panel-muted">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Evidence Gaps</p>
                  <p className="mt-2 text-sm font-semibold text-ink-primary">
                    {qualityGate.preCheckSummary?.evidenceGapCount ?? qualityGate.preCheckSummary?.evidenceGaps?.length ?? 0}
                  </p>
                </div>
                <div className="ops-panel-muted">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Semantic Match</p>
                  <p className="mt-2 text-sm font-semibold text-ink-primary">{qualityGate.preCheckSummary?.semanticMatchScore ?? '—'}</p>
                </div>
              </div>
              {Array.isArray(qualityGate.preCheckSummary?.evidenceGaps) && qualityGate.preCheckSummary.evidenceGaps.length > 0 ? (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <p className="text-sm font-semibold text-amber-100">Evidence gaps</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-amber-50">
                    {qualityGate.preCheckSummary.evidenceGaps.map((gap) => (
                      <li key={gap}>{gap}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyPanelState
              title="No pre-check summary"
              copy="Load a release review to inspect the validator output."
            />
          )}
        </SectionFrame>

        <SectionFrame
          title="Blocking Findings"
          copy="Clear these before release."
          badge={<span className="badge badge-red">{blockingFindings.length} blocking</span>}
        >
          {blockingGroup?.items?.length ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {blockingGroup.items.map((finding) => (
                <QualityFindingCard key={finding.id} finding={finding} />
              ))}
            </div>
          ) : (
            <EmptyPanelState
              title="No blocking findings"
              copy="Critical findings will appear here when release is blocked."
            />
          )}
        </SectionFrame>

        <SectionFrame
          title="Review Needed"
          copy="Check the items that still need QA attention."
          badge={<span className="badge badge-orange">{reviewNeededFindings.length} review needed</span>}
        >
          {reviewGroups.length ? (
            <div className="space-y-4">
              {reviewGroups.map((group) => (
                <div key={group.key} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-ink-primary">{group.title}</p>
                    <span className={`badge ${group.badgeClass}`}>{group.items.length}</span>
                  </div>
                  <div className="grid gap-3 xl:grid-cols-2">
                    {group.items.map((finding) => (
                      <QualityFindingCard key={finding.id} finding={finding} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanelState
              title="No review-needed findings"
              copy="Warnings and advisory findings will appear here."
            />
          )}
        </SectionFrame>

        <SectionFrame
          title="Verdict / Override"
          copy="Record the final decision and keep overrides auditable."
          badge={<span className={releaseSummary.toneClass}>{releaseSummary.value}</span>}
        >
          <div className="grid gap-5 xl:grid-cols-2">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink-primary">Head technician verdict</p>
                <span className={`badge ${canRecordLiveVerdict ? 'badge-green' : 'badge-gray'}`}>
                  {canRecordLiveVerdict ? 'Editable' : 'Read only'}
                </span>
              </div>
              {qualityGate ? (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="ops-panel-muted">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Current Verdict</p>
                      <p className="mt-2 text-sm font-semibold text-ink-primary">{formatLabel(qualityGate.reviewerVerdict)}</p>
                    </div>
                    <div className="ops-panel-muted">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Reviewed At</p>
                      <p className="mt-2 text-sm font-semibold text-ink-primary">{formatDateTime(qualityGate.reviewedAt)}</p>
                    </div>
                  </div>
                  <label className="block text-xs text-ink-muted">
                    Verdict
                    <select
                      value={verdictDraft}
                      onChange={(event) => setVerdictDraft(event.target.value)}
                      disabled={!canRecordLiveVerdict}
                      className="mt-1 w-full rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-sm text-ink-primary outline-none focus:border-[#f07c00] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="passed">Pass</option>
                      <option value="blocked">Block</option>
                    </select>
                  </label>
                  <label className="block text-xs text-ink-muted">
                    Note
                    <textarea
                      value={verdictNote}
                      onChange={(event) => setVerdictNote(event.target.value)}
                      rows={4}
                      disabled={!canRecordLiveVerdict}
                      className="mt-1 w-full rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-sm text-ink-primary outline-none focus:border-[#f07c00] disabled:cursor-not-allowed disabled:opacity-60"
                      placeholder="Explain the release decision."
                    />
                  </label>
                  <InlineMessage state={verdictState} successStatus="verdict_saved" />
                  <button
                    type="button"
                    onClick={handleRecordQualityGateVerdict}
                    disabled={!canRecordLiveVerdict || verdictState.status === 'verdict_submitting'}
                    className="ops-action-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {verdictState.status === 'verdict_submitting' ? (
                      <RefreshCw size={15} className="animate-spin" />
                    ) : (
                      <ShieldCheck size={15} />
                    )}
                    Record Verdict
                  </button>
                </>
              ) : (
                <EmptyPanelState
                  title="No verdict target"
                  copy="Load a release review first."
                />
              )}
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink-primary">Super-admin override</p>
                <span className={`badge ${canOverrideLiveQa ? 'badge-blue' : 'badge-gray'}`}>
                  {canOverrideLiveQa ? 'Editable' : 'Locked'}
                </span>
              </div>
              {latestOverride ? (
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-100">
                  <p className="font-semibold">{formatLabel(latestOverride.actorRole)} override</p>
                  <p className="mt-2">{latestOverride.reason}</p>
                  <p className="mt-2 text-xs text-blue-200">{formatDateTime(latestOverride.createdAt)}</p>
                </div>
              ) : (
                <div className="ops-panel-muted text-sm text-ink-muted">
                  No override recorded.
                </div>
              )}
              <label className="block text-xs text-ink-muted">
                Override reason
                <textarea
                  value={overrideReason}
                  onChange={(event) => setOverrideReason(event.target.value)}
                  rows={4}
                  disabled={!qualityGate || !canOverrideLiveQa || qualityGate.status !== 'blocked'}
                  className="mt-1 w-full rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-sm text-ink-primary outline-none focus:border-[#f07c00] disabled:cursor-not-allowed disabled:opacity-60"
                  placeholder="Explain why release can continue."
                />
              </label>
              <InlineMessage state={overrideState} successStatus="override_saved" />
              <button
                type="button"
                onClick={handleOverrideQualityGate}
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
                Record Override
              </button>
            </div>
          </div>
        </SectionFrame>

        <SectionFrame
          title="History"
          copy="Review recent audit timing and linked release context."
          badge={qualityGate ? <span className="badge badge-gray">{getReleaseCopy(selectedReleaseState)}</span> : null}
        >
          {qualityGate ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="ops-panel-muted flex items-center justify-between gap-4">
                <span className="text-ink-muted">Requested</span>
                <span className="text-sm text-ink-primary">{formatDateTime(qualityGate.lastAuditRequestedAt)}</span>
              </div>
              <div className="ops-panel-muted flex items-center justify-between gap-4">
                <span className="text-ink-muted">Completed</span>
                <span className="text-sm text-ink-primary">{formatDateTime(qualityGate.lastAuditCompletedAt)}</span>
              </div>
              <div className="ops-panel-muted flex items-center justify-between gap-4">
                <span className="text-ink-muted">Queue Status</span>
                <span className="text-sm text-ink-primary">{formatLabel(qualityGate.auditJob?.status ?? 'not_available')}</span>
              </div>
              <div className="ops-panel-muted flex items-center justify-between gap-4">
                <span className="text-ink-muted">Release</span>
                <span className="text-sm text-ink-primary">{formatLabel(selectedReleaseState)}</span>
              </div>
            </div>
          ) : (
            <EmptyPanelState
              title="No audit history"
              copy="Load a release review to inspect audit timing."
            />
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="badge badge-gray">
              <AlertTriangle size={12} />
              Queue-driven release review
            </span>
            <PortalLink href="/admin/job-orders" className="inline-flex items-center gap-2 text-sm font-bold text-brand-orange">
              Continue in Job Orders <ExternalLink size={14} />
            </PortalLink>
            {selectedReleaseState === 'release_allowed' ? (
              <span className="badge badge-green">
                <BadgeCheck size={12} />
                Release ready
              </span>
            ) : null}
          </div>
        </SectionFrame>
      </div>
    </div>
  )
}
