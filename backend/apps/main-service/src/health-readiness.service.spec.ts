import { ServiceUnavailableException } from '@nestjs/common';
import type { Pool } from 'pg';

import { HealthReadinessService } from './health-readiness.service';

const createService = (query: jest.Mock) =>
  new HealthReadinessService({ query } as unknown as Pool);

describe('HealthReadinessService', () => {
  it('reports ready only when the database and required schema are available', async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [
        {
          coreTableReady: true,
          insuranceColumnsReady: true,
        },
      ],
    });

    await expect(createService(query).checkReadiness()).resolves.toMatchObject({
      service: 'main-service',
      status: 'ready',
      dependencies: {
        database: 'ready',
        schema: 'ready',
      },
    });
  });

  it('fails closed when the connected database schema is outdated', async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [
        {
          coreTableReady: true,
          insuranceColumnsReady: false,
        },
      ],
    });

    await expect(createService(query).checkReadiness()).rejects.toMatchObject({
      response: {
        service: 'main-service',
        status: 'not_ready',
        dependencies: {
          database: 'ready',
          schema: 'outdated',
        },
      },
    });
  });

  it('fails without exposing database errors when the dependency is unavailable', async () => {
    const query = jest
      .fn()
      .mockRejectedValue(new Error('postgresql://user:secret@example.test/db'));

    let caughtError: unknown;
    try {
      await createService(query).checkReadiness();
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(ServiceUnavailableException);
    expect((caughtError as ServiceUnavailableException).getResponse()).toEqual({
      service: 'main-service',
      version: 'development',
      status: 'not_ready',
      dependencies: {
        database: 'unavailable',
        schema: 'unknown',
      },
    });
    expect(
      JSON.stringify(
        (caughtError as ServiceUnavailableException).getResponse(),
      ),
    ).not.toContain('secret');
  });
});
