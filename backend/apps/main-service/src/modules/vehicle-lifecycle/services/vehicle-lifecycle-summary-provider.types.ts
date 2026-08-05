import type { VehicleLifecycleSummaryProvenance } from '../schemas/vehicle-lifecycle.schema';

export type LifecycleSummaryEvidence = {
  eventType: string;
  eventCategory: 'administrative' | 'verified';
  sourceType: 'booking' | 'inspection' | 'job_order' | 'quality_gate' | 'lifecycle_summary' | 'manual';
  occurredAt: Date;
  dedupeKey?: string;
};

export type LifecycleSummaryInput = {
  vehicleLabel: string;
  timelineEvents: LifecycleSummaryEvidence[];
};

export type LifecycleSummaryOutput = {
  summaryText: string;
  provenance: VehicleLifecycleSummaryProvenance;
};

export type LifecycleSummaryEvidenceReference = LifecycleSummaryEvidence;

export const buildQueuedSummaryProvenanceFallback = (
  events: LifecycleSummaryEvidenceReference[],
): VehicleLifecycleSummaryProvenance => ({
  provider: 'unavailable-test-adapter',
  model: 'unavailable',
  promptVersion: 'vehicle-lifecycle.summary.v2',
  evidenceRefs: [],
  evidenceSummary:
    events.length > 0
      ? 'Lifecycle evidence is queued and remains hidden until staff review.'
      : 'No lifecycle evidence was queued.',
});

export type VehicleLifecycleSummaryProvider = {
  assertAvailable(): void;
  buildQueuedProvenance(
    events: LifecycleSummaryEvidenceReference[],
  ): VehicleLifecycleSummaryProvenance;
  generate(input: LifecycleSummaryInput): Promise<LifecycleSummaryOutput>;
};
