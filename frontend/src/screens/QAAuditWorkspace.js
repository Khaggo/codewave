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
import {
  getJobOrderQualityGate,
  overrideJobOrderQualityGate,
  recordJobOrderQualityGateVerdict,
} from '@/lib/qualityGateClient'
import { useUser } from '@/lib/userContext.jsx'
import {
  canStaffRecordQualityGateVerdict,
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

const initialVerdictState = {
  status: 'verdict_ready',
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
    value: 'Pending Review',
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
  if (state === 'release_allowed') return 'Release allowed after head-technician pass'
  if (state === 'release_blocked') return 'Release blocked for technician remediation'
  if (state === 'release_pending_audit') return 'Awaiting head-technician review'
  return 'Awaiting pre-check load before release decision'
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

function PreCheckSummaryPanel({ qualityGate }) {
  const summary = qualityGate?.preCheckSummary ?? null
  const evidenceGaps = Array.isArray(summary?.evidenceGaps) ? summary.evidenceGaps : []
  const discrepancies = Array.isArray(summary?.inspectionDiscrepancies) ? summary.inspectionDiscrepancies : []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="card-title">Pre-Check Summary</p>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">
            The evidence validator prepares this summary for the head technician. It never passes or blocks release on its own.
          </p>
        </div>
        <span className={`badge ${getQualityStatusTone(qualityGate?.status)}`}>
          {qualityGate ? formatLabel(qualityGate.preCheckStatus) : 'Awaiting load'}
        </span>
      </div>
      {qualityGate ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="ops-panel-muted">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Completed work items</p>
              <p className="mt-2 text-lg font-semibold text-ink-primary">
                {summary?.completedWorkItemCount ?? 0} / {summary?.totalWorkItemCount ?? 0}
              </p>
            </div>
            <div className="ops-panel-muted">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Attached photos</p>
              <p className="mt-2 text-lg font-semibold text-ink-primary">{summary?.attachedPhotoCount ?? 0}</p>
            </div>
            <div className="ops-panel-muted">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Evidence gaps</p>
              <p className="mt-2 text-lg font-semibold text-ink-primary">{summary?.evidenceGapCount ?? evidenceGaps.length}</p>
            </div>
            <div className="ops-panel-muted">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Semantic match</p>
              <p className="mt-2 text-lg font-semibold text-ink-primary">{summary?.semanticMatchScore ?? '—'}</p>
            </div>
          </div>
          {qualityGate.preCheckStatus === 'unavailable' ? (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Pre-check unavailable — manual review required.
            </div>
          ) : null}
          {summary?.automatedRecommendation || summary?.infrastructureState ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="ops-panel-muted text-sm text-ink-secondary">
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Validator recommendation</p>
                <p className="mt-2">{formatLabel(summary?.automatedRecommendation ?? 'not_available')}</p>
              </div>
              <div className="ops-panel-muted text-sm text-ink-secondary">
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Infrastructure state</p>
                <p className="mt-2">{formatLabel(summary?.infrastructureState ?? qualityGate.preCheckStatus)}</p>
              </div>
            </div>
          ) : null}
          {evidenceGaps.length > 0 ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
              <p className="text-sm font-bold text-amber-100">Evidence gaps</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-amber-50">
                {evidenceGaps.map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {discrepancies.length > 0 ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
              <p className="text-sm font-bold text-red-100">Inspection discrepancies</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-red-50">
                {discrepancies.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <EmptyPanelState
          title="No pre-check summary loaded yet"
          copy="Load a ready-for-review job order to inspect the live evidence validator summary before the head technician decides pass or block."
        />
      )}
    </div>
  )
}

function ReleaseDecisionPanel({ qualityGate, releaseState }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="card-title">Release Decision</p>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">
            Completion and customer release should follow the head-technician verdict, not the automated pre-check alone.
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
          copy="Load a known ready-for-review job order from the Job Order Workbench to review its pre-check summary and release decision."
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
            Automated pre-check findings stay grouped here so the head technician can quickly confirm what still needs physical verification.
          </p>
        </div>
        <EmptyPanelState
          title="No findings to review yet"
          copy="This panel will show live severity, provenance, and risk contribution details after a pre-check review is loaded."
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
            Review blocking and advisory findings before the head technician passes the job or a super admin records an override.
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
            Monitor pre-check request timing, worker completion, and the release state that staff should follow.
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

function HeadTechnicianVerdictPanel({
  canRecordLiveVerdict,
  qualityGate,
  verdict,
  note,
  verdictState,
  onVerdictChange,
  onNoteChange,
  onSubmit,
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="card-title">Head Technician Verdict</p>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">
            Only the head technician can pass or block the release after physically reviewing the work and the pre-check summary.
          </p>
        </div>
        <span className={`badge ${canRecordLiveVerdict ? 'badge-green' : 'badge-gray'}`}>
          {canRecordLiveVerdict ? 'Head Technician' : 'Read only'}
        </span>
      </div>
      {qualityGate ? (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="ops-panel-muted">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Current verdict</p>
              <p className="mt-2 text-sm font-semibold text-ink-primary">{formatLabel(qualityGate.reviewerVerdict)}</p>
            </div>
            <div className="ops-panel-muted">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Reviewed at</p>
              <p className="mt-2 text-sm font-semibold text-ink-primary">{formatDateTime(qualityGate.reviewedAt)}</p>
            </div>
          </div>
          {qualityGate.reviewerNote ? (
            <div className="ops-panel-muted text-sm text-ink-secondary">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Latest verdict note</p>
              <p className="mt-2 leading-6">{qualityGate.reviewerNote}</p>
            </div>
          ) : null}
          <label className="block text-xs text-ink-muted">
            Verdict
            <select
              value={verdict}
              onChange={(event) => onVerdictChange(event.target.value)}
              disabled={!canRecordLiveVerdict}
              className="mt-1 w-full rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-sm text-ink-primary outline-none focus:border-[#f07c00] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="passed">Pass</option>
              <option value="blocked">Block</option>
            </select>
          </label>
          <label className="block text-xs text-ink-muted">
            Head-technician note
            <textarea
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              rows={4}
              disabled={!canRecordLiveVerdict}
              className="mt-1 w-full rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-sm text-ink-primary outline-none focus:border-[#f07c00] disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Explain the physical inspection result or the remediation instruction for the technician."
            />
          </label>
          {verdictState.message ? (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                verdictState.status === 'verdict_saved'
                  ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                  : 'border-red-500/25 bg-red-500/10 text-red-200'
              }`}
            >
              {verdictState.message}
            </div>
          ) : null}
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canRecordLiveVerdict || verdictState.status === 'verdict_submitting'}
            className="ops-action-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {verdictState.status === 'verdict_submitting' ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              <ShieldCheck size={15} />
            )}
            Record Head-Technician Verdict
          </button>
        </>
      ) : (
        <EmptyPanelState
          title="No review loaded yet"
          copy="Load a ready-for-review job order first so the head technician can decide pass or block."
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
            Overrides remain fully auditable and never replace the original pre-check findings or the missing head-technician accountability.
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
            QA Review is a live pre-check, verdict, and override surface. It does not create inspections, job orders, or fake audit queues.
          </p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
          <p className="text-sm font-bold text-ink-primary">Staff Action</p>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">
            Load one live job order from the selector, inspect the pre-check summary, then return to Job Orders if remediation is needed.
          </p>
        </div>
        <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
          <p className="text-sm font-bold text-ink-primary">Super Admin Action</p>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">
            Override only blocked reviews, with a clear reason that stays in the audit trail.
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
        message: 'Only assigned technicians, head technicians, service advisers, and super admins can read release reviews.',
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
        message: 'Live pre-check and release review loaded from the backend.',
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

  async function handleRecordQualityGateVerdict() {
    if (!qualityGate) {
      setVerdictState({
        status: 'verdict_not_found',
        message: 'Load a pre-check review before recording a head-technician verdict.',
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
        message:
          updatedQualityGate.reviewerVerdict === 'blocked'
            ? 'Head-technician block recorded. The job order should return to in-progress remediation.'
            : 'Head-technician pass recorded. Finalization can proceed when other blockers are clear.',
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
      <section className="ops-page-header">
        <div className="space-y-2">
          <p className="ops-page-kicker">Quality Governance</p>
          <h1 className="ops-page-title">QA Review Workspace</h1>
          <p className="ops-page-copy">
            Review automated pre-check summaries, let the head technician record the final pass or block verdict, and keep overrides auditable when a super admin must intervene.
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
              <option value="">Choose a job order for pre-check review</option>
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
            <span className={`badge ${canRecordLiveVerdict ? 'badge-green' : 'badge-gray'}`}>
              Verdict: {canRecordLiveVerdict ? 'Head Technician' : 'Locked'}
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
            Load Review
          </button>
        </form>
        <StatusMessage state={qaState} />
      </section>

      <section className="ops-summary-grid">
        <StatCard
          icon={ShieldCheck}
          label="Review Status"
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
          <PreCheckSummaryPanel qualityGate={qualityGate} />
        </div>
        <div className="ops-panel">
          <FindingsReviewPanel qualityGate={qualityGate} />
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="ops-panel">
            <HeadTechnicianVerdictPanel
              canRecordLiveVerdict={canRecordLiveVerdict}
              qualityGate={qualityGate}
              verdict={verdictDraft}
              note={verdictNote}
              verdictState={verdictState}
              onVerdictChange={setVerdictDraft}
              onNoteChange={setVerdictNote}
              onSubmit={handleRecordQualityGateVerdict}
            />
          </div>
          <div className="ops-panel">
            <AuditTimelinePanel qualityGate={qualityGate} releaseState={selectedReleaseState} />
          </div>
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
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
          <div className="ops-panel">
            <ContractSourcesPanel />
          </div>
        </div>
      </section>
    </div>
  )
}
