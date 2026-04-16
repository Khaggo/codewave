import { createLifecycleEvent, isLifecycleEventEnvelope, lifecycleEventRegistry } from './contracts/lifecycle-events';

describe('lifecycle event contracts', () => {
  it('builds stable lifecycle envelopes for job-order, QA, and summary-review facts', () => {
    const blockedEvent = createLifecycleEvent('quality_gate.blocked', {
      qualityGateId: 'quality-gate-1',
      jobOrderId: 'job-order-1',
      vehicleId: 'vehicle-1',
      riskScore: 75,
      blockingReason: 'Verified release finding remains unresolved.',
    });

    const reviewedSummaryEvent = createLifecycleEvent('vehicle.lifecycle_summary_reviewed', {
      vehicleId: 'vehicle-1',
      summaryId: 'summary-1',
      status: 'approved',
      reviewedByUserId: 'service-adviser-1',
      customerVisible: true,
    });

    expect(isLifecycleEventEnvelope(blockedEvent)).toBe(true);
    expect(lifecycleEventRegistry['quality_gate.blocked']).toEqual(
      expect.objectContaining({
        producer: 'main-service',
        sourceDomain: 'main-service.quality-gates',
      }),
    );
    expect(reviewedSummaryEvent).toEqual(
      expect.objectContaining({
        name: 'vehicle.lifecycle_summary_reviewed',
        payload: expect.objectContaining({
          vehicleId: 'vehicle-1',
          status: 'approved',
          customerVisible: true,
        }),
      }),
    );
  });
});
