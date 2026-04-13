import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { QUALITY_GATES_QUEUE_NAME } from './quality-gates.constants';
import { QualityGatesService } from './services/quality-gates.service';

@Processor(QUALITY_GATES_QUEUE_NAME)
export class QualityGatesProcessor extends WorkerHost {
  constructor(private readonly qualityGatesService: QualityGatesService) {
    super();
  }

  async process(job: Job<{ jobOrderId: string }>) {
    await this.qualityGatesService.runQualityGateAudit(job.data.jobOrderId);
  }
}
