import { describe, expect, it } from 'bun:test';
import { EjbcaClient, normalizeEjbcaError } from '../src/integrations/ejbca/client';

describe('EJBCA client', () => {
  it('normalizes upstream error payloads without credentials', () => {
    const error = normalizeEjbcaError(502, { message: 'bad', password: 'secret' });
    expect(error.error_code).toBe('EJBCA_UPSTREAM_ERROR');
    expect(JSON.stringify(error)).not.toContain('secret');
  });

  it('builds authenticated request options without exposing credentials', () => {
    const client = new EjbcaClient({ baseUrl: 'https://ejbca.test', timeoutMs: 5000 });
    const options = client.requestOptions('/ca');
    expect(options.url).toBe('https://ejbca.test/ca');
    expect(options.headers?.authorization).toBeUndefined();
  });
});
