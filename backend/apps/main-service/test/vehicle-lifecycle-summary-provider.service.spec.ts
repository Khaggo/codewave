import { ServiceUnavailableException } from '@nestjs/common';

import {
  AI_SUMMARY_UNAVAILABLE_CODE,
  AiSummaryConfig,
} from '@main-modules/vehicle-lifecycle/services/ai-summary-config';
import { VehicleLifecycleSummaryProviderService } from '@main-modules/vehicle-lifecycle/services/vehicle-lifecycle-summary-provider.service';

const baseConfig: AiSummaryConfig = {
  provider: 'disabled',
  baseUrl: null,
  model: null,
  apiKey: null,
  timeoutMs: 50,
  maxOutputChars: 1_200,
  maxEvidenceEvents: 50,
};

describe('VehicleLifecycleSummaryProviderService', () => {
  it('fails closed with the API error code when disabled', () => {
    const provider = new VehicleLifecycleSummaryProviderService(baseConfig);

    expect(() => provider.assertAvailable()).toThrow(ServiceUnavailableException);
    try {
      provider.assertAvailable();
    } catch (error) {
      expect((error as ServiceUnavailableException).getResponse()).toEqual({
        code: AI_SUMMARY_UNAVAILABLE_CODE,
        message: expect.stringContaining('unavailable'),
      });
    }
  });

  it('uses safe, human-readable provenance for queued evidence', () => {
    const provider = new VehicleLifecycleSummaryProviderService({
      ...baseConfig,
      provider: 'openai_compatible',
      baseUrl: 'http://summary.test/v1',
      model: 'summary-model',
    });

    const provenance = provider.buildQueuedProvenance([
      {
        eventType: 'booking_confirmed',
        eventCategory: 'administrative',
        sourceType: 'booking',
        occurredAt: new Date('2026-05-10T08:00:00.000Z'),
        dedupeKey: 'booking:internal-secret-uuid',
      },
    ]);

    expect(provenance.provider).toBe('openai_compatible');
    expect(provenance.model).toBe('summary-model');
    expect(provenance.evidenceRefs).toEqual([
      'booking:booking_confirmed:2026-05-10',
    ]);
    expect(JSON.stringify(provenance)).not.toContain('internal-secret-uuid');
  });
});
