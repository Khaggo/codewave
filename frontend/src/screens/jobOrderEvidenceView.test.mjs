import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildEvidenceRecommendation,
  buildEvidenceTargetGroups,
} from './jobOrderEvidenceView.mjs';

test('evidence target groups keep general, service, and progress choices separate', () => {
  const groups = buildEvidenceTargetGroups({
    photoTargetOptions: [
      { key: 'general-job', group: 'general' },
      { key: 'service-copy', group: 'service' },
    ],
    workItemPhotoTargetOptions: [{ key: 'service-a' }],
    progressPhotoTargetOptions: [{ key: 'progress-a' }],
  });

  assert.deepEqual(
    groups.map((group) => ({
      key: group.key,
      optionKeys: group.options.map((option) => option.key),
    })),
    [
      { key: 'general', optionKeys: ['general-job'] },
      { key: 'services', optionKeys: ['service-a'] },
      { key: 'progress', optionKeys: ['progress-a'] },
    ],
  );
});

test('evidence target groups omit empty optional groups', () => {
  assert.deepEqual(
    buildEvidenceTargetGroups({
      photoTargetOptions: [{ key: 'general-job', group: 'general' }],
    }).map((group) => group.key),
    ['general'],
  );
});

test('evidence recommendation identifies when the suggested target can be applied', () => {
  assert.deepEqual(
    buildEvidenceRecommendation({
      missingCompletedItemCount: 2,
      recommendedTarget: { label: 'Brake inspection' },
      isRecommendedTargetSelected: false,
    }),
    {
      targetLabel: 'Brake inspection',
      canApply: true,
      message:
        'Completed items still need work-item evidence. Start with Brake inspection, then upload the rest.',
    },
  );
  assert.equal(buildEvidenceRecommendation(), null);
});
