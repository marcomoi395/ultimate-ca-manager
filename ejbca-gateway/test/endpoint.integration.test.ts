import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('V3 endpoint integration', () => {
  let app: INestApplication;
  let baseUrl = '';

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api/v3');
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => app.close());

  it('serves public health and protects business routes', async () => {
    const health = await fetch(`${baseUrl}/api/v3/health`);
    const certificates = await fetch(`${baseUrl}/api/v3/certificates`);
    expect(health.status).toBe(200);
    expect(certificates.status).toBe(401);
  });
});
