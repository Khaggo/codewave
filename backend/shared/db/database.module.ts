import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { DRIZZLE_DB, PG_POOL } from './database.constants';
import * as schema from './schema';

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const connectionString = configService.getOrThrow<string>('database.url');
        return new Pool({ connectionString });
      },
    },
    {
      provide: DRIZZLE_DB,
      inject: [PG_POOL],
      useFactory: (pool: Pool) => drizzle(pool, { schema }),
    },
  ],
  exports: [PG_POOL, DRIZZLE_DB],
})
export class DatabaseModule {}
