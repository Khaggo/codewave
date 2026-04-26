'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Link2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Wrench,
} from 'lucide-react'

import { ApiError } from '@/lib/authClient'
import {
  createBackJobCase,
  createReworkJobOrderFromBackJob,
  getBackJobById,
  listBackJobsByVehicle,
  updateBackJobStatus,
} from '@/lib/backJobsClient'
import { useUser } from '@/lib/userContext'
import {
  backJobReviewContractSources,
  backJobStatusLabels,
  canCreateReworkJobOrder,
  canStaffManageBackJobs,
  getAllowedBackJobStatusTargets,
  getBackJobCustomerVisibility,
  getBackJobValidationState,
  isBackJobCustomerSafe,
} from '@/lib/api/generated/back-jobs/staff-web-back-jobs'

const STATUS_META = {
  reported: { label: 'Reported', cls: 'badge-red' },
  inspected: { label: 'Inspected', cls: 'badge-orange' },
  approved_for_rework: { label: 'Approved For Rework', cls: 'badge-blue' },
  in_progress: { label: 'In Progress', cls: 'badge-orange' },
  resolved: { label: 'Resolved', cls: 'badge-green' },
  closed: { label: 'Closed', cls: 'badge-gray' },
  rejected: { label: 'Rejected', cls: 'badge-red' },
}

const SEVERITY_META = {
  info: { label: 'Info', cls: 'badge-gray' },
  low: { label: 'Low', cls: 'badge-gray' },
  medium: { label: 'Medium', cls: 'badge-orange' },
  high: { label: 'High', cls: 'badge-red' },
}

const visibilityCopy = {
  staff_only_review: 'Staff-only review',
  customer_safe_rework: 'Customer-safe rework',
  customer_safe_outcome: 'Customer-safe outcome',
}

const initialLoadState = {
  status: 'back_jobs_ready',
  message: '',
}

const initialCreateState = {
  status: 'create_ready',
  message: '',
}

const initialStatusState = {
  status: 'status_ready',
  message: '',
}

const initialReworkState = {
  status: 'rework_ready',
  message: '',
}

const splitCommaSeparatedIds = (value) =>
  String(value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

const formatDateTime = (value) => {
  if (!value) return 'Not recorded'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleString()
}

const upsertBackJob = (items, backJob) => {
  if (!backJob) return items
  const exists = items.some((item) => item.id === backJob.id)
  return exists
    ? items.map((item) => (item.id === backJob.id ? backJob : item))
    : [backJob, ...items]
}

function StatCard({ icon: Icon, label, value, toneClass }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`p-2 rounded-xl border ${toneClass}`}>
        <Icon size={17} />
      </div>
      <div>
        <p className="text-xl font-extrabold text-ink-primary">{value}</p>
        <p className="text-xs text-ink-muted">{label}</p>
      </div>
    </div>
  )
}

