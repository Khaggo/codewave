import {
  assertOperationalSafety,
  databaseFingerprint,
  parseOperationalArgs,
} from './operational-safety';

describe('operational safety', () => {
  it('defaults mutating commands to dry-run and redacts credentials', () => {
    const databaseUrl = 'postgresql://admin:secret@localhost:5433/codewave';
    const safety = assertOperationalSafety({
      command: 'repair:test',
      args: parseOperationalArgs([]),
      databaseUrl,
    });

    expect(safety).toMatchObject({
      mode: 'dry_run',
      database: 'postgresql://localhost:5433/codewave',
      productionLike: false,
    });
    expect(databaseFingerprint(databaseUrl)).not.toContain('secret');
  });

  it('requires an audit reason for execution', () => {
    expect(() =>
      assertOperationalSafety({
        command: 'repair:test',
        args: parseOperationalArgs(['--execute']),
        databaseUrl: 'postgresql://admin:secret@localhost:5433/codewave',
      }),
    ).toThrow('--reason=<audit-reason>');
  });

  it('requires explicit production authorization for remote targets', () => {
    expect(() =>
      assertOperationalSafety({
        command: 'repair:test',
        args: parseOperationalArgs(['--execute', '--reason=approved-maintenance']),
        databaseUrl: 'postgresql://admin:secret@db.example.test:5432/codewave',
      }),
    ).toThrow('--allow-production');

    expect(
      assertOperationalSafety({
        command: 'repair:test',
        args: parseOperationalArgs([
          '--execute',
          '--allow-production',
          '--reason=approved-maintenance',
        ]),
        databaseUrl: 'postgresql://admin:secret@db.example.test:5432/codewave',
      }).mode,
    ).toBe('execute');
  });
});
