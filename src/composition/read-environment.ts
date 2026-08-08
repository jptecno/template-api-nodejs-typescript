import type { HttpServerConfiguration } from '../contracts/http/http-server-configuration.types.js';

const MINIMUM_BODY_LIMIT_BYTES = 1_024;
const MAXIMUM_BODY_LIMIT_BYTES = 10 * 1_024 * 1_024;
const DEFAULT_BODY_LIMIT_BYTES = 1_024 * 1_024;
const MAXIMUM_TIMEOUT_MILLISECONDS = 300_000;
const DEFAULT_CONNECTION_TIMEOUT_MILLISECONDS = 10_000;
const DEFAULT_KEEP_ALIVE_TIMEOUT_MILLISECONDS = 72_000;
const DEFAULT_REQUEST_TIMEOUT_MILLISECONDS = 30_000;

export interface Environment extends HttpServerConfiguration {
  databaseUrl: string;
  port: number;
}

export function readEnvironment(environment: NodeJS.ProcessEnv): Environment {
  const databaseUrl = environment.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL é obrigatória');
  }

  return {
    databaseUrl,
    port: readInteger(environment.PORT, 3_000, 1, 65_535, 'PORT'),
    bodyLimitBytes: readInteger(
      environment.HTTP_BODY_LIMIT_BYTES,
      DEFAULT_BODY_LIMIT_BYTES,
      MINIMUM_BODY_LIMIT_BYTES,
      MAXIMUM_BODY_LIMIT_BYTES,
      'HTTP_BODY_LIMIT_BYTES',
    ),
    connectionTimeoutMilliseconds: readInteger(
      environment.HTTP_CONNECTION_TIMEOUT_MILLISECONDS,
      DEFAULT_CONNECTION_TIMEOUT_MILLISECONDS,
      1,
      MAXIMUM_TIMEOUT_MILLISECONDS,
      'HTTP_CONNECTION_TIMEOUT_MILLISECONDS',
    ),
    keepAliveTimeoutMilliseconds: readInteger(
      environment.HTTP_KEEP_ALIVE_TIMEOUT_MILLISECONDS,
      DEFAULT_KEEP_ALIVE_TIMEOUT_MILLISECONDS,
      1,
      MAXIMUM_TIMEOUT_MILLISECONDS,
      'HTTP_KEEP_ALIVE_TIMEOUT_MILLISECONDS',
    ),
    requestTimeoutMilliseconds: readInteger(
      environment.HTTP_REQUEST_TIMEOUT_MILLISECONDS,
      DEFAULT_REQUEST_TIMEOUT_MILLISECONDS,
      1,
      MAXIMUM_TIMEOUT_MILLISECONDS,
      'HTTP_REQUEST_TIMEOUT_MILLISECONDS',
    ),
  };
}

function readInteger(
  value: string | undefined,
  defaultValue: number,
  minimum: number,
  maximum: number,
  variableName: string,
): number {
  const resolvedValue = value ?? String(defaultValue);

  if (!/^\d+$/.test(resolvedValue)) {
    throw new Error(
      `${variableName} deve ser um inteiro entre ${minimum} e ${maximum}`,
    );
  }

  const parsedValue = Number(resolvedValue);

  if (
    !Number.isSafeInteger(parsedValue) ||
    parsedValue < minimum ||
    parsedValue > maximum
  ) {
    throw new Error(
      `${variableName} deve ser um inteiro entre ${minimum} e ${maximum}`,
    );
  }

  return parsedValue;
}
