'use client'

import { FileStack, RefreshCw } from 'lucide-react'

import {
  buildEvidenceRecommendation,
  buildEvidenceTargetGroups,
} from './jobOrderEvidenceView.mjs'

export default function JobOrderEvidencePanel({
  activeJobOrder,
  role,
  photoInputResetKey,
  photoDraft,
  setPhotoDraft,
  selectedCompletedItemsMissingPhotoEvidence,
  recommendedPhotoTargetOption,
  isPhotoTargetRecommended,
  photoTargetOptions,
  workItemPhotoTargetOptions,
  progressPhotoTargetOptions,
  photoState,
  photoStateClassName,
  handleAddPhotoEvidence,
  hasMatchingJobOrderClaim,
}) {
  const targetGroups = buildEvidenceTargetGroups({
    photoTargetOptions,
    workItemPhotoTargetOptions,
    progressPhotoTargetOptions,
  })
  const recommendation = buildEvidenceRecommendation({
    missingCompletedItemCount: selectedCompletedItemsMissingPhotoEvidence.length,
    recommendedTarget: recommendedPhotoTargetOption,
    isRecommendedTargetSelected: isPhotoTargetRecommended,
  })

  return (
    <div id="job-order-stage-evidence" className="ops-panel scroll-mt-48">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="card-title">Evidence</p>
            <span className="badge badge-green">Service adviser / admin</span>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            Upload images directly from camera or desktop so QA and finalization reviewers can
            inspect stored evidence.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {role === 'super_admin' ? (
            <span className="badge badge-green">Super admin override access</span>
          ) : null}
          <span className="badge badge-gray">Evidence: technician/adviser/admin</span>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-surface-border bg-surface-card p-4">
        <p className="text-sm font-bold text-ink-primary">Photo Evidence</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-xs text-ink-muted">
            Image file
            <input
              key={`adviser-photo-${photoInputResetKey}`}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) =>
                setPhotoDraft((current) => ({
                  ...current,
                  file: event.target.files?.[0] ?? null,
                }))
              }
              className="mt-1 block w-full text-sm text-ink-primary file:mr-3 file:rounded-lg file:border-0 file:bg-surface-raised file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ink-primary"
            />
          </label>
          <label className="text-xs text-ink-muted">
            Evidence target
            {recommendation ? (
              <div className="mt-2 rounded-lg border border-brand-orange/25 bg-brand-orange/10 px-3 py-2 text-[11px] leading-5 text-amber-100">
                {recommendation.message}
                {recommendation.canApply ? (
                  <button
                    type="button"
                    onClick={() =>
                      setPhotoDraft((current) => ({
                        ...current,
                        linkedEntityType:
                          recommendedPhotoTargetOption?.linkedEntityType ??
                          current.linkedEntityType,
                        linkedEntityId:
                          recommendedPhotoTargetOption?.linkedEntityId ?? current.linkedEntityId,
                      }))
                    }
                    className="ml-2 inline-flex rounded-md border border-brand-orange/30 px-2 py-1 text-[10px] font-semibold text-amber-50 transition hover:bg-brand-orange/15"
                  >
                    Use recommended target
                  </button>
                ) : null}
              </div>
            ) : null}
            <select
              value={`${photoDraft.linkedEntityType}:${photoDraft.linkedEntityId || ''}`}
              onChange={(event) => {
                const [linkedEntityType, ...rest] = event.target.value.split(':')
                const linkedEntityId = rest.join(':')
                setPhotoDraft((current) => ({
                  ...current,
                  linkedEntityType,
                  linkedEntityId,
                }))
              }}
              className="select mt-1"
            >
              {targetGroups.map((group) => (
                <optgroup key={group.key} label={group.label}>
                  {group.options.map((option) => (
                    <option
                      key={option.key}
                      value={`${option.linkedEntityType}:${option.linkedEntityId || ''}`}
                    >
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <span className="mt-1 block text-[11px] text-ink-muted">
              Choose the matching <span className="font-semibold">service</span> for completion
              proof. Use <span className="font-semibold">General</span> only for visit-wide photos.
            </span>
          </label>
          <label className="text-xs text-ink-muted md:col-span-2">
            Selected file
            <input
              value={photoDraft.file?.name ?? ''}
              readOnly
              className="input mt-1"
              placeholder="No image selected yet"
            />
          </label>
          <label className="text-xs text-ink-muted md:col-span-2">
            Caption
            <textarea
              value={photoDraft.caption}
              onChange={(event) =>
                setPhotoDraft((current) => ({
                  ...current,
                  caption: event.target.value,
                }))
              }
              rows={3}
              className="textarea mt-1"
              placeholder="What this image proves for the next reviewer."
            />
          </label>
        </div>
        {photoState.message ? (
          <div className={`mt-3 ${photoStateClassName}`}>{photoState.message}</div>
        ) : null}
        <button
          onClick={handleAddPhotoEvidence}
          disabled={
            !activeJobOrder ||
            !hasMatchingJobOrderClaim ||
            photoState.status === 'photo_submitting'
          }
          className="ops-action-primary mt-3"
        >
          {photoState.status === 'photo_submitting' ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <FileStack size={14} />
          )}
          Upload Photo Evidence - workshop
        </button>
      </div>
    </div>
  )
}
