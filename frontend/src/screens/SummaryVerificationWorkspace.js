'use client'

import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  FilePenLine,
  MessageSquareText,
  PencilLine,
  Sparkles,
  ThumbsDown,
} from 'lucide-react'
import { SERVICE_SUMMARY_STATUS, serviceSummaries, vehicles } from '@autocare/shared'
import { useToast } from '@/components/Toast.jsx'

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

function statusTone(status) {
  if (status === SERVICE_SUMMARY_STATUS.VERIFIED) return 'badge-green'
  if (status === SERVICE_SUMMARY_STATUS.REJECTED) return 'badge-red'
  if (status === SERVICE_SUMMARY_STATUS.REVISED) return 'badge-blue'
  return 'badge-orange'
}

export default function SummaryVerificationWorkspace() {
  const { toast } = useToast()
  const draftInputRefs = useRef({})
  const [summaryItems, setSummaryItems] = useState(() =>
    serviceSummaries.map((summary) => ({
      ...summary,
      vehicleLabel: vehicles.find((vehicle) => vehicle.id === summary.vehicleId)?.plate ?? summary.vehicleId,
      isEditing: false,
    }))
  )
  const [draftEdits, setDraftEdits] = useState(() =>
    Object.fromEntries(serviceSummaries.map((summary) => [summary.id, summary.generatedLaymanSummary]))
  )

  const stats = useMemo(() => {
    const verified = summaryItems.filter((summary) => summary.verificationStatus === SERVICE_SUMMARY_STATUS.VERIFIED).length
    const pending = summaryItems.filter((summary) => summary.verificationStatus === SERVICE_SUMMARY_STATUS.DRAFT).length
    const revised = summaryItems.filter((summary) => summary.verificationStatus === SERVICE_SUMMARY_STATUS.REVISED).length
    return { verified, pending, revised }
  }, [summaryItems])

  function patchSummary(id, updater) {
    setSummaryItems((current) =>
      current.map((summary) =>
        summary.id === id ? { ...summary, ...updater(summary) } : summary
      )
    )
  }

  function handleVerify(id) {
    patchSummary(id, () => ({
      verificationStatus: SERVICE_SUMMARY_STATUS.VERIFIED,
      isEditing: false,
    }))

    toast({
      type: 'success',
      title: 'Summary Verified',
      message: `${id.toUpperCase()} is ready for the customer timeline.`,
    })
  }

  function handleReject(id) {
    patchSummary(id, () => ({
      verificationStatus: SERVICE_SUMMARY_STATUS.REJECTED,
      isEditing: false,
    }))

    toast({
      type: 'error',
      title: 'Summary Rejected',
      message: `${id.toUpperCase()} needs another rewrite before release.`,
    })
  }

  function handleEditToggle(id) {
    patchSummary(id, (summary) => ({
      isEditing: !summary.isEditing,
    }))

    setDraftEdits((current) => {
      const existing = summaryItems.find((summary) => summary.id === id)
      if (!existing) return current

      return {
        ...current,
        [id]: existing.generatedLaymanSummary,
      }
    })
  }

  function handleDraftChange(id, value) {
    setDraftEdits((current) => ({
      ...current,
      [id]: value,
    }))
  }

  function handleSaveRevision(id, nextDraft) {
    patchSummary(id, (summary) => ({
      generatedLaymanSummary: nextDraft.trim() || summary.generatedLaymanSummary,
      verificationStatus: SERVICE_SUMMARY_STATUS.REVISED,
      isEditing: false,
    }))

    toast({
      type: 'info',
      title: 'Revision Saved',
      message: `${id.toUpperCase()} now reflects the updated layman summary.`,
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
        <div className="relative">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-orange">AI Summary Control</p>
          <h1 className="mt-3 text-3xl font-bold text-ink-primary">Layman Summary Verification</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-secondary">
            Compare technician language against customer-facing explanations, tune the tone, and verify only the summaries
            that feel transparent, accurate, and easy to understand.
          </p>
        </div>
      </motion.section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm text-ink-muted">Verified</p>
          <p className="mt-3 text-3xl font-bold text-ink-primary">{stats.verified}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-ink-muted">Draft Review</p>
          <p className="mt-3 text-3xl font-bold text-ink-primary">{stats.pending}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-ink-muted">Revised</p>
          <p className="mt-3 text-3xl font-bold text-ink-primary">{stats.revised}</p>
        </div>
      </section>

      <motion.section variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
        {summaryItems.map((summary) => (
          <motion.article
            key={summary.id}
            variants={itemVariants}
            role="article"
            aria-label={`Summary ${summary.id}`}
            className="card overflow-hidden p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-orange">Summary Pair</p>
                <h2 className="mt-2 text-xl font-bold text-ink-primary">{summary.jobOrderId}</h2>
                <p className="mt-2 text-sm text-ink-secondary">{summary.vehicleLabel} · Reviewer {summary.reviewerId ?? 'Unassigned'}</p>
              </div>
              <span className={`badge ${statusTone(summary.verificationStatus)}`}>{summary.verificationStatus}</span>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <section className="rounded-3xl border border-surface-border bg-surface-raised p-5">
                <div className="flex items-center gap-2">
                  <FilePenLine size={16} className="text-brand-orange" />
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-ink-secondary">Original Technical Note</h3>
                </div>
                <p className="mt-4 text-sm leading-7 text-ink-secondary">{summary.originalTechnicalNote}</p>
              </section>

              <section className="rounded-3xl border border-surface-border bg-surface-raised p-5">
                <div className="flex items-center gap-2">
                  <MessageSquareText size={16} className="text-brand-orange" />
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-ink-secondary">Customer-Facing Summary</h3>
                </div>

                {summary.isEditing ? (
                  <div className="mt-4 space-y-4">
                    <textarea
                      aria-label={`Edit generated summary ${summary.id}`}
                      className="input min-h-[180px]"
                      ref={(node) => {
                        if (node) {
                          draftInputRefs.current[summary.id] = node
                        } else {
                          delete draftInputRefs.current[summary.id]
                        }
                      }}
                      value={draftEdits[summary.id] ?? summary.generatedLaymanSummary}
                      onChange={(event) => handleDraftChange(summary.id, event.target.value)}
                    />
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          handleSaveRevision(
                            summary.id,
                            draftInputRefs.current[summary.id]?.value ?? draftEdits[summary.id] ?? summary.generatedLaymanSummary
                          )
                        }
                        className="btn-primary"
                        aria-label={`Save revision ${summary.id}`}
                      >
                        <Sparkles size={15} />
                        Save Revision
                      </button>
                      <button type="button" onClick={() => handleEditToggle(summary.id)} className="btn-ghost">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-7 text-ink-secondary">{summary.generatedLaymanSummary}</p>
                )}
              </section>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={() => handleVerify(summary.id)} className="btn-primary" aria-label={`Verify summary ${summary.id}`}>
                <CheckCircle2 size={15} />
                Verify
              </button>
              <button type="button" onClick={() => handleReject(summary.id)} className="btn-danger" aria-label={`Reject summary ${summary.id}`}>
                <ThumbsDown size={15} />
                Reject
              </button>
              <button type="button" onClick={() => handleEditToggle(summary.id)} className="btn-ghost" aria-label={`Edit summary ${summary.id}`}>
                <PencilLine size={15} />
                Edit
              </button>
            </div>
          </motion.article>
        ))}
      </motion.section>
    </div>
  )
}
