import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';

import { QualityGatesService } from '@main-modules/quality-gates/services/quality-gates.service';
import { VehicleLifecycleService } from '@main-modules/vehicle-lifecycle/services/vehicle-lifecycle.service';
import {
  AI_WORKER_QUEUE_NAME,
  GENERATE_VEHICLE_LIFECYCLE_SUMMARY_JOB_NAME,
  RUN_QUALITY_GATE_AUDIT_JOB_NAME,
} from '@shared/queue/ai-worker.constants';
import { createRuntimeAiJobMetadata } from '@shared/queue/ai-worker.types';

type AiWorkerJobData =
  | {
    jobOrderId: string;
    requestedAt: string;
  }
  | {
    summaryId: string;
    requestedAt: string;
  };

@Injectable()
@Processor(AI_WORKER_QUEUE_NAME)
export class AiWorkerProcessor extends WorkerHost {
  constructor(
    private readonly qualityGatesService: QualityGatesService,
    private readonly vehicleLifecycleService: VehicleLifecycleService,
  ) {
    super();
  }

  async process(job: Job<AiWorkerJobData>) {
    const startedAt = new Date().toISOString();
    const processingJob = createRuntimeAiJobMetadata(job, 'processing', {
      requestedAt: job.data.requestedAt,
      startedAt,
    });

    try {
      if (job.name === RUN_QUALITY_GATE_AUDIT_JOB_NAME && 'jobOrderId' in job.data) {
        await this.qualityGatesService.runQualityGateAudit(job.data.jobOrderId, processingJob);
        return;
      }

      if (job.name === GENERATE_VEHICLE_LIFECYCLE_SUMMARY_JOB_NAME && 'summaryId' in job.data) {
        await this.vehicleLifecycleService.runLifecycleSummaryGeneration(job.data.summaryId, processingJob);
        return;
      }

      throw new Error(`Unsupported AI worker job: ${job.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown AI worker failure';
      const failedAt = new Date().toISOString();
      const failedJob = createRuntimeAiJobMetadata(job, 'failed', {
        requestedAt: job.data.requestedAt,
        startedAt,
        failedAt,
        lastError: message,
      });

      if (job.name === RUN_QUALITY_GATE_AUDIT_JOB_NAME && 'jobOrderId' in job.data) {
        await this.qualityGatesService.handleQualityGateAuditWorkerFailure(
          job.data.jobOrderId,
          failedJob,
          message,
        );
      }

      if (job.name === GENERATE_VEHICLE_LIFECYCLE_SUMMARY_JOB_NAME && 'summaryId' in job.data) {
        await this.vehicleLifecycleService.handleLifecycleSummaryWorkerFailure(
          job.data.summaryId,
          failedJob,
          message,
        );
      }

      throw error;
    }
  }
}
