import { Module } from '@nestjs/common';

import { AutocareEventBusService } from './autocare-event-bus.service';
import { CommerceEventReactionPlannerService } from './commerce-event-reaction-planner.service';
import { LoyaltyAccrualPlannerService } from './loyalty-accrual-planner.service';
import { ServiceEventReactionPlannerService } from './service-event-reaction-planner.service';

@Module({
  providers: [
    AutocareEventBusService,
    CommerceEventReactionPlannerService,
    ServiceEventReactionPlannerService,
    LoyaltyAccrualPlannerService,
  ],
  exports: [
    AutocareEventBusService,
    CommerceEventReactionPlannerService,
    ServiceEventReactionPlannerService,
    LoyaltyAccrualPlannerService,
  ],
})
export class CommerceEventsModule {}
