'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  BadgeCheck,
  ExternalLink,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'

import PageHeader from '@/components/ui/PageHeader'
import PortalLink from '@/components/PortalLink'
import ServiceLifecycleHeader from '@/components/ServiceLifecycleHeader'
import StaffWorkQueue from '@/components/StaffWorkQueue'
import { useToast } from '@/components/Toast.jsx'
import { ApiError } from '@/lib/authClient'
import {
  claimMatchesWork,
  isStaffWorkClaimError,
  toJobOrderClaimSummary,
} from '@/lib/jobOrderClaimState.mjs'
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
  getLatestQualityGateOverride,
  getQualityGateReleaseState,
  getReviewNeededQualityGateFindings,
} from '@/lib/api/generated/quality-gates/staff-web-qa-review'
import {
  buildQaVerdictCompletionState,
  getGroupedQualityFindings,
} from './qaAuditView.mjs'
import {
  createQaReviewRequestCoordinator,
  isQaReviewTargetCurrent,
} from './qaReviewRequestCoordinator.mjs'
import {
  EmptyPanelState,
  formatDateTime,
  formatLabel,
  getLoadedJobOrderReference,
  getPendingReviewGuidance,
  getReleaseCopy,
  InlineMessage,
  QualityFindingCard,
  releaseSummaryByState,
  SectionFrame,
  StatusMessage,
} from './QAAuditPresentation'

const initialQaState = {
  status: 'qa_ready',
  message: '',
}

const initialOverrideState = {
  status: 'override_ready',
  message: '',
}

const initialQaDetailState = {
  entityId: '',
  requestId: 0,
  status: 'idle',
  gate: null,
  error: '',
}

const initialVerdictState = {
  status: 'verdict_ready',
  message: '',
}

