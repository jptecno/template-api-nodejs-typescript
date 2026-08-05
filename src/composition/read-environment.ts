export interface Environment {
  databaseUrl: string;
  port: number;
}

export function readEnvironment(environment: NodeJS.ProcessEnv): Environment {
  const databaseUrl = environment.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL é obrigatória');
  }

  const portValue = environment.PORT ?? '3000';

  if (!/^\d+$/.test(portValue)) {
    throw new Error('PORT deve ser um inteiro entre 1 e 65535');
  }

  const port = Number(portValue);

  if (port < 1 || port > 65535) {
    throw new Error('PORT deve ser um inteiro entre 1 e 65535');
  }

  return { databaseUrl, port };
}
