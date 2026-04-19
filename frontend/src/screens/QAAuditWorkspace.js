'use client'

import { useMemo, useState } from 'react'
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
  ShieldAlert,
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
import { useUser } from '@/lib/userContext.jsx'
import { canApproveAudit } from '@/lib/roleAccess.js'

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

function getStatusTone(status) {
  if (status === AUDIT_STATUS.APPROVED) return 'badge-green'
  if (status === AUDIT_STATUS.FLAGGED) return 'badge-red'
  if (status === AUDIT_STATUS.RESOLVED) return 'badge-blue'
  return 'badge-orange'
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
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-orange">QA Case Detail</p>
                <h2 className="mt-3 text-2xl font-bold text-ink-primary">{auditCase.jobOrderId}</h2>
                <p className="mt-2 text-sm text-ink-secondary">Review both gates, validate evidence, and make the final administrative call.</p>
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
                <span className={`badge ${getStatusTone(auditCase.auditStatus)}`}>{auditCase.auditStatus}</span>
                {!canOverride ? (
                  <p className="mt-2 text-xs text-amber-300">Requires Admin or Super Admin access for override actions.</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={onApprove} className="btn-primary">
                  <CheckCircle2 size={15} />
                  Approve Case
                </button>
                <button type="button" onClick={onOverride} className="btn-danger disabled:opacity-50 disabled:cursor-not-allowed" disabled={!canOverride}>
                  <ShieldAlert size={15} />
                  Administrative Override
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
  const [auditItems, setAuditItems] = useState(() =>
    qaAuditCases.map((auditCase) => ({
      ...auditCase,
      relatedVehicle: vehicles.find((vehicle) => vehicle.id === auditCase.vehicleId),
      relatedSummary: serviceSummaries.find((summary) => summary.jobOrderId === auditCase.jobOrderId),
    }))
  )
  const [selectedAuditId, setSelectedAuditId] = useState(null)

  const selectedAudit = auditItems.find((auditCase) => auditCase.id === selectedAuditId) ?? null
  const canOverride = canApproveAudit(user?.role)

  const stats = useMemo(() => {
    const approved = auditItems.filter((auditCase) => auditCase.auditStatus === AUDIT_STATUS.APPROVED).length
    const flagged = auditItems.filter((auditCase) => auditCase.auditStatus === AUDIT_STATUS.FLAGGED).length
    const averageSemantic = auditItems.reduce((sum, auditCase) => sum + auditCase.semanticResolutionScore, 0) / auditItems.length

    return { approved, flagged, averageSemantic }
  }, [auditItems])

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
      title: nextStatus === AUDIT_STATUS.APPROVED ? 'Audit Approved' : 'Override Recorded',
      message: `${selectedAudit.jobOrderId} is now marked as ${nextStatus}.`,
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
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-orange">AI Operations</p>
            <h1 className="mt-3 text-3xl font-bold text-ink-primary">Double-Gate QA Workspace</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-secondary">
              Audit technician outputs, review semantic resolution confidence, inspect rule-based risk points, and protect
              the customer journey before a summary is released.
            </p>
          </div>
          <Link href="/admin/summaries" className="btn-primary">
            <Sparkles size={15} />
            Open Summary Review
          </Link>
        </div>
      </motion.section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard icon={BadgeCheck} label="Approved Cases" value={stats.approved} toneClass="border-emerald-500/15 bg-emerald-500/10 text-emerald-400" />
        <StatCard icon={AlertTriangle} label="Flagged Cases" value={stats.flagged} toneClass="border-red-500/15 bg-red-500/10 text-red-400" />
        <StatCard icon={BrainCircuit} label="Avg. Gate 1 Score" value={stats.averageSemantic.toFixed(2)} toneClass="border-brand-orange/15 bg-brand-orange/10 text-brand-orange" />
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
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-orange">Audit Case</p>
                  <h2 className="mt-2 text-xl font-bold text-ink-primary">{auditCase.jobOrderId}</h2>
                  <p className="mt-2 text-sm text-ink-secondary">
                    {auditCase.relatedVehicle?.owner} · {auditCase.relatedVehicle?.model}
                  </p>
                </div>
                <span className={`badge ${getStatusTone(auditCase.auditStatus)}`}>{auditCase.auditStatus}</span>
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
                  View Details
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
        canOverride={canOverride}
      />
    </div>
  )
}