export default function QAAuditWorkspace() {
  const user = useUser()
  const { toast } = useToast()
  const role = user?.role ?? null
  const canReadLiveQa = canStaffReadQualityGate(role)
  const canRecordLiveVerdict = canStaffRecordQualityGateVerdict(role)
  const canOverrideLiveQa = canStaffOverrideQualityGate(role)
  const [jobOrderId, setJobOrderId] = useState('')
  const [qaDetailState, setQaDetailState] = useState(initialQaDetailState)
  const [jobOrderOptions, setJobOrderOptions] = useState([])
  const [activeClaim, setActiveClaim] = useState(null)
  const [queueRefreshKey, setQueueRefreshKey] = useState(0)
  const [verdictDraft, setVerdictDraft] = useState('passed')
  const [verdictNote, setVerdictNote] = useState('')
  const [overrideReason, setOverrideReason] = useState('')
  const [qaState, setQaState] = useState(initialQaState)
  const [verdictState, setVerdictState] = useState(initialVerdictState)
  const [overrideState, setOverrideState] = useState(initialOverrideState)
  const requestCoordinatorRef = useRef(null)
  if (!requestCoordinatorRef.current) {
    requestCoordinatorRef.current = createQaReviewRequestCoordinator()
  }
  const qualityGate = qaDetailState.gate

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const nextJobOrderId = new URLSearchParams(window.location.search).get('jobOrderId')
    if (nextJobOrderId) {
      requestCoordinatorRef.current.invalidate(nextJobOrderId)
      setJobOrderId(nextJobOrderId)
    }
  }, [])

  useEffect(
    () => () => {
      requestCoordinatorRef.current.dispose()
    },
    [],
  )

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
  const selectedJobOrderReference = getLoadedJobOrderReference(jobOrderId, jobOrderOptions, qualityGate)
  const selectedJobOrder = useMemo(
    () => jobOrderOptions.find((jobOrder) => jobOrder.id === (qualityGate?.jobOrderId ?? jobOrderId)) ?? null,
    [jobOrderId, jobOrderOptions, qualityGate?.jobOrderId],
  )
  const canActOnLoadedGate = isQaReviewTargetCurrent({
    detailState: qaDetailState,
    selectedEntityId: jobOrderId,
    qualityGate,
  })
  const activeClaimId = claimMatchesWork(activeClaim, 'job_order', jobOrderId)
    ? activeClaim.id
    : ''
  const canSubmitVerdict = Boolean(canRecordLiveVerdict && canActOnLoadedGate && activeClaimId)
  const canSubmitOverride = Boolean(
    canOverrideLiveQa
    && canActOnLoadedGate
    && qualityGate?.status === 'blocked',
  )
  const pendingReviewGuidance = getPendingReviewGuidance({
    qualityGate,
    blockingFindings,
    reviewNeededFindings,
    canRecordLiveVerdict: canSubmitVerdict,
  })
  const loadQualityGate = useCallback(async (requestedJobOrderId = jobOrderId) => {
    const normalizedJobOrderId = requestedJobOrderId.trim()
    if (!normalizedJobOrderId) {
      requestCoordinatorRef.current.invalidate()
      setQaDetailState(initialQaDetailState)
      setQaState({
        status: 'qa_not_found',
        message: 'Choose a job order before loading QA.',
      })
      return
    }

    if (!canReadLiveQa) {
      requestCoordinatorRef.current.invalidate(normalizedJobOrderId)
      setQaDetailState({
        ...initialQaDetailState,
        entityId: normalizedJobOrderId,
      })
      setQaState({
        status: 'qa_forbidden_role',
        message: 'This workspace is limited to QA-capable staff roles.',
      })
      return
    }

    if (!user?.accessToken) {
      requestCoordinatorRef.current.invalidate(normalizedJobOrderId)
      setQaDetailState({
        ...initialQaDetailState,
        entityId: normalizedJobOrderId,
      })
      setQaState({
        status: 'qa_failed',
        message: 'A valid staff session is required before loading QA.',
      })
      return
    }

    const requestToken = requestCoordinatorRef.current.begin(normalizedJobOrderId)
    setQaDetailState({
      entityId: requestToken.entityId,
      requestId: requestToken.requestId,
      status: 'loading',
      gate: null,
      error: '',
    })
    setVerdictDraft('passed')
    setVerdictNote('')
    setOverrideReason('')
    setVerdictState(initialVerdictState)
    setOverrideState(initialOverrideState)
    setQaState({
      status: 'qa_loading',
      message: '',
    })

    try {
      const loadedQualityGate = await getJobOrderQualityGate({
        jobOrderId: requestToken.entityId,
        accessToken: user.accessToken,
        signal: requestToken.signal,
      })

      if (!requestCoordinatorRef.current.isCurrent(requestToken)) {
        return
      }

      setQaDetailState({
        entityId: requestToken.entityId,
        requestId: requestToken.requestId,
        status: 'ready',
        gate: loadedQualityGate,
        error: '',
      })
      setVerdictDraft(loadedQualityGate.reviewerVerdict === 'blocked' ? 'blocked' : 'passed')
      setVerdictNote(loadedQualityGate.reviewerNote ?? '')
      setVerdictState(initialVerdictState)
      setOverrideState(initialOverrideState)
      setQaState({
        status: 'qa_loaded',
        message: 'Release review loaded.',
      })
    } catch (error) {
      if (error?.name === 'AbortError' || !requestCoordinatorRef.current.isCurrent(requestToken)) {
        return
      }

      let nextStatus = 'qa_failed'

      if (error instanceof ApiError && error.status === 403) {
        nextStatus = 'qa_forbidden_role'
      } else if (error instanceof ApiError && error.status === 404) {
        nextStatus = 'qa_not_found'
      } else if (error instanceof ApiError && error.status === 409) {
        nextStatus = 'qa_unavailable'
      }

      const message = error?.message || 'Review workspace could not be loaded.'
      setQaDetailState({
        entityId: requestToken.entityId,
        requestId: requestToken.requestId,
        status: 'error',
        gate: null,
        error: message,
      })
      setQaState({
        status: nextStatus,
        message,
      })
    }
  }, [canReadLiveQa, jobOrderId, user?.accessToken])

  async function handleOverrideQualityGate() {
    if (!qualityGate || !canActOnLoadedGate) {
      setOverrideState({
        status: 'override_not_found',
        message: 'Load the currently selected blocked quality gate before recording an override.',
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

    const actionToken = {
      entityId: qaDetailState.entityId,
      requestId: qaDetailState.requestId,
    }
    const targetQualityGate = qualityGate
    const targetReference = selectedJobOrderReference

    try {
      const updatedQualityGate = await overrideJobOrderQualityGate({
        jobOrderId: targetQualityGate.jobOrderId,
        reason: overrideReason.trim(),
        accessToken: user.accessToken,
      })

      if (!requestCoordinatorRef.current.isCurrent(actionToken)) {
        setQueueRefreshKey((current) => current + 1)
        return
      }

      setQaDetailState((current) => (
        current.entityId === actionToken.entityId && current.requestId === actionToken.requestId
          ? { ...current, gate: updatedQualityGate }
          : current
      ))
      setOverrideReason('')
      setOverrideState({
        status: 'override_saved',
        message: 'Override recorded.',
      })
      toast({
        type: 'success',
        title: 'QA Override Recorded',
        message: `${targetReference} now has an auditable super-admin override.`,
      })
    } catch (error) {
      if (!requestCoordinatorRef.current.isCurrent(actionToken)) {
        toast({
          type: 'error',
          title: 'QA Override Failed',
          message: `${targetReference} was not overridden. Return to that record before retrying.`,
        })
        return
      }

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
    if (!qualityGate || !canActOnLoadedGate) {
      setVerdictState({
        status: 'verdict_not_found',
        message: 'Load the currently selected pre-check review before recording a verdict.',
      })
      return
    }

    if (!canRecordLiveVerdict) {
      setVerdictState({
        status: 'verdict_forbidden_role',
        message: 'Only the service adviser or super admin can record the release verdict.',
      })
      return
    }

    if (!user?.accessToken) {
      setVerdictState({
        status: 'verdict_failed',
        message: 'A valid service-adviser or super-admin session is required before recording the verdict.',
      })
      return
    }

    if (!activeClaimId) {
      setVerdictState({
        status: 'verdict_failed',
        message: 'Claim this QA record before recording its verdict.',
      })
      return
    }

    setVerdictState({
      status: 'verdict_submitting',
      message: '',
    })

    const actionToken = {
      entityId: qaDetailState.entityId,
      requestId: qaDetailState.requestId,
    }
    const targetQualityGate = qualityGate
    const completedJobOrderReference = selectedJobOrderReference

    try {
      const updatedQualityGate = await recordJobOrderQualityGateVerdict({
        jobOrderId: targetQualityGate.jobOrderId,
        verdict: verdictDraft,
        note: verdictNote,
        accessToken: user.accessToken,
        claimId: activeClaimId,
        version: targetQualityGate.version,
      })

      const completion = buildQaVerdictCompletionState({
        verdict: updatedQualityGate.reviewerVerdict,
        reference: completedJobOrderReference,
      })
      setQueueRefreshKey((current) => current + 1)

      if (requestCoordinatorRef.current.isCurrent(actionToken)) {
        requestCoordinatorRef.current.invalidate()
        setQaDetailState(initialQaDetailState)
        setJobOrderId('')
        setActiveClaim(null)
        setVerdictDraft('passed')
        setVerdictNote('')
        setOverrideReason('')
        setVerdictState(initialVerdictState)
        setOverrideState(initialOverrideState)
        setQaState({
          status: completion.status,
          message: completion.message,
        })

        if (typeof window !== 'undefined') {
          const nextUrl = new URL(window.location.href)
          nextUrl.searchParams.delete('jobOrderId')
          window.history.replaceState({}, '', nextUrl)
        }
      }

      toast({
        type: 'success',
        title: 'QA Verdict Recorded',
        message: completion.toastMessage,
      })
    } catch (error) {
      if (!requestCoordinatorRef.current.isCurrent(actionToken)) {
        toast({
          type: 'error',
          title: 'QA Verdict Failed',
          message: `${completedJobOrderReference} was not updated. Return to that record before retrying.`,
        })
        return
      }

      let nextStatus = 'verdict_failed'

      if (isStaffWorkClaimError(error)) {
        setActiveClaim(null)
        setQueueRefreshKey((current) => current + 1)
        setVerdictState({
          status: 'verdict_failed',
          message: 'Your QA assignment changed or expired. Refresh the queue and claim the review again.',
        })
        return
      }

      if (error instanceof ApiError && error.status === 403) {
        nextStatus = 'verdict_forbidden_role'
      } else if (error instanceof ApiError && error.status === 404) {
        nextStatus = 'verdict_not_found'
      }

      setVerdictState({
        status: nextStatus,
        message: error?.message || 'QA verdict could not be recorded.',
      })
    }
  }

  useEffect(() => {
    if (!jobOrderId) {
      return
    }

    void loadQualityGate(jobOrderId)
  }, [canReadLiveQa, jobOrderId, loadQualityGate, user?.accessToken])

  const openQueueItem = useCallback((item) => {
    const nextJobOrderId = (item.jobOrderId || item.entityId || '').trim()
    if (!nextJobOrderId) return

    requestCoordinatorRef.current.invalidate(nextJobOrderId)
    setQaDetailState({
      ...initialQaDetailState,
      entityId: nextJobOrderId,
    })
    setVerdictDraft('passed')
    setVerdictNote('')
    setOverrideReason('')
    setVerdictState(initialVerdictState)
    setOverrideState(initialOverrideState)
    setActiveClaim(
      toJobOrderClaimSummary({
        claim: item.claim,
        entityId: nextJobOrderId,
        entityType: 'job_order',
      }),
    )
    setJobOrderOptions((current) => {
      const queueJobOrder = {
        id: nextJobOrderId,
        jobOrderReference: item.reference,
        status: item.status,
        plateNumber: item.plateNumber,
        vehicleDisplayName: item.vehicleName,
      }
      return current.some((jobOrder) => jobOrder.id === nextJobOrderId)
        ? current.map((jobOrder) => jobOrder.id === nextJobOrderId ? queueJobOrder : jobOrder)
        : [...current, queueJobOrder]
    })
    if (nextJobOrderId === jobOrderId) {
      void loadQualityGate(nextJobOrderId)
    } else {
      setJobOrderId(nextJobOrderId)
    }

    window.setTimeout(() => {
      document.getElementById('selected-qa-audit')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 0)
  }, [jobOrderId, loadQualityGate])

  const clearQueueSelection = useCallback(() => {
    requestCoordinatorRef.current.invalidate()
    setJobOrderId('')
    setQaDetailState(initialQaDetailState)
    setActiveClaim(null)
    setVerdictDraft('passed')
    setVerdictNote('')
    setOverrideReason('')
    setVerdictState(initialVerdictState)
    setOverrideState(initialOverrideState)
    setQaState(initialQaState)

    if (typeof window !== 'undefined') {
      const nextUrl = new URL(window.location.href)
      nextUrl.searchParams.delete('jobOrderId')
      window.history.replaceState({}, '', nextUrl)
    }
  }, [])

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

      <ServiceLifecycleHeader
        currentStep="qa"
        reference={jobOrderId ? selectedJobOrderReference : 'Select a QA record'}
        customer={selectedJobOrder?.customerDisplayName ?? selectedJobOrder?.customerName}
        vehicle={selectedJobOrder?.vehicleDisplayName ?? selectedJobOrder?.plateNumber}
        status={releaseSummary.value}
        owner="Service Adviser"
        blocker={
          blockingFindings.length > 0
            ? qualityGate?.blockingReason || `${blockingFindings.length} blocking finding${blockingFindings.length === 1 ? '' : 's'} must be resolved.`
            : null
        }
        nextAction={
          ['release_allowed', 'release_allowed_by_override'].includes(selectedReleaseState)
            ? 'Return to the selected job order and finalize the invoice-ready record.'
            : selectedReleaseState === 'release_blocked'
              ? 'Return the selected job order for correction and fresh evidence.'
              : qualityGate
                ? 'Review findings and record the release verdict.'
                : 'Choose a job order from the QA queue.'
        }
        actionLabel={
          qualityGate
            ? ['release_allowed', 'release_allowed_by_override'].includes(selectedReleaseState)
              ? 'Continue to Finalization'
              : 'Return to Job Order'
            : null
        }
        actionHref={
          qualityGate?.jobOrderId
            ? `/admin/job-orders/${encodeURIComponent(qualityGate.jobOrderId)}`
            : null
        }
      />

      <div className="space-y-5">
        <StaffWorkQueue
          queueType="qa"
          accessToken={user?.accessToken}
          title="QA Queue"
          description="Complete your current review, then take next; teammates can review other records in parallel."
          onOpenWork={openQueueItem}
          onReleaseWork={clearQueueSelection}
          selectedEntityId={jobOrderId}
          refreshKey={queueRefreshKey}
        />

        <StatusMessage state={qaState} />

        <SectionFrame
          id="selected-qa-audit"
          title="Selected Audit"
          copy="Review the loaded release decision."
          badge={<span className={releaseSummary.toneClass}>{releaseSummary.value}</span>}
        >
          {qualityGate ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="ops-panel-muted">
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Job Order</p>
                <p className="mt-2 break-all text-sm font-semibold text-ink-primary">{selectedJobOrderReference}</p>
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
              {pendingReviewGuidance ? (
                <div className={`${pendingReviewGuidance.toneClass} md:col-span-2 xl:col-span-4`}>
                  {pendingReviewGuidance.message}
                </div>
              ) : qualityGate.blockingReason ? (
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
          copy="Review validator output before the verdict."
          badge={qualityGate ? <span className="badge badge-gray">{formatLabel(qualityGate.preCheckStatus)}</span> : null}
        >
          {qualityGate ? (
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="ops-panel-muted">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Services</p>
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
          copy="Review items still waiting on QA."
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
          copy="Record the release decision and keep overrides auditable."
          badge={<span className={releaseSummary.toneClass}>{releaseSummary.value}</span>}
        >
          <div className="grid gap-5 xl:grid-cols-2">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink-primary">QA verdict</p>
                <span className={`badge ${canSubmitVerdict ? 'badge-green' : 'badge-gray'}`}>
                  {canSubmitVerdict ? 'Editable' : 'Read only'}
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
                      disabled={!canSubmitVerdict}
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
                      disabled={!canSubmitVerdict}
                      className="mt-1 w-full rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-sm text-ink-primary outline-none focus:border-[#f07c00] disabled:cursor-not-allowed disabled:opacity-60"
                      placeholder="Explain the release decision."
                    />
                  </label>
                  <InlineMessage state={verdictState} successStatus="verdict_saved" />
                  <button
                    type="button"
                    onClick={handleRecordQualityGateVerdict}
                    disabled={!canSubmitVerdict || verdictState.status === 'verdict_submitting'}
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
                <span className={`badge ${canSubmitOverride ? 'badge-blue' : 'badge-gray'}`}>
                  {canSubmitOverride ? 'Editable' : 'Locked'}
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
                  disabled={!canSubmitOverride}
                  className="mt-1 w-full rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-sm text-ink-primary outline-none focus:border-[#f07c00] disabled:cursor-not-allowed disabled:opacity-60"
                  placeholder="Explain why release can continue."
                />
              </label>
              <InlineMessage state={overrideState} successStatus="override_saved" />
              <button
                type="button"
                onClick={handleOverrideQualityGate}
                disabled={overrideState.status === 'override_submitting' || !canSubmitOverride}
                className="ops-action-danger w-full disabled:cursor-not-allowed disabled:opacity-50"
              >
                {overrideState.status === 'override_submitting' ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : canSubmitOverride ? (
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
          copy="Review audit timing and release state."
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
            <PortalLink
              href={
                qualityGate?.jobOrderId
                  ? `/admin/job-orders/${encodeURIComponent(qualityGate.jobOrderId)}`
                  : '/admin/job-orders'
              }
              className="inline-flex items-center gap-2 text-sm font-bold text-brand-orange"
            >
              {['release_allowed', 'release_allowed_by_override'].includes(selectedReleaseState)
                ? 'Continue to Finalization'
                : 'Return to Job Order'}{' '}
              <ExternalLink size={14} />
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
