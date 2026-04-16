import { Module } from '@nestjs/common';

import { AuthModule } from '@main-modules/auth/auth.module';
import { UsersModule } from '@main-modules/users/users.module';

import { LoyaltyController } from './controllers/loyalty.controller';
import { LoyaltyRepository } from './repositories/loyalty.repository';
import { LoyaltyService } from './services/loyalty.service';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [LoyaltyController],
  providers: [LoyaltyRepository, LoyaltyService],
  exports: [LoyaltyRepository, LoyaltyService],
})
export class LoyaltyModule {}
