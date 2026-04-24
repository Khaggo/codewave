'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  FileImage,
  Lock,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import {
  AUDIT_STATUS,
  isRiskGatePassed,
  isSemanticGatePassed,
  qaAuditCases,
  serviceSummaries,
  vehicles,
} from '@autocare/shared'
import Link from 'next/link'

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
import {
  blockedQualityGateMock,
  overriddenQualityGateMock,
  passedQualityGateMock,
  pendingQualityGateMock,
  staffQualityGateResolvedStateMocks,
} from '@/mocks/quality-gates/mocks'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
}

const initialQaState = {
  status: 'qa_ready',
  message: '',
}

const initialOverrideState = {
  status: 'override_ready',
  message: '',
}

const contractQualityGateExamples = [
  pendingQualityGateMock,
  blockedQualityGateMock,
  passedQualityGateMock,
  overriddenQualityGateMock,
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

  return date.toLocaleString()
}

function getAuditStatusTone(status) {
  if (status === AUDIT_STATUS.APPROVED) return 'badge-green'
  if (status === AUDIT_STATUS.FLAGGED) return 'badge-red'
  if (status === AUDIT_STATUS.RESOLVED) return 'badge-blue'
  return 'badge-orange'
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
  if (state === 'release_allowed_by_override') {
    return 'Release allowed by super-admin override'
  }

  if (state === 'release_allowed') {
    return 'Release allowed after QA pass'
  }

  if (state === 'release_blocked') {
    return 'Release blocked by QA findings'
  }

  if (state === 'release_pending_audit') {
    return 'Release pending QA audit'
  }

  return 'QA unavailable for release'
}

