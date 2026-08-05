import { describe, expect, it } from 'vitest';

import { readEnvironment } from '../../src/composition/read-environment.js';

describe('readEnvironment', () => {
  it('lê a configuração válida', () => {
    expect(
      readEnvironment({
        DATABASE_URL: 'postgresql://localhost:5432/application',
        PORT: '4000',
      }),
    ).toEqual({
      databaseUrl: 'postgresql://localhost:5432/application',
      port: 4000,
    });
  });

  it('aceita os limites válidos de PORT', () => {
    for (const { port, expectedPort } of [
      { port: '1', expectedPort: 1 },
      { port: '65535', expectedPort: 65535 },
    ]) {
      expect(
        readEnvironment({
          DATABASE_URL: 'postgresql://localhost:5432/application',
          PORT: port,
        }).port,
      ).toBe(expectedPort);
    }
  });

  it('usa a porta padrão quando PORT não é informado', () => {
    expect(
      readEnvironment({
        DATABASE_URL: 'postgresql://localhost:5432/application',
      }),
    ).toEqual({
      databaseUrl: 'postgresql://localhost:5432/application',
      port: 3000,
    });
  });

  it('rejeita uma URL do banco ausente', () => {
    expect(() => readEnvironment({})).toThrow('DATABASE_URL é obrigatória');
  });

  it.each(['0', '65536', '1.0', '1e2', 'inválida'])(
    'rejeita PORT inválida: %s',
    (port) => {
      expect(() =>
        readEnvironment({
          DATABASE_URL: 'postgresql://localhost:5432/application',
          PORT: port,
        }),
      ).toThrow('PORT deve ser um inteiro entre 1 e 65535');
    },
  );
});
