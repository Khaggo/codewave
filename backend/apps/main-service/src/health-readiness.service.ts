import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { Pool } from 'pg';

import { PG_POOL } from '@shared/db/database.constants';

type ReadinessRow = {
  coreTableReady: boolean;
  insuranceColumnsReady: boolean;
};

type DependencyState = 'ready' | 'outdated' | 'unavailable' | 'unknown';

type ReadinessPayload = {
  service: 'main-service';
  version: string;
  status: 'ready' | 'not_ready';
  dependencies: {
    database: DependencyState;
    schema: DependencyState;
  };
};

const READINESS_QUERY = `
  SELECT
    to_regclass('public.users') IS NOT NULL AS "coreTableReady",
    (
      SELECT COUNT(*) = 4
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (
          (table_name = 'insurance_inquiries' AND column_name IN (
            'client_request_id',
            'incident_occurred_at',
            'incident_location'
          ))
          OR (table_name = 'insurance_activities' AND column_name = 'customer_message')
        )
    ) AS "insuranceColumnsReady"
`;

const getServiceVersion = () => {
  const candidate =
    process.env.APP_VERSION?.trim() ||
    process.env.RAILWAY_GIT_COMMIT_SHA?.trim().slice(0, 12) ||
    'development';

  return candidate.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 64) || 'development';
};

const buildPayload = (
  status: ReadinessPayload['status'],
  database: DependencyState,
  schema: DependencyState,
): ReadinessPayload => ({
  service: 'main-service',
  version: getServiceVersion(),
  status,
  dependencies: {
    database,
    schema,
  },
});

@Injectable()
export class HealthReadinessService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async checkReadiness(): Promise<ReadinessPayload> {
    try {
      const result = await this.pool.query<ReadinessRow>(READINESS_QUERY);
      const row = result.rows[0];

      if (!row?.coreTableReady || !row.insuranceColumnsReady) {
        throw new ServiceUnavailableException(
          buildPayload('not_ready', 'ready', 'outdated'),
        );
      }

      return buildPayload('ready', 'ready', 'ready');
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      throw new ServiceUnavailableException(
        buildPayload('not_ready', 'unavailable', 'unknown'),
      );
    }
  }
}
