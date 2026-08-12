import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import {
  arrivalInspectionCategoryOptions,
  getChecklistIssueDetails,
  getChecklistStatus,
  getArrivalInspectionCategoryProgress,
} from './digitalIntakeInspectionWorkspaceForm.mjs'

export function ArrivalInspectionPager({
  draft,
  arrivalPhotoUploads,
  activeCategory,
  onCategoryChange,
  onUpdateItem,
  onOpenIssue,
  onRemoveIssue,
  onMarkAllOk,
}) {
  const categoryProgress = useMemo(
    () => getArrivalInspectionCategoryProgress(draft.arrivalInspectionItems, draft.checklist),
    [draft.arrivalInspectionItems, draft.checklist],
  )
  const activeIndex = Math.max(0, arrivalInspectionCategoryOptions.findIndex((category) => category.value === activeCategory))
  const active = categoryProgress[activeIndex] ?? categoryProgress[0]
  const previous = activeIndex > 0 ? categoryProgress[activeIndex - 1] : null
  const next = activeIndex < categoryProgress.length - 1 ? categoryProgress[activeIndex + 1] : null
  const overall = categoryProgress.reduce((result, category) => ({
    checked: result.checked + category.checked,
    issues: result.issues + category.issues,
    total: result.total + category.total,
  }), { checked: 0, issues: 0, total: 0 })

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="label">Arrival condition</p>
          <p className="text-sm text-ink-muted" aria-live="polite">
            Overall {overall.checked} of {overall.total} checked · {overall.issues} issue{overall.issues === 1 ? '' : 's'} · {overall.total - overall.checked} unreviewed
          </p>
        </div>
        <button type="button" className="btn-ghost min-h-9 px-3 text-xs" onClick={onMarkAllOk}>Mark checked OK</button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {categoryProgress.map((category) => (
          <button
            key={category.value}
            type="button"
            aria-pressed={category.value === activeCategory}
            onClick={() => onCategoryChange(category.value)}
            className={`rounded-lg border px-3 py-2 text-left ${category.value === activeCategory ? 'border-brand-orange bg-brand-orange/10' : 'border-surface-border bg-surface-raised'}`}
          >
            <span className="block text-sm font-semibold text-ink-primary">{category.label}</span>
            <span className="mt-1 block text-xs text-ink-muted">{category.checked}/{category.total} checked · {category.issues} issue{category.issues === 1 ? '' : 's'}</span>
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-surface-border bg-surface-raised p-2.5" data-intake-control={`checklist-category-${active.value}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-ink-primary">{active.label}</p>
            <p className="text-xs text-ink-muted">Category {activeIndex + 1} of {categoryProgress.length}</p>
          </div>
          <span className="badge badge-gray">{active.checked}/{active.total} checked</span>
        </div>
        <div className="mt-2 grid gap-1.5">
          {active.items.map((item) => {
            const inspectionItem = draft.arrivalInspectionItems?.find((entry) => entry.key === item.value)
            const status = getChecklistStatus(inspectionItem ?? draft.checklist[item.value])
            const issueDetails = getChecklistIssueDetails(inspectionItem ?? draft.checklist[item.value])
            const issuePhoto = issueDetails.evidenceSlot ? arrivalPhotoUploads?.[issueDetails.evidenceSlot] : null

            return (
              <div key={item.value} data-intake-control={`checklist-${item.value}`} className="rounded-lg border border-surface-border bg-surface-card p-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-ink-primary">{item.label}</p>
                  <div className="booking-segmented-control w-full flex-wrap sm:w-auto">
                    <button type="button" onClick={() => onUpdateItem(item.value, 'unchecked')} aria-pressed={status === 'unchecked'} className={`booking-tab-button min-h-9 ${status === 'unchecked' ? 'booking-tab-button-active' : ''}`}>Unchecked</button>
                    <button type="button" onClick={() => onUpdateItem(item.value, 'ok')} aria-pressed={status === 'ok'} className={`booking-tab-button min-h-9 ${status === 'ok' ? 'booking-tab-button-active' : ''}`}>OK</button>
                    <button type="button" onClick={() => onOpenIssue(item)} aria-pressed={status === 'issue'} className={`booking-tab-button min-h-9 ${status === 'issue' ? 'booking-tab-button-active' : ''}`}>{status === 'issue' ? 'Edit issue' : 'Issue'}</button>
                  </div>
                </div>
                {status === 'issue' ? (
                  <div className="mt-3 rounded-lg border border-brand-orange/25 bg-brand-orange/5 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-orange">Issue · {String(issueDetails.severity || 'medium').replace(/\b\w/g, (letter) => letter.toUpperCase())} attention</p>
                        <p className="mt-1 text-sm text-ink-primary">{[issueDetails.location, issueDetails.description].filter(Boolean).join(' — ') || 'Details still need to be completed.'}</p>
                        {issuePhoto?.fileName ? <p className="mt-1 text-xs text-ink-muted">Evidence: {issuePhoto.fileName}</p> : null}
                      </div>
                      <button type="button" className="btn-ghost min-h-9 px-3 text-xs" onClick={() => onRemoveIssue(item.value)}>Remove issue</button>
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap justify-between gap-2">
        <button type="button" className="btn-ghost min-h-9" disabled={!previous} onClick={() => previous && onCategoryChange(previous.value)}><ChevronLeft size={15} aria-hidden="true" />Previous category</button>
        <button type="button" className="btn-ghost min-h-9" disabled={!next} onClick={() => next && onCategoryChange(next.value)}>Next category<ChevronRight size={15} aria-hidden="true" /></button>
      </div>
    </div>
  )
}
