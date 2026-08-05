import { expect, test } from '@playwright/test';

import {
  AI_SUMMARY_FAKE_MODES,
  buildSafeLifecycleEvidencePayload,
  createAiSummaryFakeProvider,
} from '../helpers/aiSummaryFakeProvider.mjs';

const providerRequest = (baseUrl, payload, { signal } = {}) =>
  fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

test.describe('AI lifecycle summary fake-provider acceptance fixtures', () => {
  for (const mode of AI_SUMMARY_FAKE_MODES) {
    test(`fake provider exposes deterministic ${mode} behavior`, async () => {
      const provider = await createAiSummaryFakeProvider({ mode });
      try {
        if (mode === 'success' || mode === 'malformed') {
          const response = await providerRequest(provider.baseUrl, { model: 'qa-model' });
          expect(response.status).toBe(200);
          const body = await response.json();
          if (mode === 'success') {
            expect(body.choices[0].message.content).toContain('workshop recorded');
          } else {
            expect(body.choices).toEqual([]);
          }
        } else if (mode === 'network') {
          await expect(providerRequest(provider.baseUrl, { model: 'qa-model' })).rejects.toThrow();
        } else {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 100);
          try {
            await expect(
              providerRequest(provider.baseUrl, { model: 'qa-model' }, { signal: controller.signal }),
            ).rejects.toMatchObject({ name: 'AbortError' });
          } finally {
            clearTimeout(timeout);
          }
        }

        expect(provider.requests).toHaveLength(1);
      } finally {
        await provider.close();
      }
    });
  }

  test('fake-provider request fixture strips internal identifiers and unrestricted notes', async () => {
    const provider = await createAiSummaryFakeProvider({ mode: 'success' });
    try {
      const payload = buildSafeLifecycleEvidencePayload({
        vehicleLabel: '2022 Toyota Vios',
        timelineEvents: [
          {
            eventType: 'job_order_completed',
            eventCategory: 'workshop',
            sourceType: 'job_order',
            occurredAt: '2026-08-01T10:00:00.000Z',
            actorUserId: 'staff-uuid-must-not-travel',
            sourceId: 'source-uuid-must-not-travel',
            dedupeKey: 'dedupe-key-must-not-travel',
            notes: 'Internal note must not travel to a provider.',
          },
        ],
      });
      const response = await providerRequest(provider.baseUrl, {
        model: 'qa-model',
        messages: [{ role: 'user', content: JSON.stringify(payload) }],
      });
      expect(response.ok).toBe(true);

      const recorded = provider.requests[0].body;
      const serialized = JSON.stringify(recorded);
      expect(serialized).not.toContain('actorUserId');
      expect(serialized).not.toContain('sourceId');
      expect(serialized).not.toContain('dedupeKey');
      expect(serialized).not.toContain('Internal note');
      expect(payload.evidence).toEqual([
        {
          eventType: 'job_order_completed',
          eventCategory: 'workshop',
          sourceType: 'job_order',
          occurredOn: '2026-08-01',
        },
      ]);
    } finally {
      await provider.close();
    }
  });

  test('review-gating fixture keeps drafts and rejected summaries invisible to customers', async () => {
    const visibility = (summary) =>
      summary?.status === 'approved' && summary?.customerVisible === true;

    expect(visibility({ status: 'queued', customerVisible: false })).toBe(false);
    expect(visibility({ status: 'pending_review', customerVisible: false })).toBe(false);
    expect(visibility({ status: 'rejected', customerVisible: false })).toBe(false);
    expect(visibility({ status: 'approved', customerVisible: true })).toBe(true);
  });
});