function BackJobDetail({ backJob }) {
  if (!backJob) {
    return (
      <div className="card p-5 text-sm text-ink-muted">
        Load a vehicle list, create a case, or search by back-job id to inspect live detail.
      </div>
    )
  }

  const statusMeta = STATUS_META[backJob.status] ?? STATUS_META.reported
  const visibility = getBackJobCustomerVisibility(backJob.status)
  const validationState = getBackJobValidationState(backJob)

  return (
    <div className="card p-5 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-orange">Live Back-Job Detail</p>
          <h2 className="mt-2 text-xl font-bold text-ink-primary">{backJob.id}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-secondary">{backJob.complaint}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`badge ${statusMeta.cls}`}>{statusMeta.label}</span>
          <span className={`badge ${isBackJobCustomerSafe(backJob.status) ? 'badge-green' : 'badge-gray'}`}>
            {visibilityCopy[visibility]}
          </span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-surface-border bg-surface-raised p-3">
          <p className="text-xs text-ink-muted">Customer / Vehicle</p>
          <p className="mt-1 text-sm font-semibold text-ink-primary">{backJob.customerUserId}</p>
          <p className="mt-1 text-xs text-ink-secondary">{backJob.vehicleId}</p>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-raised p-3">
          <p className="text-xs text-ink-muted">Original Work</p>
          <p className="mt-1 text-sm font-semibold text-ink-primary">{backJob.originalJobOrderId}</p>
          <p className="mt-1 text-xs text-ink-secondary">{backJob.originalBookingId ?? 'No booking reference'}</p>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-raised p-3">
          <p className="text-xs text-ink-muted">Rework Linkage</p>
          <p className="mt-1 text-sm font-semibold text-ink-primary">{backJob.reworkJobOrderId ?? 'Not linked yet'}</p>
          <p className="mt-1 text-xs text-ink-secondary">Validation: {validationState.replaceAll('_', ' ')}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-surface-border bg-surface-raised p-4">
          <p className="text-sm font-bold text-ink-primary">Review Notes</p>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">{backJob.reviewNotes || 'No review notes recorded.'}</p>
          <p className="mt-3 text-xs text-ink-muted">Return inspection: {backJob.returnInspectionId ?? 'not attached'}</p>
        </section>
        <section className="rounded-xl border border-surface-border bg-surface-raised p-4">
          <p className="text-sm font-bold text-ink-primary">Resolution Notes</p>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">{backJob.resolutionNotes || 'No resolution notes recorded.'}</p>
          <p className="mt-3 text-xs text-ink-muted">Updated {formatDateTime(backJob.updatedAt)}</p>
        </section>
      </div>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-ink-primary">Findings</p>
          <span className="badge badge-gray">{backJob.validatedFindingCount ?? 0} validated</span>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {backJob.findings?.length ? (
            backJob.findings.map((finding) => {
              const severityMeta = SEVERITY_META[finding.severity] ?? SEVERITY_META.info
              return (
                <article key={finding.id} className="rounded-xl border border-surface-border bg-surface-raised p-4">
                  <div className="flex flex-wrap gap-2">
                    <span className={`badge ${severityMeta.cls}`}>{severityMeta.label}</span>
                    <span className={`badge ${finding.isValidated ? 'badge-green' : 'badge-gray'}`}>
                      {finding.isValidated ? 'Validated' : 'Unvalidated'}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-ink-primary">{finding.label}</p>
                  <p className="mt-1 text-xs text-ink-muted">{finding.category}</p>
                  <p className="mt-2 text-sm leading-6 text-ink-secondary">{finding.notes || 'No finding notes.'}</p>
                </article>
              )
            })
          ) : (
            <div className="rounded-xl border border-surface-border bg-surface-raised p-4 text-sm text-ink-muted">
              No findings attached yet. Inspection/rework approval will require case or return-inspection evidence.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default function BackJobsContent() {
  const user = useUser()
  const role = user?.role ?? null
  const canManage = canStaffManageBackJobs(role)
  const [vehicleId, setVehicleId] = useState('')
  const [backJobId, setBackJobId] = useState('')
  const [backJobs, setBackJobs] = useState([])
  const [activeBackJob, setActiveBackJob] = useState(null)
  const [loadState, setLoadState] = useState(initialLoadState)
  const [createState, setCreateState] = useState(initialCreateState)
  const [statusState, setStatusState] = useState(initialStatusState)
  const [reworkState, setReworkState] = useState(initialReworkState)
  const [createDraft, setCreateDraft] = useState({
    customerUserId: '',
    vehicleId: '',
    originalJobOrderId: '',
    originalBookingId: '',
    returnInspectionId: '',
    complaint: '',
    reviewNotes: '',
    findingCategory: 'return_inspection',
    findingLabel: '',
    findingSeverity: 'medium',
    findingNotes: '',
    findingValidated: true,
  })
  const [statusDraft, setStatusDraft] = useState({
    status: 'inspected',
    returnInspectionId: '',
    reviewNotes: '',
    resolutionNotes: '',
  })
  const [reworkDraft, setReworkDraft] = useState({
    itemName: 'Warranty rework',
    itemDescription: '',
    estimatedHours: '1',
    notes: '',
    assignedTechnicianIdsText: '',
  })

  const counts = useMemo(() => {
    const source = activeBackJob ? upsertBackJob(backJobs, activeBackJob) : backJobs
    return {
      total: source.length,
      reported: source.filter((item) => item.status === 'reported').length,
      approved: source.filter((item) => item.status === 'approved_for_rework').length,
      unresolved: source.filter((item) => !['resolved', 'closed', 'rejected'].includes(item.status)).length,
    }
  }, [activeBackJob, backJobs])

  const allowedStatusTargets = getAllowedBackJobStatusTargets(activeBackJob?.status)
  const canSubmitRework = canCreateReworkJobOrder(activeBackJob)

  function requireStaffSession(stateSetter, failedStatus, message) {
    if (!canManage) {
      stateSetter({
        status: failedStatus,
        message: 'Only service advisers and super admins can manage back-job review and rework.',
      })
      return false
    }

    if (!user?.accessToken) {
      stateSetter({
        status: failedStatus,
        message,
      })
      return false
    }

    return true
  }

  function syncActiveBackJob(backJob) {
    setActiveBackJob(backJob)
    setBackJobs((current) => upsertBackJob(current, backJob))
    setBackJobId(backJob?.id ?? '')
    if (backJob?.returnInspectionId) {
      setStatusDraft((current) => ({
        ...current,
        returnInspectionId: backJob.returnInspectionId,
      }))
    }
  }

  async function handleLoadVehicleBackJobs() {
    if (!requireStaffSession(setLoadState, 'back_jobs_forbidden_role', 'A valid staff session is required before loading back-jobs.')) {
      return
    }

    setLoadState({ status: 'back_jobs_loading', message: '' })

    try {
      const loadedBackJobs = await listBackJobsByVehicle({
        vehicleId,
        accessToken: user.accessToken,
      })
      setBackJobs(loadedBackJobs)
      if (loadedBackJobs.length > 0) {
        syncActiveBackJob(loadedBackJobs[0])
      }
      setLoadState({
        status: loadedBackJobs.length > 0 ? 'back_jobs_loaded' : 'back_jobs_empty',
        message: loadedBackJobs.length > 0
          ? `Loaded ${loadedBackJobs.length} back-job case(s) for the vehicle.`
          : 'No back-job cases were found for this vehicle.',
      })
    } catch (error) {
      let nextStatus = 'back_jobs_failed'
      if (error instanceof ApiError && error.status === 403) nextStatus = 'back_jobs_forbidden_role'
      if (error instanceof ApiError && error.status === 404) nextStatus = 'back_jobs_not_found'
      setLoadState({
        status: nextStatus,
        message: error?.message || 'Vehicle back-jobs could not be loaded.',
      })
    }
  }

  async function handleLoadBackJobDetail() {
    if (!requireStaffSession(setLoadState, 'back_jobs_forbidden_role', 'A valid staff session is required before loading back-job detail.')) {
      return
    }

    setLoadState({ status: 'back_jobs_loading', message: '' })

    try {
      const loadedBackJob = await getBackJobById({
        backJobId,
        accessToken: user.accessToken,
      })
      syncActiveBackJob(loadedBackJob)
      setLoadState({
        status: 'back_jobs_loaded',
        message: 'Back-job detail loaded from the backend.',
      })
    } catch (error) {
      let nextStatus = 'back_jobs_failed'
      if (error instanceof ApiError && error.status === 403) nextStatus = 'back_jobs_forbidden_role'
      if (error instanceof ApiError && error.status === 404) nextStatus = 'back_jobs_not_found'
      setLoadState({
        status: nextStatus,
        message: error?.message || 'Back-job detail could not be loaded.',
      })
    }
  }

  async function handleCreateBackJob(event) {
    event.preventDefault()
    if (!requireStaffSession(setCreateState, 'create_forbidden_role', 'A valid staff session is required before creating a back-job.')) {
      return
    }

    setCreateState({ status: 'create_submitting', message: '' })

    try {
      const finding =
        createDraft.findingLabel.trim()
          ? [{
              category: createDraft.findingCategory,
              label: createDraft.findingLabel,
              severity: createDraft.findingSeverity,
              notes: createDraft.findingNotes,
              isValidated: createDraft.findingValidated,
            }]
          : []
      const createdBackJob = await createBackJobCase({
        ...createDraft,
        findings: finding,
        accessToken: user.accessToken,
      })
      syncActiveBackJob(createdBackJob)
      setCreateState({
        status: 'create_saved',
        message: 'Back-job case created and linked to original work.',
      })
    } catch (error) {
      let nextStatus = 'create_failed'
      if (error instanceof ApiError && error.status === 403) nextStatus = 'create_forbidden_role'
      if (error instanceof ApiError && error.status === 409) nextStatus = 'create_lineage_conflict'
      setCreateState({
        status: nextStatus,
        message: error?.message || 'Back-job case could not be created.',
      })
    }
  }

  async function handleUpdateStatus() {
    if (!activeBackJob) {
      setStatusState({
        status: 'status_failed',
        message: 'Load a back-job before updating review status.',
      })
      return
    }

    if (!requireStaffSession(setStatusState, 'status_forbidden_role', 'A valid staff session is required before updating status.')) {
      return
    }

    const nextStatus = allowedStatusTargets.includes(statusDraft.status)
      ? statusDraft.status
      : allowedStatusTargets[0]

    if (!nextStatus) {
      setStatusState({
        status: 'status_invalid_transition',
        message: 'This back-job has no further allowed status transitions.',
      })
      return
    }

    setStatusState({ status: 'status_submitting', message: '' })

    try {
      const updatedBackJob = await updateBackJobStatus({
        backJobId: activeBackJob.id,
        status: nextStatus,
        returnInspectionId: statusDraft.returnInspectionId,
        reviewNotes: statusDraft.reviewNotes,
        resolutionNotes: statusDraft.resolutionNotes,
        accessToken: user.accessToken,
      })
      syncActiveBackJob(updatedBackJob)
      setStatusState({
        status: 'status_saved',
        message: 'Back-job review status updated from the live backend.',
      })
    } catch (error) {
      let nextState = 'status_failed'
      const message = String(error?.message ?? '').toLowerCase()
      if (error instanceof ApiError && error.status === 403) nextState = 'status_forbidden_role'
      if (error instanceof ApiError && error.status === 409) {
        nextState = message.includes('inspection') || message.includes('evidence')
          ? 'status_evidence_required'
          : 'status_invalid_transition'
      }
      setStatusState({
        status: nextState,
        message: error?.message || 'Back-job status could not be updated.',
      })
    }
  }

  async function handleCreateReworkJobOrder() {
    if (!activeBackJob) {
      setReworkState({
        status: 'rework_failed',
        message: 'Load a back-job before creating rework.',
      })
      return
    }

    if (!requireStaffSession(setReworkState, 'rework_failed', 'A valid staff session is required before creating rework.')) {
      return
    }

    if (activeBackJob.reworkJobOrderId) {
      setReworkState({
        status: 'rework_already_linked',
        message: 'This back-job already has a linked rework job order.',
      })
      return
    }

    if (activeBackJob.status !== 'approved_for_rework') {
      setReworkState({
        status: 'rework_not_approved',
        message: 'Approve the back-job for rework before creating a rework job order.',
      })
      return
    }

    if (!user?.id || !user?.staffCode) {
      setReworkState({
        status: 'rework_failed',
        message: 'A staff id and staff code are required to snapshot the service adviser.',
      })
      return
    }

    setReworkState({ status: 'rework_submitting', message: '' })

    try {
      const createdJobOrder = await createReworkJobOrderFromBackJob({
        backJob: activeBackJob,
        serviceAdviserUserId: user.id,
        serviceAdviserCode: user.staffCode,
        notes: reworkDraft.notes,
        items: [{
          name: reworkDraft.itemName,
          description: reworkDraft.itemDescription,
          estimatedHours: reworkDraft.estimatedHours,
        }],
        assignedTechnicianIds: splitCommaSeparatedIds(reworkDraft.assignedTechnicianIdsText),
        accessToken: user.accessToken,
      })
      const refreshedBackJob = await getBackJobById({
        backJobId: activeBackJob.id,
        accessToken: user.accessToken,
      })
      syncActiveBackJob(refreshedBackJob)
      setReworkState({
        status: 'rework_saved',
        message: `Rework job order ${createdJobOrder?.id ?? 'created'} linked to this back-job.`,
      })
    } catch (error) {
      let nextState = 'rework_failed'
      const message = String(error?.message ?? '').toLowerCase()
      if (error instanceof ApiError && error.status === 409) {
        nextState = message.includes('already') ? 'rework_already_linked' : 'rework_not_approved'
      }
      setReworkState({
        status: nextState,
        message: error?.message || 'Rework job order could not be created.',
      })
    }
  }

  if (!canManage) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck size={20} className="text-red-400" />
          <div>
            <p className="text-lg font-bold text-ink-primary">Back-job review is staff-restricted</p>
            <p className="mt-1 text-sm text-ink-secondary">
              Only service advisers and super admins can open, review, and resolve back-job cases.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <section className="card relative overflow-hidden p-5 md:p-6">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-72 bg-gradient-to-l from-brand-orange/10 to-transparent" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-orange">Live Back-Jobs</p>
            <h1 className="mt-3 text-3xl font-bold text-ink-primary">Review And Rework Workbench</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-secondary">
              Create return cases, validate inspection-backed findings, update review status, and create linked rework job orders without leaking staff-only review state to customer surfaces.
            </p>
          </div>
          <span className="badge badge-gray">{backJobReviewContractSources.length} source contracts</span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={ClipboardList} label="Loaded Cases" value={counts.total} toneClass="border-surface-border bg-surface-raised text-brand-orange" />
        <StatCard icon={AlertTriangle} label="Reported" value={counts.reported} toneClass="border-red-500/15 bg-red-500/10 text-red-400" />
        <StatCard icon={Wrench} label="Approved" value={counts.approved} toneClass="border-blue-500/15 bg-blue-500/10 text-blue-300" />
        <StatCard icon={CheckCircle2} label="Unresolved" value={counts.unresolved} toneClass="border-emerald-500/15 bg-emerald-500/10 text-emerald-400" />
      </section>

      <section className="card p-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <form
            className="rounded-2xl border border-surface-border bg-surface-raised p-4"
            onSubmit={(event) => {
              event.preventDefault()
              handleLoadVehicleBackJobs()
            }}
          >
            <p className="text-sm font-bold text-ink-primary">Load Vehicle Back-Jobs</p>
            <p className="mt-1 text-xs text-ink-muted">Enter a vehicle id to review the return cases tied to that vehicle.</p>
            <label className="mt-3 block text-xs text-ink-muted">
              Vehicle id
              <input
                value={vehicleId}
                onChange={(event) => setVehicleId(event.target.value)}
                className="mt-1 w-full rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                placeholder="Vehicle UUID"
              />
            </label>
            <button type="submit" className="btn-primary mt-3" disabled={loadState.status === 'back_jobs_loading'}>
              {loadState.status === 'back_jobs_loading' ? <RefreshCw size={15} className="animate-spin" /> : <Search size={15} />}
              Load Vehicle Cases
            </button>
          </form>

          <form
            className="rounded-2xl border border-surface-border bg-surface-raised p-4"
            onSubmit={(event) => {
              event.preventDefault()
              handleLoadBackJobDetail()
            }}
          >
            <p className="text-sm font-bold text-ink-primary">Load Case Detail</p>
            <p className="mt-1 text-xs text-ink-muted">Enter a case id when staff need to review one specific back-job.</p>
            <label className="mt-3 block text-xs text-ink-muted">
              Back-job id
              <input
                value={backJobId}
                onChange={(event) => setBackJobId(event.target.value)}
                className="mt-1 w-full rounded-xl border border-surface-border bg-surface-card px-4 py-3 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                placeholder="Back-job UUID"
              />
            </label>
            <button type="submit" className="btn-primary mt-3" disabled={loadState.status === 'back_jobs_loading'}>
              {loadState.status === 'back_jobs_loading' ? <RefreshCw size={15} className="animate-spin" /> : <Search size={15} />}
              Load Case Detail
            </button>
          </form>
        </div>

        {loadState.message ? (
          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
              ['back_jobs_loaded', 'back_jobs_empty'].includes(loadState.status)
                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                : 'border-red-500/25 bg-red-500/10 text-red-200'
            }`}
          >
            {loadState.message}
          </div>
        ) : null}
      </section>

      {backJobs.length > 0 ? (
        <section className="card overflow-hidden">
          <div className="border-b border-surface-border bg-surface-raised px-5 py-4">
            <p className="text-sm font-bold text-ink-primary">Loaded Vehicle Cases</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-surface-border text-left text-xs text-ink-muted">
                  <th className="px-5 py-3 font-semibold">Back-Job</th>
                  <th className="px-5 py-3 font-semibold">Original Job</th>
                  <th className="px-5 py-3 font-semibold">Complaint</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Visibility</th>
                  <th className="px-5 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {backJobs.map((backJob) => {
                  const statusMeta = STATUS_META[backJob.status] ?? STATUS_META.reported
                  const visibility = getBackJobCustomerVisibility(backJob.status)
                  return (
                    <tr key={backJob.id} className="transition-colors hover:bg-surface-hover">
                      <td className="px-5 py-3 font-mono text-xs text-brand-orange">{backJob.id}</td>
                      <td className="px-5 py-3 font-mono text-xs text-ink-secondary">{backJob.originalJobOrderId}</td>
                      <td className="px-5 py-3 text-ink-secondary">
                        <p className="max-w-[260px] truncate">{backJob.complaint}</p>
                      </td>
                      <td className="px-5 py-3"><span className={`badge ${statusMeta.cls}`}>{statusMeta.label}</span></td>
                      <td className="px-5 py-3"><span className="badge badge-gray">{visibilityCopy[visibility]}</span></td>
                      <td className="px-5 py-3">
                        <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => syncActiveBackJob(backJob)}>
                          Review
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <BackJobDetail backJob={activeBackJob} />

      <section className="grid gap-5 xl:grid-cols-2">
        <form onSubmit={handleCreateBackJob} className="card p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="card-title">Create Back-Job Case</p>
              <p className="mt-1 text-xs text-ink-muted">Create an internal return case after staff verifies the customer complaint.</p>
            </div>
            <Plus size={18} className="text-brand-orange" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ['customerUserId', 'Customer user id'],
              ['vehicleId', 'Vehicle id'],
              ['originalJobOrderId', 'Original finalized job order id'],
              ['originalBookingId', 'Original booking id (optional)'],
              ['returnInspectionId', 'Return inspection id (optional)'],
            ].map(([key, label]) => (
              <label key={key} className="text-xs text-ink-muted">
                {label}
                <input
                  value={createDraft[key]}
                  onChange={(event) => setCreateDraft((current) => ({ ...current, [key]: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                />
              </label>
            ))}
          </div>
          <label className="block text-xs text-ink-muted">
            Complaint
            <textarea
              value={createDraft.complaint}
              onChange={(event) => setCreateDraft((current) => ({ ...current, complaint: event.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
              placeholder="Customer reports the same concern after prior completed work."
            />
          </label>
          <label className="block text-xs text-ink-muted">
            Review notes
            <textarea
              value={createDraft.reviewNotes}
              onChange={(event) => setCreateDraft((current) => ({ ...current, reviewNotes: event.target.value }))}
              rows={2}
              className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
            />
          </label>
          <div className="rounded-xl border border-surface-border bg-surface-raised p-3">
            <p className="text-sm font-semibold text-ink-primary">Optional Finding</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="text-xs text-ink-muted">
                Category
                <input value={createDraft.findingCategory} onChange={(event) => setCreateDraft((current) => ({ ...current, findingCategory: event.target.value }))} className="mt-1 w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]" />
              </label>
              <label className="text-xs text-ink-muted">
                Severity
                <select value={createDraft.findingSeverity} onChange={(event) => setCreateDraft((current) => ({ ...current, findingSeverity: event.target.value }))} className="mt-1 w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]">
                  {Object.keys(SEVERITY_META).map((severity) => <option key={severity} value={severity}>{SEVERITY_META[severity].label}</option>)}
                </select>
              </label>
              <label className="text-xs text-ink-muted md:col-span-2">
                Label
                <input value={createDraft.findingLabel} onChange={(event) => setCreateDraft((current) => ({ ...current, findingLabel: event.target.value }))} className="mt-1 w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]" />
              </label>
              <label className="text-xs text-ink-muted md:col-span-2">
                Notes
                <textarea value={createDraft.findingNotes} onChange={(event) => setCreateDraft((current) => ({ ...current, findingNotes: event.target.value }))} rows={2} className="mt-1 w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]" />
              </label>
            </div>
          </div>
          {createState.message ? (
            <div className={`rounded-xl border px-4 py-3 text-sm ${createState.status === 'create_saved' ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200' : 'border-red-500/25 bg-red-500/10 text-red-200'}`}>
              {createState.message}
            </div>
          ) : null}
          <button type="submit" className="btn-primary" disabled={createState.status === 'create_submitting'}>
            {createState.status === 'create_submitting' ? <RefreshCw size={15} className="animate-spin" /> : <Plus size={15} />}
            Create Back-Job
          </button>
        </form>

        <div className="space-y-5">
          <section className="card p-5 space-y-4">
            <div>
              <p className="card-title">Review Status Update</p>
              <p className="mt-1 text-xs text-ink-muted">Move the selected case through review, approval, or closure.</p>
            </div>
            <label className="block text-xs text-ink-muted">
              Next status
              <select
                value={allowedStatusTargets.includes(statusDraft.status) ? statusDraft.status : (allowedStatusTargets[0] ?? '')}
                onChange={(event) => setStatusDraft((current) => ({ ...current, status: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]"
                disabled={!allowedStatusTargets.length}
              >
                {allowedStatusTargets.length ? allowedStatusTargets.map((status) => (
                  <option key={status} value={status}>{backJobStatusLabels[status]}</option>
                )) : <option value="">No transitions available</option>}
              </select>
            </label>
            <label className="block text-xs text-ink-muted">
              Return inspection id
              <input value={statusDraft.returnInspectionId} onChange={(event) => setStatusDraft((current) => ({ ...current, returnInspectionId: event.target.value }))} className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]" />
            </label>
            <label className="block text-xs text-ink-muted">
              Review notes
              <textarea value={statusDraft.reviewNotes} onChange={(event) => setStatusDraft((current) => ({ ...current, reviewNotes: event.target.value }))} rows={2} className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]" />
            </label>
            <label className="block text-xs text-ink-muted">
              Resolution notes
              <textarea value={statusDraft.resolutionNotes} onChange={(event) => setStatusDraft((current) => ({ ...current, resolutionNotes: event.target.value }))} rows={2} className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]" />
            </label>
            {statusState.message ? (
              <div className={`rounded-xl border px-4 py-3 text-sm ${statusState.status === 'status_saved' ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200' : 'border-red-500/25 bg-red-500/10 text-red-200'}`}>
                {statusState.message}
              </div>
            ) : null}
            <button type="button" className="btn-primary" disabled={!activeBackJob || !allowedStatusTargets.length || statusState.status === 'status_submitting'} onClick={handleUpdateStatus}>
              {statusState.status === 'status_submitting' ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              Save Review Status
            </button>
          </section>

          <section className="card p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="card-title">Create Linked Rework Job Order</p>
                <p className="mt-1 text-xs text-ink-muted">Create a linked workshop order after the back-job is approved for rework.</p>
              </div>
              <Link2 size={18} className="text-brand-orange" />
            </div>
            <label className="block text-xs text-ink-muted">
              Work item name
              <input value={reworkDraft.itemName} onChange={(event) => setReworkDraft((current) => ({ ...current, itemName: event.target.value }))} className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]" />
            </label>
            <label className="block text-xs text-ink-muted">
              Work item description
              <textarea value={reworkDraft.itemDescription} onChange={(event) => setReworkDraft((current) => ({ ...current, itemDescription: event.target.value }))} rows={2} className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]" />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs text-ink-muted">
                Estimated hours
                <input type="number" min="1" step="1" value={reworkDraft.estimatedHours} onChange={(event) => setReworkDraft((current) => ({ ...current, estimatedHours: event.target.value }))} className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]" />
              </label>
              <label className="text-xs text-ink-muted">
                Technician ids
                <input value={reworkDraft.assignedTechnicianIdsText} onChange={(event) => setReworkDraft((current) => ({ ...current, assignedTechnicianIdsText: event.target.value }))} className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]" placeholder="Comma-separated UUIDs" />
              </label>
            </div>
            <label className="block text-xs text-ink-muted">
              Rework notes
              <textarea value={reworkDraft.notes} onChange={(event) => setReworkDraft((current) => ({ ...current, notes: event.target.value }))} rows={2} className="mt-1 w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink-primary outline-none focus:border-[#f07c00]" />
            </label>
            {!canSubmitRework ? (
              <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
                Rework job creation unlocks only when the selected back-job is approved for rework and has no linked rework job order.
              </p>
            ) : null}
            {reworkState.message ? (
              <div className={`rounded-xl border px-4 py-3 text-sm ${reworkState.status === 'rework_saved' ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200' : 'border-red-500/25 bg-red-500/10 text-red-200'}`}>
                {reworkState.message}
              </div>
            ) : null}
            <button type="button" className="btn-primary" disabled={!canSubmitRework || reworkState.status === 'rework_submitting'} onClick={handleCreateReworkJobOrder}>
              {reworkState.status === 'rework_submitting' ? <RefreshCw size={15} className="animate-spin" /> : <Wrench size={15} />}
              Create Rework Job Order
            </button>
          </section>
        </div>
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="card-title">Live Back-Job Boundaries</p>
            <p className="mt-1 max-w-3xl text-sm text-ink-secondary">
              This page only shows cases staff intentionally load by vehicle or case id. Customer-facing back-job lists remain planned work.
            </p>
          </div>
          <span className="badge badge-gray">No placeholder cases</span>
        </div>
      </section>
    </div>
  )
}
