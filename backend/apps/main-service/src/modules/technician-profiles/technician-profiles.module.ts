import { Module } from '@nestjs/common';

import { UsersModule } from '@main-modules/users/users.module';

import { TechnicianProfilesController } from './controllers/technician-profiles.controller';
import { TechnicianProfilesRepository } from './repositories/technician-profiles.repository';
import { TechnicianProfilesService } from './services/technician-profiles.service';

@Module({
  imports: [UsersModule],
  controllers: [TechnicianProfilesController],
  providers: [TechnicianProfilesRepository, TechnicianProfilesService],
  exports: [TechnicianProfilesRepository, TechnicianProfilesService],
})
export class TechnicianProfilesModule {}
