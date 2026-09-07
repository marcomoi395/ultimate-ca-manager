import { describe, expect, it } from 'bun:test';
import { EjbcaHttpClient } from '../src/integrations/ejbca/http-client';

describe('EJBCA HTTP client', () => {
  it('does not retry side-effect requests', async () => {
    let calls = 0;
    const client = new EjbcaHttpClient({ baseUrl: 'https://ejbca.test', username: 'u', password: 'p', fetcher: async () => { calls += 1; return new Response('bad', { status: 503 }); } });
    await expect(client.request('/import', { method: 'POST' })).rejects.toThrow();
    expect(calls).toBe(1);
  });
});
