import { createFastifyApp } from '../adapters/http/fastify-app.factory.js';
import { createKyselyDatabase } from '../adapters/persistence/kysely/kysely-database.factory.js';

import type { Environment } from './read-environment.js';

export function createApplication(environment: Environment) {
  const app = createFastifyApp();
  const database = createKyselyDatabase(environment.databaseUrl);

  app.addHook('onClose', async () => {
    await database.destroy();
  });

  return app;
}
