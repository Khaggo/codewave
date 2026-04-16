import { Module } from '@nestjs/common';

import { QualityGatesModule } from '@main-modules/quality-gates/quality-gates.module';
import { VehicleLifecycleModule } from '@main-modules/vehicle-lifecycle/vehicle-lifecycle.module';

import { AiWorkerProcessor } from './ai-worker.processor';

@Module({
  imports: [QualityGatesModule, VehicleLifecycleModule],
  providers: [AiWorkerProcessor],
})
export class AiWorkerModule {}
