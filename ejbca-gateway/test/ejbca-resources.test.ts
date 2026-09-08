import { describe, expect, it } from 'bun:test';
import { EjbcaResourceAdapter } from '../src/integrations/ejbca/resource-adapter';

describe('EJBCA resource adapter', () => {
  it('maps certificate listing to the EJBCA search endpoint', async () => {
    const calls: unknown[][] = [];
    const adapter = new EjbcaResourceAdapter({ request: async (...args) => { calls.push(args); return { ok: true }; } });
    await adapter.listCertificates(new URLSearchParams({ page: '2', limit: '10' }));
    expect(calls).toEqual([['/v1/certificate/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ max_number_of_results: 10, criteria: [{ field: 'STATUS', value: 'CERT_ACTIVE' }] }) }]]);
  });
});
