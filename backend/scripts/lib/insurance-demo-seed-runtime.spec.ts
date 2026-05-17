import {
  applyEnvLayer,
  canReuseSeedVehicle,
  findStaleDemoEmails,
  isSeedOwnedText,
  parseEnvFileContents,
} from './insurance-demo-seed-runtime';

describe('insurance demo seed runtime helpers', () => {
  it('lets .env override only values previously loaded from .env.example', () => {
    const targetEnv: NodeJS.ProcessEnv = {
      DATABASE_URL: 'postgresql://shell-value',
    };

    const exampleValues = parseEnvFileContents(`
      DATABASE_URL=postgresql://example-value
      INSURANCE_BUCKET=example-bucket
    `);
    const exampleLoadedKeys = applyEnvLayer(targetEnv, exampleValues);

    const envValues = parseEnvFileContents(`
      DATABASE_URL=postgresql://local-value
      INSURANCE_BUCKET=local-bucket
      INSURANCE_REGION=manila
    `);

    applyEnvLayer(targetEnv, envValues, { overwriteKeys: exampleLoadedKeys });

    expect(targetEnv.DATABASE_URL).toBe('postgresql://shell-value');
    expect(targetEnv.INSURANCE_BUCKET).toBe('local-bucket');
    expect(targetEnv.INSURANCE_REGION).toBe('manila');
  });

  it('recognizes only tagged notes as seed-owned cleanup targets', () => {
    expect(isSeedOwnedText('demo.insurance.seed | review queue', 'demo.insurance.seed')).toBe(true);
    expect(isSeedOwnedText('manually-created local note', 'demo.insurance.seed')).toBe(false);
    expect(isSeedOwnedText(null, 'demo.insurance.seed')).toBe(false);
  });

  it('refuses to reuse a vehicle plate when the existing row is not seed-owned', () => {
    expect(canReuseSeedVehicle('demo.insurance.seed | renewal workflow', 'demo.insurance.seed')).toBe(true);
    expect(canReuseSeedVehicle('customer-owned real vehicle', 'demo.insurance.seed')).toBe(false);
    expect(canReuseSeedVehicle(undefined, 'demo.insurance.seed')).toBe(false);
  });

  it('finds only stale accounts inside the reserved insurance demo namespace', () => {
    const staleEmails = findStaleDemoEmails(
      [
        'demo.insurance.review@example.com',
        'demo.insurance.legacy@example.com',
        'demo.insurance.staff@example.com',
        'real.customer@example.com',
        'demo.booking.legacy@example.com',
      ],
      new Set([
        'demo.insurance.review@example.com',
        'demo.insurance.staff@example.com',
      ]),
    );

    expect(staleEmails).toEqual(['demo.insurance.legacy@example.com']);
  });
});
