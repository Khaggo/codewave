import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { AnyCommerceEventEnvelope } from '@shared/events/contracts/commerce-events';

import { LoyaltyRuntimeService } from '../services/loyalty-runtime.service';

@Controller()
export class LoyaltyEventsController {
  constructor(private readonly loyaltyRuntimeService: LoyaltyRuntimeService) {}

  @EventPattern('invoice.payment_recorded')
  async handleInvoicePaymentRecorded(
    @Payload() event: AnyCommerceEventEnvelope,
    @Ctx() context: RmqContext,
  ) {
    try {
      await this.loyaltyRuntimeService.handleAccrualTrigger(event);
    } finally {
      context.getChannelRef().ack(context.getMessage());
    }
  }
}
