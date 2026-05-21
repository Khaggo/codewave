import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('VehicleLifecycleModule wiring', () => {
  it('imports InsuranceModule so insurance timeline events are available at runtime', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'apps/main-service/src/modules/vehicle-lifecycle/vehicle-lifecycle.module.ts',
      ),
      'utf8',
    );

    expect(source).toMatch(/import\s+\{\s*InsuranceModule\s*\}\s+from\s+'@main-modules\/insurance\/insurance\.module'/);
    expect(source).toMatch(/imports:\s*\[[\s\S]*InsuranceModule[\s\S]*\]/);
  });
});
