import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { accessoryError, AccessoryCommerceMode } from './accessories-common';

@Injectable()
export class AccessoriesFeatureService {
  constructor(private readonly configService: ConfigService) {}

  get mode(): AccessoryCommerceMode {
    return this.configService.get<AccessoryCommerceMode>('accessories.mode', 'off');
  }

  capabilities() {
    const mode = this.mode;
    return {
      mode,
      staffPreview: mode === 'staff_preview',
      catalogVisible: mode === 'catalog' || mode === 'ordering',
      orderingEnabled: mode === 'ordering',
      paymentMethods: mode === 'ordering' ? ['paymongo', 'pay_at_shop'] : [],
      pickupOnly: true,
    } as const;
  }

  requireCatalog(actorRole: string): void {
    if (['catalog', 'ordering'].includes(this.mode)) return;
    if (this.mode === 'staff_preview' && ['service_adviser', 'super_admin'].includes(actorRole)) return;
    throw new ForbiddenException(
      accessoryError('ACCESSORY_CATALOG_DISABLED', 'The Accessories catalog is not available.'),
    );
  }

  requireOrdering(): void {
    if (this.mode !== 'ordering') {
      throw new ForbiddenException(
        accessoryError('ACCESSORY_ORDERING_DISABLED', 'New Accessories orders are not available.'),
      );
    }
  }
}
