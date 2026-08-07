import helmet from '@fastify/helmet';
import Fastify from 'fastify';

import type { CheckReadinessUseCase } from '../../application/check-readiness.use-case.js';
import type { HttpErrorResponse } from '../../contracts/http/http-error.types.js';
import { HttpErrorCode } from '../../contracts/http/http-error.types.js';
import type { HttpServerConfiguration } from '../../contracts/http/http-server-configuration.types.js';

export function createFastifyApp(
  configuration: HttpServerConfiguration,
  checkReadiness: CheckReadinessUseCase,
) {
  const app = Fastify({
    bodyLimit: configuration.bodyLimitBytes,
    connectionTimeout: configuration.connectionTimeoutMilliseconds,
    keepAliveTimeout: configuration.keepAliveTimeoutMilliseconds,
    logger: false,
    requestTimeout: configuration.requestTimeoutMilliseconds,
  });

  app.register(helmet, { contentSecurityPolicy: false });

  app.setErrorHandler((error, _request, reply) => {
    const httpError = toHttpError(error);
    reply.status(httpError.statusCode).send(httpError.body);
  });

  app.setNotFoundHandler((request, reply) => {
    const path = request.url.split('?')[0];
    const isKnownRoute = path === '/health' || path === '/ready';
    const error = isKnownRoute
      ? createHttpError(
          405,
          HttpErrorCode.methodNotAllowed,
          'Método não permitido.',
        )
      : createHttpError(
          404,
          HttpErrorCode.routeNotFound,
          'Rota não encontrada.',
        );

    reply.status(error.statusCode).send(error.body);
  });

  app.get('/health', async () => ({ status: 'ok' }));

  app.get('/ready', async (_request, reply) => {
    try {
      await checkReadiness.execute();
      return { status: 'ok' };
    } catch {
      const error = createHttpError(
        503,
        HttpErrorCode.serviceUnavailable,
        'Serviço indisponível.',
      );
      return reply.status(error.statusCode).send(error.body);
    }
  });

  return app;
}

function toHttpError(error: unknown): {
  statusCode: number;
  body: HttpErrorResponse;
} {
  if (hasStatusCode(error, 413)) {
    return createHttpError(
      413,
      HttpErrorCode.payloadTooLarge,
      'Payload excede o limite permitido.',
    );
  }

  if (hasStatusCode(error, 400)) {
    return createHttpError(
      400,
      HttpErrorCode.invalidRequest,
      'Requisição inválida.',
    );
  }

  return createHttpError(500, HttpErrorCode.internalError, 'Erro interno.');
}

function hasStatusCode(error: unknown, statusCode: number): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    error.statusCode === statusCode
  );
}

function createHttpError(
  statusCode: number,
  code: HttpErrorCode,
  message: string,
): { statusCode: number; body: HttpErrorResponse } {
  return { statusCode, body: { error: { code, message } } };
}
