import '@azure/core-asynciterator-polyfill';
import { PowerSyncDatabase } from '@powersync/react-native';
import { OPSqliteOpenFactory } from '@powersync/op-sqlite';
import { AppSchema } from '@/db/schema';

/**
 * PowerSync database instance.
 *
 * Currently running in local-only mode (no sync service connected).
 * All tables use localOnly: true so writes don't accumulate in the
 * upload queue. When we add Supabase sync in Phase 3, we'll:
 *   1. Remove localOnly from table definitions
 *   2. Create a PowerSync connector
 *   3. Call db.connect(connector)
 */
const sqliteFactory = new OPSqliteOpenFactory({
  dbFilename: 'habits.db',
});

export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: sqliteFactory,
});
