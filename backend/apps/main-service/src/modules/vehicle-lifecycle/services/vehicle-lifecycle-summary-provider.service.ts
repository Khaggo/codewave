import { Injectable } from '@nestjs/common';

import type { VehicleLifecycleSummaryProvenance } from '../schemas/vehicle-lifecycle.schema';

const VEHICLE_LIFECYCLE_SUMMARY_PROVIDER = 'local-summary-adapter';
const VEHICLE_LIFECYCLE_SUMMARY_MODEL = 'timeline-summary-v1';
const VEHICLE_LIFECYCLE_SUMMARY_PROMPT_VERSION = 'vehicle-lifecycle.summary.v1';

type LifecycleSummaryInput = {
  vehicleLabel: string;
  timelineEvents: Array<{
    eventType: string;
    eventCategory: 'administrative' | 'verified';
    sourceType: 'booking' | 'inspection' | 'manual';
    occurredAt: Date;
    dedupeKey: string;
  }>;
};

type LifecycleSummaryOutput = {
  summaryText: string;
  provenance: VehicleLifecycleSummaryProvenance;
};

@Injectable()
export class VehicleLifecycleSummaryProviderService {
  generate(input: LifecycleSummaryInput): LifecycleSummaryOutput {
    const orderedEvents = [...input.timelineEvents].sort(
      (left, right) => left.occurredAt.getTime() - right.occurredAt.getTime(),
    );
    const verifiedEvents = orderedEvents.filter((event) => event.eventCategory === 'verified');
    const administrativeEvents = orderedEvents.filter((event) => event.eventCategory === 'administrative');
    const latestVerifiedEvent = verifiedEvents[verifiedEvents.length - 1] ?? null;
    const evidenceRefs = orderedEvents.slice(-8).map((event) => event.dedupeKey);

    const summaryParts = [
      `${input.vehicleLabel} has ${orderedEvents.length} recorded lifecycle event${orderedEvents.length === 1 ? '' : 's'} in this history snapshot.`,
      administrativeEvents.length
        ? `Administrative milestones include ${summarizeEvents(administrativeEvents.slice(0, 3))}.`
        : 'Administrative booking milestones are not yet present in this summary snapshot.',
      verifiedEvents.length
        ? `Verified evidence includes ${summarizeEvents(verifiedEvents.slice(-2))}.`
        : 'There is no verified inspection-backed lifecycle evidence in this summary draft yet.',
      latestVerifiedEvent
        ? `The latest verified service record was logged on ${latestVerifiedEvent.occurredAt.toISOString().slice(0, 10)}.`
        : 'Any customer-visible publication still depends on a reviewer confirming the draft against the latest verified evidence.',
    ];

    return {
      summaryText: summaryParts.join(' '),
      provenance: {
        provider: VEHICLE_LIFECYCLE_SUMMARY_PROVIDER,
        model: VEHICLE_LIFECYCLE_SUMMARY_MODEL,
        promptVersion: VEHICLE_LIFECYCLE_SUMMARY_PROMPT_VERSION,
        evidenceRefs,
        evidenceSummary:
          'Evidence is limited to normalized lifecycle timeline events, with special emphasis on verified inspection-backed milestones and customer-safe administrative statuses.',
      },
    };
  }
}

const summarizeEvents = (
  events: Array<{
    eventType: string;
    occurredAt: Date;
  }>,
) =>
  events
    .map((event) => `${humanizeEventType(event.eventType)} (${event.occurredAt.toISOString().slice(0, 10)})`)
    .join(', ');

const humanizeEventType = (eventType: string) => {
  if (eventType.startsWith('inspection_')) {
    return eventType
      .replace(/^inspection_/, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  if (eventType.startsWith('booking_')) {
    return eventType
      .replace(/^booking_/, 'booking ')
      .replace(/_/g, ' ');
  }

  return eventType.replace(/_/g, ' ');
};
