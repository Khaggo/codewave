import { Module } from '@nestjs/common';

import { QualityGatesModule } from '@main-modules/quality-gates/quality-gates.module';
import { VehicleLifecycleModule } from '@main-modules/vehicle-lifecycle/vehicle-lifecycle.module';
import { hasRedisRuntimeConfig } from '@shared/queue/runtime-queue-config';

import { AiWorkerProcessor } from './ai-worker.processor';

const aiWorkerQueueEnabled = hasRedisRuntimeConfig();

@Module({
  imports: [QualityGatesModule, VehicleLifecycleModule],
  providers: [...(aiWorkerQueueEnabled ? [AiWorkerProcessor] : [])],
})
export class AiWorkerModule {}
