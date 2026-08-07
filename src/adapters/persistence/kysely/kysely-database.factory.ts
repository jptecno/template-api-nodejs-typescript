import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

type DatabaseSchema = Record<never, never>;

export type Database = Kysely<DatabaseSchema>;

export function createKyselyDatabase(databaseUrl: string): Database {
  return new Kysely<DatabaseSchema>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString: databaseUrl }),
    }),
  });
}
