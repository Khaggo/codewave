export function buildEvidenceTargetGroups({
  photoTargetOptions = [],
  workItemPhotoTargetOptions = [],
  progressPhotoTargetOptions = [],
} = {}) {
  return [
    {
      key: 'general',
      label: 'General',
      options: photoTargetOptions.filter((option) => option.group === 'general'),
    },
    {
      key: 'services',
      label: 'Services',
      options: workItemPhotoTargetOptions,
    },
    {
      key: 'progress',
      label: 'Progress logs',
      options: progressPhotoTargetOptions,
    },
  ].filter((group) => group.key === 'general' || group.options.length > 0);
}

export function buildEvidenceRecommendation({
  missingCompletedItemCount = 0,
  recommendedTarget,
  isRecommendedTargetSelected = false,
} = {}) {
  if (missingCompletedItemCount <= 0 || !recommendedTarget) {
    return null;
  }

  return {
    targetLabel: recommendedTarget.label,
    canApply: !isRecommendedTargetSelected,
    message:
      missingCompletedItemCount === 1
        ? `Attach the photo to ${recommendedTarget.label} to save this completed item.`
        : `Completed items still need work-item evidence. Start with ${recommendedTarget.label}, then upload the rest.`,
  };
}
