import { inspectTaskStatus } from './agent-task-status';

describe('inspectTaskStatus', () => {
  it('accepts one canonical supported status section', () => {
    expect(
      inspectTaskStatus(
        'docs/architecture/tasks/T001-example.md',
        '# Example\n\n## Status\n\n`in_progress`\n',
      ),
    ).toEqual({
      status: 'in_progress',
      errors: [],
    });
  });

  it('rejects legacy inline status metadata with a path-specific error', () => {
    expect(
      inspectTaskStatus(
        'docs/architecture/tasks/T002-legacy.md',
        '# Legacy\n\n- Status: `done`\n',
      ),
    ).toEqual({
      status: null,
      errors: [
        'docs/architecture/tasks/T002-legacy.md: missing canonical "## Status" section with a backticked value.',
      ],
    });
  });

  it('rejects duplicate status sections', () => {
    const result = inspectTaskStatus(
      'docs/architecture/tasks/T003-duplicate.md',
      '## Status\n\n`ready`\n\n## Status\n\n`done`\n',
    );

    expect(result.status).toBeNull();
    expect(result.errors).toEqual([
      'docs/architecture/tasks/T003-duplicate.md: contains more than one "## Status" section.',
    ]);
  });

  it('rejects unsupported status values and lists the contract', () => {
    const result = inspectTaskStatus(
      'docs/architecture/tasks/T004-unknown.md',
      '## Status\n\n`reviewing`\n',
    );

    expect(result.status).toBeNull();
    expect(result.errors).toEqual([
      'docs/architecture/tasks/T004-unknown.md: unsupported task status "reviewing"; expected one of planned, ready, in_progress, blocked, done.',
    ]);
  });
});
