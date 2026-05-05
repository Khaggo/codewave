import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from '../apps/main-service/src/app.module';
import { JobOrdersService } from '../apps/main-service/src/modules/job-orders/services/job-orders.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const jobOrdersService = app.get(JobOrdersService);
    const repairSummary = await jobOrdersService.repairAssignmentRecovery();

    console.log(
      JSON.stringify(
        {
          status: 'ok',
          repairedCount: repairSummary.repaired.length,
          downgradedToDraftCount: repairSummary.downgradedToDraft.length,
          manualReviewCount: repairSummary.manualReview.length,
          repaired: repairSummary.repaired,
          downgradedToDraft: repairSummary.downgradedToDraft,
          manualReview: repairSummary.manualReview,
        },
        null,
        2,
      ),
    );
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
