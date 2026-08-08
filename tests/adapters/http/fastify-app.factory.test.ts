import { request } from 'undici';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createFastifyApp } from '../../../src/adapters/http/fastify-app.factory.js';
import { CheckReadinessUseCase } from '../../../src/application/check-readiness.use-case.js';

const configuration = {
  bodyLimitBytes: 1024,
  connectionTimeoutMilliseconds: 10_000,
  keepAliveTimeoutMilliseconds: 72_000,
  requestTimeoutMilliseconds: 30_000,
};

function createApplication(
  check = vi.fn<() => Promise<void>>().mockResolvedValue(),
) {
  return {
    app: createFastifyApp(
      configuration,
      new CheckReadinessUseCase({ check }, 30_000),
    ),
    check,
  };
}

describe('createFastifyApp', () => {
  const applications: ReturnType<typeof createApplication>[] = [];

  afterEach(async () => {
    await Promise.all(applications.splice(0).map(({ app }) => app.close()));
  });

  it('aplica os timeouts configurados ao servidor HTTP', () => {
    const application = createApplication();
    applications.push(application);
    expect(application.app.server.timeout).toBe(10_000);
    expect(application.app.server.keepAliveTimeout).toBe(72_000);
    expect(application.app.server.requestTimeout).toBe(30_000);
  });

  it('responde liveness sem consultar a prontidão', async () => {
    const application = createApplication();
    applications.push(application);
    const address = await application.app.listen({
      host: '127.0.0.1',
      port: 0,
    });
    const response = await request(`${address}/health`);
    expect(response.statusCode).toBe(200);
    expect(await response.body.json()).toEqual({ status: 'ok' });
    expect(application.check).not.toHaveBeenCalled();
  });

  it('aplica headers do Helmet sem Content-Security-Policy', async () => {
    const application = createApplication();
    applications.push(application);
    const address = await application.app.listen({
      host: '127.0.0.1',
      port: 0,
    });
    const response = await request(`${address}/health`);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-security-policy']).toBeUndefined();
  });

  it('retorna prontidão para cada consulta bem-sucedida', async () => {
    const application = createApplication();
    applications.push(application);
    const address = await application.app.listen({
      host: '127.0.0.1',
      port: 0,
    });
    const firstResponse = await request(`${address}/ready`);
    const secondResponse = await request(`${address}/ready`);
    expect(firstResponse.statusCode).toBe(200);
    expect(await firstResponse.body.json()).toEqual({ status: 'ok' });
    expect(secondResponse.statusCode).toBe(200);
    expect(await secondResponse.body.json()).toEqual({ status: 'ok' });
    expect(application.check).toHaveBeenCalledTimes(2);
  });

  it('sanitiza falhas de prontidão', async () => {
    const application = createApplication(
      vi
        .fn<() => Promise<void>>()
        .mockRejectedValue(new Error('password=secret')),
    );
    applications.push(application);
    const address = await application.app.listen({
      host: '127.0.0.1',
      port: 0,
    });
    const response = await request(`${address}/ready`);
    expect(response.statusCode).toBe(503);
    expect(await response.body.json()).toEqual({
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Serviço indisponível.' },
    });
  });

  it('retorna erro sanitizado para payload excedido', async () => {
    const application = createApplication();
    application.app.post('/payload', async () => ({ status: 'ok' }));
    applications.push(application);
    const address = await application.app.listen({
      host: '127.0.0.1',
      port: 0,
    });
    const response = await request(`${address}/payload`, {
      method: 'POST',
      body: 'a'.repeat(1025),
      headers: { 'content-type': 'text/plain' },
    });
    expect(response.statusCode).toBe(413);
    expect(await response.body.json()).toEqual({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Payload excede o limite permitido.',
      },
    });
  });

  it('retorna erros sanitizados para rota, método e falha interna', async () => {
    const application = createApplication();
    application.app.get('/internal-error', async () => {
      throw new Error('postgresql://user:secret@host/application');
    });
    applications.push(application);
    const address = await application.app.listen({
      host: '127.0.0.1',
      port: 0,
    });
    const missingRoute = await request(`${address}/missing`);
    const wrongMethod = await request(`${address}/health`, { method: 'POST' });
    const internalError = await request(`${address}/internal-error`);
    expect(missingRoute.statusCode).toBe(404);
    expect(await missingRoute.body.json()).toEqual({
      error: { code: 'ROUTE_NOT_FOUND', message: 'Rota não encontrada.' },
    });
    expect(wrongMethod.statusCode).toBe(405);
    expect(await wrongMethod.body.json()).toEqual({
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Método não permitido.' },
    });
    expect(internalError.statusCode).toBe(500);
    expect(await internalError.body.json()).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Erro interno.' },
    });
  });
});
