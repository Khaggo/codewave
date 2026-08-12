import { MODULE_METADATA } from '@nestjs/common/constants';

import { JobOrdersModule } from './job-orders.module';

describe('JobOrdersModule', () => {
  it('resolves every imported module through the circular dependency graph', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, JobOrdersModule) as Array<
      { forwardRef?: () => unknown } | unknown
    >;

    expect(imports).toBeDefined();
    expect(imports.map((entry) => {
      const candidate = entry as { forwardRef?: unknown };
      if (typeof candidate?.forwardRef === 'function') {
        return candidate.forwardRef();
      }

      return entry;
    })).not.toContain(undefined);
  });
});
