import Fastify from 'fastify';

export function createFastifyApp() {
  const app = Fastify();

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}
