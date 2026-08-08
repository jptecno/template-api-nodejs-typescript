import { describe, expect, it } from 'vitest';

import { readEnvironment } from '../../src/composition/read-environment.js';

const databaseUrl = 'postgresql://localhost:5432/application';

describe('readEnvironment', () => {
  it('usa os defaults do baseline HTTP', () => {
    expect(readEnvironment({ DATABASE_URL: databaseUrl })).toEqual({
      databaseUrl,
      port: 3000,
      bodyLimitBytes: 1_048_576,
      connectionTimeoutMilliseconds: 10_000,
      keepAliveTimeoutMilliseconds: 72_000,
      requestTimeoutMilliseconds: 30_000,
    });
  });

  it('lê a configuração HTTP válida', () => {
    expect(
      readEnvironment({
        DATABASE_URL: databaseUrl,
        PORT: '4000',
        HTTP_BODY_LIMIT_BYTES: '1024',
        HTTP_CONNECTION_TIMEOUT_MILLISECONDS: '1',
        HTTP_KEEP_ALIVE_TIMEOUT_MILLISECONDS: '300000',
        HTTP_REQUEST_TIMEOUT_MILLISECONDS: '5000',
      }),
    ).toEqual({
      databaseUrl,
      port: 4000,
      bodyLimitBytes: 1024,
      connectionTimeoutMilliseconds: 1,
      keepAliveTimeoutMilliseconds: 300_000,
      requestTimeoutMilliseconds: 5000,
    });
  });

  it.each([
    ['HTTP_BODY_LIMIT_BYTES', '1023', '1024 e 10485760'],
    ['HTTP_BODY_LIMIT_BYTES', '10485761', '1024 e 10485760'],
    ['HTTP_BODY_LIMIT_BYTES', '1.5', '1024 e 10485760'],
    ['HTTP_BODY_LIMIT_BYTES', '-1', '1024 e 10485760'],
    ['HTTP_BODY_LIMIT_BYTES', 'invalido', '1024 e 10485760'],
    ['HTTP_REQUEST_TIMEOUT_MILLISECONDS', '0', '1 e 300000'],
    ['HTTP_CONNECTION_TIMEOUT_MILLISECONDS', '300001', '1 e 300000'],
    ['HTTP_KEEP_ALIVE_TIMEOUT_MILLISECONDS', '1.5', '1 e 300000'],
  ])('rejeita %s inválida: %s', (variableName, value, range) => {
    expect(() =>
      readEnvironment({ DATABASE_URL: databaseUrl, [variableName]: value }),
    ).toThrow(`${variableName} deve ser um inteiro entre ${range}`);
  });

  it.each(['0', '65536', '1.0', '1e2', 'inválida'])(
    'rejeita PORT inválida: %s',
    (port) => {
      expect(() =>
        readEnvironment({ DATABASE_URL: databaseUrl, PORT: port }),
      ).toThrow('PORT deve ser um inteiro entre 1 e 65535');
    },
  );

  it('rejeita uma URL do banco ausente', () => {
    expect(() => readEnvironment({})).toThrow('DATABASE_URL é obrigatória');
  });
});
