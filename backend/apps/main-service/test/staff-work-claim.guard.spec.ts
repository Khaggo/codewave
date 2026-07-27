import { ConflictException, ExecutionContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';

import {
  WORK_CLAIM_REQUIREMENT,
  WorkClaimRequirement,
} from '@main-modules/staff-work-queues/decorators/requires-work-claim.decorator';
import { StaffWorkClaimGuard } from '@main-modules/staff-work-queues/guards/staff-work-claim.guard';
import { StaffWorkQueuesService } from '@main-modules/staff-work-queues/services/staff-work-queues.service';

const requirement: WorkClaimRequirement = {
  queueType: 'job_order',
  entityType: 'job_order',
  entityIdKey: 'id',
};

function createContext({
  userId = 'staff-1',
  entityId = 'job-1',
  claimId,
}: {
  userId?: string;
  entityId?: string;
  claimId?: string;
} = {}): ExecutionContext {
  const handler = () => undefined;
  Reflect.defineMetadata(WORK_CLAIM_REQUIREMENT, requirement, handler);
  const request = {
    method: 'PATCH',
    route: { path: '/job-orders/:id/status' },
    path: `/job-orders/${entityId}/status`,
    params: { id: entityId },
    body: {},
    headers: claimId ? { 'x-work-claim-id': claimId } : {},
    user: userId ? { userId } : undefined,
  };

  return {
    getHandler: () => handler,
    getClass: () => class TestController {},
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => undefined,
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext;
}

function createGuard({
  mode,
  assertClaimAccess,
}: {
  mode: 'observe' | 'strict';
  assertClaimAccess: jest.Mock;
}) {
  return new StaffWorkClaimGuard(
    new Reflector(),
    { assertClaimAccess } as unknown as StaffWorkQueuesService,
    {
      get: (_key: string, fallback: string) => mode ?? fallback,
    } as ConfigService,
  );
}

describe('StaffWorkClaimGuard', () => {
  it('fails module construction when the queue service provider is missing', async () => {
    await expect(
      Test.createTestingModule({
        providers: [
          StaffWorkClaimGuard,
          Reflector,
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue('strict') },
          },
        ],
      }).compile(),
    ).rejects.toThrow(/StaffWorkQueuesService/);
  });

  it('rejects a request whose authenticated user or entity context is missing', async () => {
    const guard = createGuard({
      mode: 'strict',
      assertClaimAccess: jest.fn(),
    });

    await expect(
      guard.canActivate(createContext({ userId: '', entityId: '' })),
    ).rejects.toMatchObject({
      response: { code: 'WORK_CLAIM_CONTEXT_MISSING' },
    });
  });

  it('uses fail-closed verification in strict mode', async () => {
    const assertClaimAccess = jest.fn().mockResolvedValue({ id: 'claim-1' });
    const guard = createGuard({ mode: 'strict', assertClaimAccess });

    await expect(
      guard.canActivate(createContext({ claimId: 'claim-1' })),
    ).resolves.toBe(true);
    expect(assertClaimAccess).toHaveBeenCalledWith(
      'claim-1',
      'job_order',
      'job_order',
      'job-1',
      'staff-1',
      { allowUnclaimedWithoutHeader: false },
    );
  });

  it('observes only the headerless unclaimed compatibility case', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const assertClaimAccess = jest.fn().mockResolvedValue(null);
    const guard = createGuard({ mode: 'observe', assertClaimAccess });

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
    expect(assertClaimAccess).toHaveBeenCalledWith(
      undefined,
      'job_order',
      'job_order',
      'job-1',
      'staff-1',
      { allowUnclaimedWithoutHeader: true },
    );
    expect(warn).toHaveBeenCalledWith({
      event: 'staff_work_claim_observed_missing',
      method: 'PATCH',
      route: '/job-orders/:id/status',
      queueType: 'job_order',
      entityType: 'job_order',
    });
    warn.mockRestore();
  });

  it.each(['observe', 'strict'] as const)(
    'rejects invalid supplied claims in %s mode',
    async (mode) => {
      const assertClaimAccess = jest.fn().mockRejectedValue(
        new ConflictException({
          code: 'WORK_CLAIM_CONFLICT',
          message: 'Claim mismatch',
        }),
      );
      const guard = createGuard({ mode, assertClaimAccess });

      await expect(
        guard.canActivate(createContext({ claimId: 'wrong-claim' })),
      ).rejects.toMatchObject({
        response: { code: 'WORK_CLAIM_CONFLICT' },
      });
    },
  );
});
