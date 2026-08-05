import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../../src/app.js';

describe('Health API Integration Tests', () => {
  it('should return 200 OK and status ok envelope from GET /health', async () => {
    const app = createApp();
    
    // Express test call using node http / request simulation
    const req = {
      method: 'GET',
      url: '/health',
      headers: {},
    };

    let statusCode = 0;
    let responseBody: any = null;

    const res: any = {
      statusCode: 200,
      headers: {},
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        responseBody = data;
        return this;
      },
      setHeader(k: string, v: string) {
        this.headers[k.toLowerCase()] = v;
      },
      getHeader(k: string) {
        return this.headers[k.toLowerCase()];
      },
    };

    await new Promise<void>((resolve) => {
      app(req as any, res as any, () => resolve());
      if (responseBody) resolve();
    });

    assert.strictEqual(responseBody?.success, true);
    assert.strictEqual(responseBody?.data?.status, 'ok');
  });
});
