import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { UsersService } from '@main-modules/users/services/users.service';
import { AutocareEventBusService } from '@shared/events/autocare-event-bus.service';
import { AnyCommerceEventEnvelope } from '@shared/events/contracts/commerce-events';
import { AnyServiceEventEnvelope } from '@shared/events/contracts/service-events';

import { LoyaltyService } from './loyalty.service';

@Injectable()
export class LoyaltyRuntimeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LoyaltyRuntimeService.name);
  private readonly unsubscribers: Array<() => void> = [];

  constructor(
    private readonly loyaltyService: LoyaltyService,
    private readonly usersService: UsersService,
    private readonly eventBus: AutocareEventBusService,
  ) {}

  async onModuleInit() {
    this.unsubscribers.push(
      this.eventBus.subscribe('service.payment_recorded', (event) =>
        this.handleAccrualTrigger(event as AnyServiceEventEnvelope),
      ),
      this.eventBus.subscribe('invoice.payment_recorded', (event) =>
        this.handleAccrualTrigger(event as AnyCommerceEventEnvelope),
      ),
    );

    await this.ensureDefaultServicePaymentRule();
  }

  onModuleDestroy() {
    while (this.unsubscribers.length > 0) {
      const unsubscribe = this.unsubscribers.pop();
      unsubscribe?.();
    }
  }

  async handleAccrualTrigger(event: AnyServiceEventEnvelope | AnyCommerceEventEnvelope) {
    try {
      await this.loyaltyService.applyLoyaltyAccrual(event);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown loyalty accrual failure';
      this.logger.error(`Failed to apply loyalty accrual for ${event.name}: ${message}`);
    }
  }

  private async ensureDefaultServicePaymentRule() {
    try {
      const staffAccounts = await this.usersService.listStaffAccounts();
      const bootstrapActor = staffAccounts.find(
        (account) => account.role === 'super_admin' && account.isActive,
      );

      if (!bootstrapActor) {
        this.logger.warn(
          'Skipping default service loyalty rule bootstrap because no active super admin is available yet.',
        );
        return;
      }

      await this.loyaltyService.ensureDefaultServicePaymentRule({
        userId: bootstrapActor.id,
        role: 'super_admin',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown loyalty bootstrap failure';
      this.logger.error(`Failed to bootstrap the default service loyalty rule: ${message}`);
    }
  }
}
