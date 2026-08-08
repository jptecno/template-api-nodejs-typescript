import { createFastifyApp } from '../adapters/http/fastify-app.factory.js';
import { createKyselyDatabase } from '../adapters/persistence/kysely/kysely-database.factory.js';
import { KyselyReadinessCheckAdapter } from '../adapters/persistence/kysely/kysely-readiness-check.adapter.js';
import { CheckReadinessUseCase } from '../application/check-readiness.use-case.js';

import type { Environment } from './read-environment.js';

export function createApplication(environment: Environment) {
  const database = createKyselyDatabase(environment.databaseUrl);
  const checkReadiness = new CheckReadinessUseCase(
    new KyselyReadinessCheckAdapter(database),
    environment.requestTimeoutMilliseconds,
  );
  const app = createFastifyApp(environment, checkReadiness);

  app.addHook('onClose', async () => {
    await database.destroy();
  });

  return app;
}