function GatePill({ label, passed, value }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${passed ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-red-500/20 bg-red-500/10'}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">{label}</p>
        <span className={`badge ${passed ? 'badge-green' : 'badge-red'}`}>{passed ? 'Pass' : 'Flag'}</span>
      </div>
      <p className={`mt-3 text-2xl font-bold ${passed ? 'text-emerald-400' : 'text-red-400'}`}>{value}</p>
    </div>
  )
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
    return null
  }

  const releaseState = getQualityGateReleaseState(qualityGate)
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
              Completion and invoice release should follow this QA state, not generic job-order status alone.
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
          {qualityGate.findings.length > 0 ? (
            qualityGate.findings.map((finding) => (
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

function AuditDrawer({ auditCase, onClose, onApprove, onOverride, canOverride }) {
  if (!auditCase) return null

  const semanticPassed = isSemanticGatePassed(auditCase.semanticResolutionScore)
  const riskPassed = isRiskGatePassed(auditCase.inspectionRiskPoints)

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-40 flex justify-end bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.aside
          role="dialog"
          aria-modal="true"
          aria-label={`Audit case ${auditCase.jobOrderId}`}
          className="flex h-full w-full max-w-2xl flex-col border-l border-surface-border bg-surface-card shadow-2xl"
          initial={{ x: 48, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 48, opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="border-b border-surface-border px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-orange">Contract Example Detail</p>
                <h2 className="mt-3 text-2xl font-bold text-ink-primary">{auditCase.jobOrderId}</h2>
                <p className="mt-2 text-sm text-ink-secondary">
                  Example cases stay mock-only. Use the live loader above for backend-backed QA review and override.
                </p>
              </div>
              <button type="button" onClick={onClose} className="btn-ghost px-3 py-2">
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="cc-scrollbar flex-1 space-y-6 overflow-y-auto px-6 py-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <GatePill label="Gate 1" passed={semanticPassed} value={auditCase.semanticResolutionScore.toFixed(2)} />
              <GatePill label="Gate 2" passed={riskPassed} value={`${auditCase.inspectionRiskPoints} pts`} />
            </div>

            <section className="card-raised p-5">
              <div className="flex items-center gap-2">
                <ClipboardCheck size={16} className="text-brand-orange" />
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-ink-secondary">Technician Notes</h3>
              </div>
              <p className="mt-4 text-sm leading-7 text-ink-secondary">{auditCase.technicianNotes}</p>
            </section>

            <section className="card-raised p-5">
              <div className="flex items-center gap-2">
                <Camera size={16} className="text-brand-orange" />
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-ink-secondary">Photo Evidence</h3>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {auditCase.uploadedEvidence.map((url) => {
                  const filename = url.split('/').pop()
                  return (
                    <div key={url} className="rounded-3xl border border-surface-border bg-surface-raised p-4">
                      <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-dashed border-brand-orange/20 bg-gradient-to-br from-brand-orange/10 via-surface-card to-surface-raised">
                        <div className="text-center">
                          <FileImage size={26} className="mx-auto text-brand-orange" />
                          <p className="mt-3 text-sm font-semibold text-ink-primary">Mock Photo Evidence</p>
                        </div>
                      </div>
                      <p className="mt-4 text-sm font-medium text-ink-primary">{filename}</p>
                      <a href={url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-orange">
                        Open mock URL <ArrowRight size={12} />
                      </a>
                    </div>
                  )
                })}
              </div>
            </section>

            {auditCase.relatedSummary ? (
              <section className="card-raised p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink-primary">Linked Customer Summary</p>
                    <p className="mt-1 text-sm text-ink-secondary">{auditCase.relatedSummary.generatedLaymanSummary}</p>
                  </div>
                  <Link href="/admin/summaries" className="btn-ghost">
                    <Sparkles size={15} />
                    Review Summary
                  </Link>
                </div>
              </section>
            ) : null}
          </div>

          <div className="border-t border-surface-border px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className={`badge ${getAuditStatusTone(auditCase.auditStatus)}`}>{auditCase.auditStatus}</span>
                {!canOverride ? (
                  <p className="mt-2 text-xs text-amber-300">Live overrides require Super Admin access.</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={onApprove} className="btn-primary">
                  <CheckCircle2 size={15} />
                  Mark Example Reviewed
                </button>
                <button type="button" onClick={onOverride} className="btn-danger disabled:opacity-50 disabled:cursor-not-allowed" disabled={!canOverride}>
                  <ShieldAlert size={15} />
                  Mark Example Override
                </button>
              </div>
            </div>
          </div>
        </motion.aside>
      </motion.div>
    </AnimatePresence>
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
  const [auditItems, setAuditItems] = useState(() =>
    qaAuditCases.map((auditCase) => ({
      ...auditCase,
      relatedVehicle: vehicles.find((vehicle) => vehicle.id === auditCase.vehicleId),
      relatedSummary: serviceSummaries.find((summary) => summary.jobOrderId === auditCase.jobOrderId),
    }))
  )
  const [selectedAuditId, setSelectedAuditId] = useState(null)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const nextJobOrderId = new URLSearchParams(window.location.search).get('jobOrderId')
    if (nextJobOrderId) {
      setJobOrderId(nextJobOrderId)
    }
  }, [])

  const selectedAudit = auditItems.find((auditCase) => auditCase.id === selectedAuditId) ?? null
  const selectedReleaseState = getQualityGateReleaseState(qualityGate)

  const stats = useMemo(() => {
    const approved = auditItems.filter((auditCase) => auditCase.auditStatus === AUDIT_STATUS.APPROVED).length
    const flagged = auditItems.filter((auditCase) => auditCase.auditStatus === AUDIT_STATUS.FLAGGED).length
    const averageSemantic = auditItems.reduce((sum, auditCase) => sum + auditCase.semanticResolutionScore, 0) / auditItems.length

    return { approved, flagged, averageSemantic }
  }, [auditItems])

  async function loadQualityGate() {
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
        jobOrderId,
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
        reason: overrideReason,
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

  function updateAuditStatus(nextStatus) {
    if (!selectedAudit) return

    setAuditItems((current) =>
      current.map((auditCase) =>
        auditCase.id === selectedAudit.id
          ? { ...auditCase, auditStatus: nextStatus }
          : auditCase
      )
    )

    toast({
      type: nextStatus === AUDIT_STATUS.APPROVED ? 'success' : 'info',
      title: nextStatus === AUDIT_STATUS.APPROVED ? 'Example Reviewed' : 'Example Override Marked',
      message: `${selectedAudit.jobOrderId} is now marked as ${nextStatus} in local examples only.`,
    })
  }

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="card relative overflow-hidden p-6 md:p-7"
      >
        <div className="pointer-events-none absolute inset-y-0 right-0 w-72 bg-gradient-to-l from-brand-orange/10 to-transparent" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-orange">Live QA Operations</p>
            <h1 className="mt-3 text-3xl font-bold text-ink-primary">Quality Gate Review And Override</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-secondary">
              Load a real job order QA gate, review findings and release blocks, then record super-admin overrides through the live backend route when an exception is justified.
            </p>
          </div>
          <Link href="/admin/job-orders" className="btn-primary">
            <ClipboardCheck size={15} />
            Open Job Orders
          </Link>
        </div>
      </motion.section>

      <section className="card p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="card-title">Live QA Gate Lookup</p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-secondary">
              This page uses `GET /api/job-orders/:jobOrderId/qa` and `PATCH /api/job-orders/:jobOrderId/qa/override`.
              There is no broad QA list endpoint yet, so staff should load a known job-order id from the workbench.
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
              placeholder="Paste a ready-for-QA job order UUID"
            />
          </label>
          <button
            type="submit"
            disabled={qaState.status === 'qa_loading'}
            className="btn-primary self-end"
          >
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
                  Overrides are only enabled for blocked gates and never delete the original QA findings.
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
              disabled={
                overrideState.status === 'override_submitting' ||
                !canOverrideLiveQa ||
                qualityGate.status !== 'blocked'
              }
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

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard icon={BadgeCheck} label="Example Approved Cases" value={stats.approved} toneClass="border-emerald-500/15 bg-emerald-500/10 text-emerald-400" />
        <StatCard icon={AlertTriangle} label="Example Flagged Cases" value={stats.flagged} toneClass="border-red-500/15 bg-red-500/10 text-red-400" />
        <StatCard icon={BrainCircuit} label="Avg. Example Gate 1" value={stats.averageSemantic.toFixed(2)} toneClass="border-brand-orange/15 bg-brand-orange/10 text-brand-orange" />
      </section>

      <section className="card p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="card-title">Contract Example States</p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-secondary">
              These examples prove pending, blocked, passed, and overridden state handling without inventing a QA list endpoint.
            </p>
          </div>
          <span className="badge badge-gray">
            Sources: {qualityGateReviewContractSources.length} contracts
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {contractQualityGateExamples.map((example) => {
            const releaseState = getQualityGateReleaseState(example)
            return (
              <div key={`${example.id}-${example.status}`} className="rounded-2xl border border-surface-border bg-surface-raised p-4">
                <span className={`badge ${getQualityStatusTone(example.status)}`}>{formatLabel(example.status)}</span>
                <p className="mt-3 text-2xl font-bold text-ink-primary">{example.riskScore}</p>
                <p className="mt-1 text-xs text-ink-muted">Risk score</p>
                <p className="mt-3 text-xs text-ink-secondary">{getReleaseCopy(releaseState)}</p>
              </div>
            )
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-ink-muted">
          <span className="badge badge-gray">Technician read: {String(staffQualityGateResolvedStateMocks.technicianCanRead)}</span>
          <span className="badge badge-gray">Customer read: {String(staffQualityGateResolvedStateMocks.customerCanRead)}</span>
          <span className="badge badge-gray">Super-admin override: {String(staffQualityGateResolvedStateMocks.superAdminCanOverride)}</span>
        </div>
      </section>

      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-4 xl:grid-cols-2"
      >
        {auditItems.map((auditCase) => {
          const semanticPassed = isSemanticGatePassed(auditCase.semanticResolutionScore)
          const riskPassed = isRiskGatePassed(auditCase.inspectionRiskPoints)

          return (
            <motion.article key={auditCase.id} variants={itemVariants} className="card overflow-hidden p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-orange">Reference Audit Case</p>
                  <h2 className="mt-2 text-xl font-bold text-ink-primary">{auditCase.jobOrderId}</h2>
                  <p className="mt-2 text-sm text-ink-secondary">
                    {auditCase.relatedVehicle?.owner} - {auditCase.relatedVehicle?.model}
                  </p>
                </div>
                <span className={`badge ${getAuditStatusTone(auditCase.auditStatus)}`}>{auditCase.auditStatus}</span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <GatePill label="Gate 1" passed={semanticPassed} value={auditCase.semanticResolutionScore.toFixed(2)} />
                <GatePill label="Gate 2" passed={riskPassed} value={`${auditCase.inspectionRiskPoints} pts`} />
              </div>

              <p className="mt-5 text-sm leading-6 text-ink-secondary">
                {auditCase.technicianNotes}
              </p>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-raised px-3 py-1.5 text-xs text-ink-muted">
                  <ClipboardCheck size={13} className="text-brand-orange" />
                  {auditCase.uploadedEvidence.length} evidence file{auditCase.uploadedEvidence.length > 1 ? 's' : ''}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAuditId(auditCase.id)}
                  className="btn-ghost"
                  aria-label={`View audit ${auditCase.jobOrderId}`}
                >
                  View Example
                  <ArrowRight size={14} />
                </button>
              </div>
            </motion.article>
          )
        })}
      </motion.section>

      <AuditDrawer
        auditCase={selectedAudit}
        onClose={() => setSelectedAuditId(null)}
        onApprove={() => updateAuditStatus(AUDIT_STATUS.APPROVED)}
        onOverride={() => updateAuditStatus(AUDIT_STATUS.RESOLVED)}
        canOverride={canOverrideLiveQa}
      />
    </div>
  )
}
