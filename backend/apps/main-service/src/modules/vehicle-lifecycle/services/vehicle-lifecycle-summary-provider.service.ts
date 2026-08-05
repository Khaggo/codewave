import { Inject, Injectable, Optional, ServiceUnavailableException } from '@nestjs/common';

import type { VehicleLifecycleSummaryProvenance } from '../schemas/vehicle-lifecycle.schema';
import {
  AI_SUMMARY_CONFIG,
  AI_SUMMARY_PROMPT_VERSION,
  AI_SUMMARY_UNAVAILABLE_CODE,
  type AiSummaryConfig,
  isAiSummaryConfigured,
  readAiSummaryConfig,
} from './ai-summary-config';
import { OpenAiCompatibleSummaryAdapter } from './openai-compatible-summary.adapter';
import {
  type LifecycleSummaryEvidence,
  type LifecycleSummaryEvidenceReference,
  type LifecycleSummaryInput,
  type LifecycleSummaryOutput,
  type VehicleLifecycleSummaryProvider,
} from './vehicle-lifecycle-summary-provider.types';

@Injectable()
export class VehicleLifecycleSummaryProviderService
  implements VehicleLifecycleSummaryProvider
{
  private readonly config: AiSummaryConfig;
  private readonly adapter: OpenAiCompatibleSummaryAdapter;

  constructor(@Optional() @Inject(AI_SUMMARY_CONFIG) config?: AiSummaryConfig) {
    this.config = config ?? readAiSummaryConfig();
    this.adapter = new OpenAiCompatibleSummaryAdapter(this.config);
  }

  assertAvailable() {
    if (!isAiSummaryConfigured(this.config)) {
      throw new ServiceUnavailableException({
        code: AI_SUMMARY_UNAVAILABLE_CODE,
        message:
          'AI summary generation is unavailable until an OpenAI-compatible provider is configured.',
      });
    }
  }

  buildQueuedProvenance(
    events: LifecycleSummaryEvidenceReference[],
  ): VehicleLifecycleSummaryProvenance {
    return {
      provider: this.config.provider,
      model: this.config.model ?? 'unconfigured',
      promptVersion: AI_SUMMARY_PROMPT_VERSION,
      evidenceRefs: this.toSafeEvidenceRefs(events),
      evidenceSummary:
        'Lifecycle evidence is queued for an optional AI provider and remains hidden until staff review.',
    };
  }

  generate(input: LifecycleSummaryInput): Promise<LifecycleSummaryOutput> {
    this.assertAvailable();
    return this.adapter.generate({
      vehicleLabel: this.sanitizeVehicleLabel(input.vehicleLabel),
      timelineEvents: input.timelineEvents
        .slice(-this.config.maxEvidenceEvents)
        .map((event) => ({
          eventType: event.eventType,
          eventCategory: event.eventCategory,
          sourceType: event.sourceType,
          occurredAt: event.occurredAt,
        })),
    });
  }

  private toSafeEvidenceRefs(events: LifecycleSummaryEvidence[]) {
    return events.slice(-this.config.maxEvidenceEvents).map((event) => {
      const eventType =
        event.eventType
          .toLowerCase()
          .replace(/[^a-z0-9_-]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .slice(0, 80) || 'lifecycle_event';
      return (
        event.sourceType +
        ':' +
        eventType +
        ':' +
        event.occurredAt.toISOString().slice(0, 10)
      );
    });
  }

  private sanitizeVehicleLabel(value: string) {
    return value
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120);
  }
}
