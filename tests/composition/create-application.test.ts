import { beforeEach, describe, expect, it, vi } from 'vitest';

const database = vi.hoisted(() => ({
  destroy: vi.fn<() => Promise<void>>(),
}));

vi.mock(
  '../../src/adapters/persistence/kysely/kysely-database.factory.js',
  () => ({
    createKyselyDatabase: vi.fn(() => database),
  }),
);

import { createApplication } from '../../src/composition/create-application.js';

describe('createApplication', () => {
  beforeEach(() => {
    database.destroy.mockClear();
    database.destroy.mockResolvedValue();
  });

  it('encerra o pool do banco ao fechar a aplicação', async () => {
    const app = createApplication({
      databaseUrl: 'postgresql://localhost:5432/application',
      port: 3000,
      bodyLimitBytes: 1_048_576,
      connectionTimeoutMilliseconds: 10_000,
      keepAliveTimeoutMilliseconds: 72_000,
      requestTimeoutMilliseconds: 30_000,
    });

    await app.close();

    expect(database.destroy).toHaveBeenCalledOnce();
  });
});
