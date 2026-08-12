import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import * as schema from './schema';

export type AppDatabase = NodePgDatabase<typeof schema>;
export type AppDatabaseTransaction = Parameters<Parameters<AppDatabase['transaction']>[0]>[0];
export type AppDatabaseExecutor = AppDatabase | AppDatabaseTransaction;
