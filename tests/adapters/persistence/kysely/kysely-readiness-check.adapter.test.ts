import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createKyselyDatabase } from '../../../../src/adapters/persistence/kysely/kysely-database.factory.js';
import { KyselyReadinessCheckAdapter } from '../../../../src/adapters/persistence/kysely/kysely-readiness-check.adapter.js';

const container = new PostgreSqlContainer('postgres:17-alpine');
let database: ReturnType<typeof createKyselyDatabase>;
let startedContainer: StartedPostgreSqlContainer;

describe('KyselyReadinessCheckAdapter', () => {
  beforeAll(async () => {
    startedContainer = await container.start();
    database = createKyselyDatabase(startedContainer.getConnectionUri());
  }, 60_000);

  afterAll(async () => {
    await database?.destroy();
    await startedContainer?.stop();
  }, 60_000);

  it('verifica a conexão com PostgreSQL real', async () => {
    const adapter = new KyselyReadinessCheckAdapter(database);

    await expect(adapter.check()).resolves.toBeUndefined();
  });
});
