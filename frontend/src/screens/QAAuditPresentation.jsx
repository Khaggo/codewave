import { ShieldCheck } from 'lucide-react'

import { getFindingRiskContribution } from '@/lib/api/generated/quality-gates/staff-web-qa-review'
import { getLoadedJobOrderReference } from './qaAuditPresentationModel.mjs'

export { getLoadedJobOrderReference } from './qaAuditPresentationModel.mjs'

export const releaseSummaryByState = {
  release_allowed: { value: 'Allowed', toneClass: 'badge badge-green' },
  release_allowed_by_override: { value: 'Allowed by Override', toneClass: 'badge badge-blue' },
  release_blocked: { value: 'Blocked', toneClass: 'badge badge-red' },
  release_pending_audit: { value: 'Pending Review', toneClass: 'badge badge-orange' },
  release_unavailable: { value: 'Awaiting Load', toneClass: 'badge badge-gray' },
}

export function getPendingReviewGuidance({
  qualityGate,
  blockingFindings,
  reviewNeededFindings,
  canRecordLiveVerdict,
}) {
  if (!qualityGate || qualityGate.status !== 'pending_review') return null

  if (blockingFindings.length > 0) {
    return {
      toneClass: 'rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100',
      message: qualityGate.blockingReason || 'Resolve the blocking QA findings before release can continue.',
    }
  }

  if (reviewNeededFindings.length > 0) {
    return {
      toneClass: 'rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100',
      message: 'QA is awaiting reviewer attention. Clear the warning findings, then record the adviser release verdict.',
    }
  }

  return {
    toneClass: 'rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100',
    message: canRecordLiveVerdict
      ? 'No blocking findings remain. Record a Pass verdict to clear this release.'
      : 'No blocking findings remain. A service adviser or super admin still needs to record Pass before release can continue.',
  }
}

export function formatLabel(value) {
  return String(value ?? '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function formatDateTime(value) {
  if (!value) return 'Not recorded'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getReleaseCopy(state) {
  if (state === 'release_allowed_by_override') return 'Release allowed by override.'
  if (state === 'release_allowed') return 'Release allowed.'
  if (state === 'release_blocked') return 'Release blocked.'
  if (state === 'release_pending_audit') return 'Awaiting review.'
  return 'Load a QA gate to review release.'
}

export function EmptyPanelState({ title, copy }) {
  return (
    <div className="empty-panel">
      <ShieldCheck size={28} className="mx-auto text-ink-muted" />
      <p className="mt-3 text-sm font-semibold text-ink-primary">{title}</p>
      <p className="mt-2 text-sm text-ink-secondary">{copy}</p>
    </div>
  )
}

export function StatusMessage({ state }) {
  if (!state.message) return null
  const toneClass =
    state.status === 'qa_loaded' || state.status === 'qa_completed'
      ? 'status-message status-message-success'
      : state.status === 'qa_unavailable'
        ? 'status-message status-message-warning'
        : 'status-message status-message-danger'
  return <div className={toneClass}>{state.message}</div>
}

export function InlineMessage({ state, successStatus }) {
  if (!state.message) return null
  return (
    <div className={state.status === successStatus ? 'status-message status-message-success' : 'status-message status-message-danger'}>
      {state.message}
    </div>
  )
}

export function QualityFindingCard({ finding }) {
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

export function SectionFrame({ id, title, copy, badge, children }) {
  return (
    <section id={id} className="ops-panel scroll-mt-24">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="card-title">{title}</p>
          {copy ? <p className="mt-2 text-sm text-ink-secondary">{copy}</p> : null}
        </div>
        {badge || null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}
