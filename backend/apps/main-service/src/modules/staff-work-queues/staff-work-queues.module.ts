import { Module } from '@nestjs/common';

import { AuthModule } from '@main-modules/auth/auth.module';
import { UsersModule } from '@main-modules/users/users.module';

import { StaffWorkQueuesController } from './controllers/staff-work-queues.controller';
import { StaffWorkClaimGuard } from './guards/staff-work-claim.guard';
import { StaffWorkQueuesRepository } from './repositories/staff-work-queues.repository';
import { StaffWorkQueuesService } from './services/staff-work-queues.service';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [StaffWorkQueuesController],
  providers: [StaffWorkQueuesRepository, StaffWorkQueuesService, StaffWorkClaimGuard],
  exports: [StaffWorkQueuesRepository, StaffWorkQueuesService, StaffWorkClaimGuard],
})
export class StaffWorkQueuesModule {}
