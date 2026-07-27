import { StaffWorkQueuesService } from '@main-modules/staff-work-queues/services/staff-work-queues.service';

const actor = {
  userId: '00000000-0000-4000-8000-000000000001',
  role: 'service_adviser',
};

function createService(activeClaims: Array<Record<string, unknown>> = []) {
  const repository = {
    listQueue: jest.fn().mockResolvedValue({ items: [], hasNext: false }),
    getQueueSummary: jest.fn().mockResolvedValue({ total: 0, mine: activeClaims.length }),
    getSession: jest.fn().mockResolvedValue({
      status: 'available',
      lastSeenAt: new Date('2026-07-27T00:00:00.000Z'),
    }),
    getActiveClaimsForOwner: jest.fn().mockResolvedValue(activeClaims),
    touchAvailableSession: jest.fn().mockResolvedValue({ status: 'available' }),
    dispatchNext: jest.fn().mockResolvedValue({ id: 'new-claim' }),
    setSessionAvailability: jest.fn(),
    claimSelected: jest.fn(),
  };
  const usersService = {
    findById: jest.fn().mockResolvedValue({
      id: actor.userId,
      role: actor.role,
      isActive: true,
    }),
  };
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'staffWorkClaims.capacities.jobOrder') return 12;
      if (key === 'staffWorkClaims.capacities.qa') return 6;
      return undefined;
    }),
  };

  return {
    repository,
    service: new StaffWorkQueuesService(
      repository as never,
      usersService as never,
      configService as never,
    ),
  };
}

describe('StaffWorkQueuesService multi-work capacity', () => {
  it('returns every active claim plus remaining queue capacity', async () => {
    const claims = [
      {
        id: 'claim-2',
        entityId: 'job-2',
        entityType: 'job_order',
        claimedAt: new Date('2026-07-27T02:00:00.000Z'),
        leaseExpiresAt: new Date('2026-07-27T02:15:00.000Z'),
      },
      {
        id: 'claim-1',
        entityId: 'job-1',
        entityType: 'job_order',
        claimedAt: new Date('2026-07-27T01:00:00.000Z'),
        leaseExpiresAt: new Date('2026-07-27T01:15:00.000Z'),
      },
    ];
    const { service } = createService(claims);

    const result = await service.list('job_order', {} as never, actor);

    expect(result.session).toEqual(expect.objectContaining({
      capacity: 12,
      activeClaimCount: 2,
      remainingCapacity: 10,
      currentClaimId: 'claim-2',
    }));
    expect(result.session.activeClaims).toHaveLength(2);
  });

  it('dispatches another record below capacity and stops at capacity', async () => {
    const belowCapacity = createService([{ id: 'claim-1' }]);
    const assigned = await belowCapacity.service.dispatch('qa', actor);
    expect(assigned.assigned).toBe(true);
    expect(belowCapacity.repository.dispatchNext).toHaveBeenCalledWith(
      actor.userId,
      'qa',
      6,
    );

    const atCapacity = createService(
      Array.from({ length: 6 }, (_, index) => ({ id: `claim-${index}` })),
    );
    const rejected = await atCapacity.service.dispatch('qa', actor);
    expect(rejected).toEqual(expect.objectContaining({
      assigned: false,
      reason: 'CAPACITY_REACHED',
      capacity: 6,
    }));
    expect(atCapacity.repository.dispatchNext).not.toHaveBeenCalled();
  });
});
