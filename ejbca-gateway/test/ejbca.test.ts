import { describe, expect, it } from 'bun:test';
import { EjbcaClient, normalizeEjbcaError } from '../src/integrations/ejbca/client';

describe('EJBCA client', () => {
  it('normalizes upstream error payloads without credentials', () => {
    const error = normalizeEjbcaError(502, { message: 'bad', password: 'secret' });
    expect(error.error_code).toBe('EJBCA_UPSTREAM_ERROR');
    expect(JSON.stringify(error)).not.toContain('secret');
  });

  it('builds authenticated read requests from configuration', () => {
    const client = new EjbcaClient({ baseUrl: 'https://ejbca.test', username: 'u', password: 'p' });
    expect(client.requestOptions('/ca').headers?.authorization).toBe(`Basic ${Buffer.from('u:p').toString('base64')}`);
  });
});
