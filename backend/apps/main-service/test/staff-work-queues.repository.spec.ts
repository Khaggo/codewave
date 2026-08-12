import { PgDialect } from 'drizzle-orm/pg-core';

import { StaffWorkQueuesRepository } from '@main-modules/staff-work-queues/repositories/staff-work-queues.repository';

function compileQuery(query: unknown) {
  return new PgDialect().sqlToQuery(query as never).sql.replace(/\s+/g, ' ').trim();
}

function createDatabaseDouble(execute: jest.Mock) {
  return {
    execute,
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn().mockResolvedValue([]),
      })),
    })),
  };
}

describe('StaffWorkQueuesRepository finalization ownership', () => {
  it('lists and counts only QA-cleared ready-for-QA records as Job Order work', async () => {
    const execute = jest.fn().mockResolvedValue({ rows: [] });
    const repository = new StaffWorkQueuesRepository(createDatabaseDouble(execute) as never);

    await repository.listQueue('job_order', 'staff-1', {
      view: 'team',
      search: '',
      limit: 25,
      offset: 0,
    });
    const listSql = compileQuery(execute.mock.calls[execute.mock.calls.length - 1]?.[0]);
    expect(listSql).toContain("job.status = 'ready_for_qa'");
    expect(listSql).toContain("gate.status IN ('passed', 'overridden')");
    expect(listSql).toContain("gate.reviewer_verdict = 'passed'");
    expect(listSql).toContain("'QA cleared; ready to finalize'");
    expect(listSql).not.toContain("gate.status IN ('pending_review', 'blocked')");
    expect(listSql).toContain("job.job_order_reference, 'Reference unavailable'");
    expect(listSql).not.toContain("LEFT(job.id::text, 8)");
    expect(listSql).not.toContain("LEFT(booking.id::text, 8)");

    execute.mockClear();
    await repository.getQueueSummary('job_order', 'staff-1');
    const summarySql = compileQuery(execute.mock.calls[execute.mock.calls.length - 1]?.[0]);
    expect(summarySql).toContain("job.status = 'ready_for_qa'");
    expect(summarySql).toContain("gate.status IN ('passed', 'overridden')");
    expect(summarySql).toContain("gate.reviewer_verdict = 'passed'");
  });

  it('uses the same QA-cleared rule and priority for dispatch candidates', async () => {
    const execute = jest.fn().mockResolvedValue({ rows: [] });
    const repository = new StaffWorkQueuesRepository({ execute } as never);

    await (
      repository as unknown as {
        selectNextCandidate: (
          tx: { execute: typeof execute },
          queueType: 'job_order',
        ) => Promise<unknown>;
      }
    ).selectNextCandidate({ execute }, 'job_order');

    const dispatchSql = compileQuery(execute.mock.calls[0]?.[0]);
    expect(dispatchSql).toContain("job.status = 'ready_for_qa'");
    expect(dispatchSql).toContain("gate.status IN ('passed', 'overridden')");
    expect(dispatchSql).toContain("gate.reviewer_verdict = 'passed'");
    expect(dispatchSql).toContain("WHEN job.status = 'ready_for_qa' THEN 4");
    expect(dispatchSql).toContain('FOR UPDATE OF job SKIP LOCKED');
  });

  it('releases stale claims after work moves into another queue', async () => {
    const execute = jest.fn().mockResolvedValue({ rows: [] });
    const repository = new StaffWorkQueuesRepository(createDatabaseDouble(execute) as never);

    await repository.expireClaims(new Date('2026-07-27T12:00:00.000Z'));

    const cleanupSql = compileQuery(execute.mock.calls[0]?.[0]);
    expect(cleanupSql).toContain("claim.queue_type = 'job_order'");
    expect(cleanupSql).toContain("gate.reviewer_verdict = 'passed'");
    expect(cleanupSql).toContain("claim.queue_type = 'qa'");
    expect(cleanupSql).toContain("gate.reviewer_verdict = 'pending'");
  });
});
