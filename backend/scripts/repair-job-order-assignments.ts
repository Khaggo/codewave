import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from '../apps/main-service/src/app.module';
import { JobOrdersService } from '../apps/main-service/src/modules/job-orders/services/job-orders.service';
import { assertOperationalSafety, parseOperationalArgs } from './operational-safety';

async function main() {
  const args = parseOperationalArgs(process.argv.slice(2));
  const safety = assertOperationalSafety({
    command: 'repair:job-order-assignments',
    args,
    databaseUrl: process.env.DATABASE_URL,
  });
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const jobOrdersService = app.get(JobOrdersService);
    const repairSummary = await jobOrdersService.repairAssignmentRecovery({
      execute: args.execute,
    });

    console.log(
      JSON.stringify(
        {
          status: 'ok',
          safety,
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
