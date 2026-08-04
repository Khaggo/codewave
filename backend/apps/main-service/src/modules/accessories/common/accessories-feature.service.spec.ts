import { ConfigService } from '@nestjs/config';

import { AccessoriesFeatureService } from './accessories-feature.service';

const serviceFor = (mode: string) =>
  new AccessoriesFeatureService({
    get: (_key: string, fallback: string) => mode || fallback,
  } as ConfigService);

describe('AccessoriesFeatureService', () => {
  it('keeps ordering off unless ordering mode is explicit', () => {
    expect(serviceFor('off').capabilities().orderingEnabled).toBe(false);
    expect(() => serviceFor('catalog').requireOrdering()).toThrow('not available');
    expect(() => serviceFor('ordering').requireOrdering()).not.toThrow();
  });

  it('allows staff preview only to staff roles', () => {
    expect(() => serviceFor('staff_preview').requireCatalog('super_admin')).not.toThrow();
    expect(() => serviceFor('staff_preview').requireCatalog('customer')).toThrow(
      'not available',
    );
  });
});
