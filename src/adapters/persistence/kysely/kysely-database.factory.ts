import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

export type Database = Record<never, never>;

export function createKyselyDatabase(databaseUrl: string) {
  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString: databaseUrl }),
    }),
  });
}
