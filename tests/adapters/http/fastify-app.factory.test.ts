import { request } from 'undici';
import { afterEach, describe, expect, it } from 'vitest';

import { createFastifyApp } from '../../../src/adapters/http/fastify-app.factory.js';

describe('createFastifyApp', () => {
  const app = createFastifyApp();

  afterEach(async () => {
    await app.close();
  });

  it('responde que a aplicação está saudável', async () => {
    const address = await app.listen({ host: '127.0.0.1', port: 0 });

    const response = await request(`${address}/health`);

    expect(response.statusCode).toBe(200);
    expect(await response.body.json()).toEqual({ status: 'ok' });
  });
});
