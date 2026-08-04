import { Module } from '@nestjs/common';

import { AccessoriesFeatureService } from './accessories-feature.service';

@Module({
  providers: [AccessoriesFeatureService],
  exports: [AccessoriesFeatureService],
})
export class AccessoriesCommonModule {}
