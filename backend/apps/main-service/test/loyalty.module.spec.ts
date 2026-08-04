import { MODULE_METADATA } from '@nestjs/common/constants';

import { LoyaltyAccrualPlannerService } from '@shared/events/loyalty-accrual-planner.service';

import { LoyaltyModule } from '../src/modules/loyalty/loyalty.module';

describe('LoyaltyModule', () => {
  it('registers every concrete LoyaltyService constructor dependency', () => {
    const providers =
      Reflect.getMetadata(MODULE_METADATA.PROVIDERS, LoyaltyModule) ?? [];

    expect(providers).toContain(LoyaltyAccrualPlannerService);
  });
});
