'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
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

import { useToast } from '@/components/Toast.jsx'
import { ApiError } from '@/lib/authClient'
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
  isQualityGateReleaseAllowed,
  isQualityGateReleaseBlocked,
  qualityGateReviewContractSources,
} from '@/lib/api/generated/quality-gates/staff-web-qa-review'

const initialQaState = {
  status: 'qa_ready',
  message: '',
}

const initialOverrideState = {
  status: 'override_ready',
  message: '',
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

function getQualityStatusTone(status) {
  if (status === 'passed') return 'badge-green'
  if (status === 'blocked') return 'badge-red'
  if (status === 'overridden') return 'badge-blue'
  return 'badge-orange'
}

function getReleaseTone(state) {
  if (state === 'release_allowed' || state === 'release_allowed_by_override') return 'badge-green'
  if (state === 'release_blocked') return 'badge-red'
  if (state === 'release_pending_audit') return 'badge-orange'
  return 'badge-gray'
}

function getReleaseCopy(state) {
  if (state === 'release_allowed_by_override') return 'Release allowed by super-admin override'
  if (state === 'release_allowed') return 'Release allowed after QA pass'
  if (state === 'release_blocked') return 'Release blocked by QA findings'
  if (state === 'release_pending_audit') return 'Release pending QA audit'
  return 'QA unavailable for release'
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

function WorkflowStep({ number, title, copy }) {
  return (
    <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-orange/10 text-sm font-black text-brand-orange">
          {number}
        </div>
        <div>
          <p className="text-sm font-bold text-ink-primary">{title}</p>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">{copy}</p>
        </div>
      </div>
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
        {riskContribution !== null ? (
          <span className="badge badge-orange">Risk {riskContribution}</span>
        ) : null}
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

function LiveQualityGateDetail({ qualityGate }) {
  if (!qualityGate) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-surface-border bg-surface-raised px-5 py-10 text-center">
        <ShieldCheck size={28} className="mx-auto text-ink-muted" />
        <p className="mt-3 text-sm font-bold text-ink-primary">No QA gate loaded</p>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Load a known ready-for-QA job order from the Job Order Workbench. This page will stay empty until live QA data is available.
        </p>
      </div>
    )
  }

  const releaseState = getQualityGateReleaseState(qualityGate)
  const findings = Array.isArray(qualityGate.findings) ? qualityGate.findings : []
  const blockingFindings = getBlockingQualityGateFindings(qualityGate)
  const reviewFindings = getReviewNeededQualityGateFindings(qualityGate)
  const latestOverride = getLatestQualityGateOverride(qualityGate)
  const releaseAllowed = isQualityGateReleaseAllowed(qualityGate)
  const releaseBlocked = isQualityGateReleaseBlocked(qualityGate)

  return (
    <div className="mt-5 space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          icon={ShieldCheck}
          label="QA Status"
          value={formatLabel(qualityGate.status)}
          toneClass={qualityGate.status === 'blocked' ? 'border-red-500/15 bg-red-500/10 text-red-400' : 'border-emerald-500/15 bg-emerald-500/10 text-emerald-400'}
        />
        <StatCard
          icon={AlertTriangle}
          label="Risk Score"
          value={qualityGate.riskScore}
          toneClass={qualityGate.riskScore >= 60 ? 'border-red-500/15 bg-red-500/10 text-red-400' : 'border-brand-orange/15 bg-brand-orange/10 text-brand-orange'}
        />
        <StatCard
          icon={ClipboardCheck}
          label="Blocking Findings"
          value={blockingFindings.length}
          toneClass="border-amber-500/15 bg-amber-500/10 text-amber-300"
        />
        <StatCard
          icon={BadgeCheck}
          label="Release"
          value={releaseAllowed ? 'Allowed' : releaseBlocked ? 'Blocked' : 'Unavailable'}
          toneClass={releaseAllowed ? 'border-emerald-500/15 bg-emerald-500/10 text-emerald-400' : 'border-red-500/15 bg-red-500/10 text-red-400'}
        />
      </div>

      <div className="rounded-2xl border border-surface-border bg-surface-raised p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink-primary">Release Decision</p>
            <p className="mt-1 text-sm text-ink-secondary">
              Completion and customer release should follow this QA state, not generic job-order status alone.
            </p>
          </div>
          <span className={`badge ${getReleaseTone(releaseState)}`}>{getReleaseCopy(releaseState)}</span>
        </div>
        {qualityGate.blockingReason ? (
          <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {qualityGate.blockingReason}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-surface-border bg-surface-card p-4">
          <p className="text-sm font-semibold text-ink-primary">Audit Worker</p>
          <dl className="mt-3 grid gap-3 text-sm text-ink-secondary">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Requested</dt>
              <dd>{formatDateTime(qualityGate.lastAuditRequestedAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Completed</dt>
              <dd>{formatDateTime(qualityGate.lastAuditCompletedAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Queue status</dt>
              <dd>{formatLabel(qualityGate.auditJob?.status ?? 'not_available')}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-surface-border bg-surface-card p-4">
          <p className="text-sm font-semibold text-ink-primary">Override Audit</p>
          {latestOverride ? (
            <div className="mt-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-sm text-blue-100">
              <p className="font-semibold">{formatLabel(latestOverride.actorRole)} override</p>
              <p className="mt-2 leading-6">{latestOverride.reason}</p>
              <p className="mt-2 text-xs text-blue-200">{formatDateTime(latestOverride.createdAt)}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">
              No override has been recorded. Blocked gates require a super-admin reason before release can continue.
            </p>
          )}
        </section>
      </div>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink-primary">Findings</p>
            <p className="mt-1 text-xs text-ink-muted">
              {blockingFindings.length} blocking and {reviewFindings.length} review-needed finding(s).
            </p>
          </div>
          <span className={`badge ${getQualityStatusTone(qualityGate.status)}`}>{formatLabel(qualityGate.status)}</span>
        </div>
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          {findings.length ? (
            findings.map((finding) => (
              <QualityFindingCard key={finding.id} finding={finding} />
            ))
          ) : (
            <div className="rounded-2xl border border-surface-border bg-surface-card p-4 text-sm text-ink-muted">
              No findings have been recorded yet.
            </div>
          )}
        </div>
      </section>
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
  const [overrideReason, setOverrideReason] = useState('')
  const [qaState, setQaState] = useState(initialQaState)
  const [overrideState, setOverrideState] = useState(initialOverrideState)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const nextJobOrderId = new URLSearchParams(window.location.search).get('jobOrderId')
    if (nextJobOrderId) {
      setJobOrderId(nextJobOrderId)
    }
  }, [])

  const selectedReleaseState = getQualityGateReleaseState(qualityGate)
  const sourceCount = useMemo(() => qualityGateReviewContractSources.length, [])

  async function loadQualityGate() {
    if (!jobOrderId.trim()) {
      setQaState({
        status: 'qa_not_found',
        message: 'Paste a job-order id before loading QA.',
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
    <div className="space-y-6">
      <section className="card relative overflow-hidden p-6 md:p-7">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-72 bg-gradient-to-l from-brand-orange/10 to-transparent" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-orange">Live QA Operations</p>
            <h1 className="mt-3 text-3xl font-bold text-ink-primary">Quality Gate Review And Override</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-secondary">
              Load a real job order QA gate, review findings and release blocks, then record super-admin overrides when an exception is justified.
            </p>
          </div>
          <Link href="/admin/job-orders" className="btn-primary">
            <ClipboardCheck size={15} />
            Open Job Orders
          </Link>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <WorkflowStep number="1" title="Open Job Order" copy="Find or create the job order from a confirmed booking in the Job Order Workbench." />
        <WorkflowStep number="2" title="Move To QA" copy="Use status and evidence actions until the job order reaches the QA-ready backend state." />
        <WorkflowStep number="3" title="Load Gate Here" copy="Paste the job-order id below to review live QA findings, risk, and release state." />
        <WorkflowStep number="4" title="Override Only If Needed" copy="Super admins can override blocked gates with a reason; original findings stay visible." />
      </section>

      <section className="card p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="card-title">QA Gate Lookup</p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-secondary">
              Paste one job-order id to review its QA findings and release state. A broad QA queue is planned later,
              so this page intentionally shows an empty state until staff load a known job order.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`badge ${canReadLiveQa ? 'badge-green' : 'badge-red'}`}>
              Read: {canReadLiveQa ? formatLabel(role) : 'Forbidden role'}
            </span>
            <span className={`badge ${canOverrideLiveQa ? 'badge-green' : 'badge-gray'}`}>
              Override: {canOverrideLiveQa ? 'Super Admin' : 'Locked'}
            </span>
          </div>
        </div>

        <form
          className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault()
            loadQualityGate()
          }}
        >
          <label className="text-xs text-ink-muted">
            Job-order id
            <input
              value={jobOrderId}
              onChange={(event) => setJobOrderId(event.target.value)}
              className="mt-1 w-full rounded-xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
              placeholder="Paste a ready-for-QA job-order UUID"
            />
          </label>
          <button type="submit" disabled={qaState.status === 'qa_loading'} className="btn-primary self-end">
            {qaState.status === 'qa_loading' ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              <Search size={15} />
            )}
            Load Live QA
          </button>
        </form>

        {qaState.message ? (
          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
              qaState.status === 'qa_loaded'
                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                : qaState.status === 'qa_unavailable'
                  ? 'border-amber-500/25 bg-amber-500/10 text-amber-100'
                  : 'border-red-500/25 bg-red-500/10 text-red-200'
            }`}
          >
            {qaState.message}
          </div>
        ) : null}

        <LiveQualityGateDetail qualityGate={qualityGate} />

        {qualityGate ? (
          <div className="mt-5 rounded-2xl border border-surface-border bg-surface-raised p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink-primary">Super-Admin Override</p>
                <p className="mt-1 text-sm text-ink-secondary">
                  Overrides are only enabled for blocked gates and never delete original QA findings.
                </p>
              </div>
              <span className={`badge ${getReleaseTone(selectedReleaseState)}`}>{getReleaseCopy(selectedReleaseState)}</span>
            </div>
            <label className="mt-4 block text-xs text-ink-muted">
              Override reason
              <textarea
                value={overrideReason}
                onChange={(event) => setOverrideReason(event.target.value)}
                rows={4}
                disabled={!canOverrideLiveQa || qualityGate.status !== 'blocked'}
                className="mt-1 w-full rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-sm text-ink-primary outline-none focus:border-[#f07c00] disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="Explain why a supervisor is approving release despite the blocked QA state."
              />
            </label>
            {overrideState.message ? (
              <div
                className={`mt-3 rounded-xl border px-4 py-3 text-sm ${
                  overrideState.status === 'override_saved'
                    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                    : 'border-red-500/25 bg-red-500/10 text-red-200'
                }`}
              >
                {overrideState.message}
              </div>
            ) : null}
            <button
              type="button"
              onClick={handleOverrideQualityGate}
              disabled={overrideState.status === 'override_submitting' || !canOverrideLiveQa || qualityGate.status !== 'blocked'}
              className="btn-danger mt-3 disabled:cursor-not-allowed disabled:opacity-50"
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
        ) : null}
      </section>

      <section className="card p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="card-title">What This Page Does</p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-secondary">
              QA Audit is a live review and override surface. It does not create inspections, job orders, or fake audit queues.
            </p>
          </div>
          <span className="badge badge-gray">{sourceCount} source references</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
            <p className="text-sm font-bold text-ink-primary">Staff Action</p>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">
              Load one known job-order id, inspect its findings, then return to Job Orders for execution work.
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
            <Link href="/admin/job-orders" className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-brand-orange">
              Continue in Job Orders <ExternalLink size={14} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
