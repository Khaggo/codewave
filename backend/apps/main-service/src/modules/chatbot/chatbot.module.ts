import { Module } from '@nestjs/common';

import { AuthModule } from '@main-modules/auth/auth.module';
import { BookingsModule } from '@main-modules/bookings/bookings.module';
import { InsuranceModule } from '@main-modules/insurance/insurance.module';
import { UsersModule } from '@main-modules/users/users.module';

import { ChatbotController } from './controllers/chatbot.controller';
import { ChatbotRepository } from './repositories/chatbot.repository';
import { ChatbotService } from './services/chatbot.service';

@Module({
  imports: [AuthModule, UsersModule, BookingsModule, InsuranceModule],
  controllers: [ChatbotController],
  providers: [ChatbotRepository, ChatbotService],
  exports: [ChatbotRepository, ChatbotService],
})
export class ChatbotModule {}
