import { describe, expect, it } from 'bun:test';
import { EjbcaResourceAdapter } from '../src/integrations/ejbca/resource-adapter';

describe('EJBCA resource adapter', () => {
  it('maps certificate listing to the EJBCA v2 search endpoint', async () => {
    const calls: unknown[][] = [];
    const adapter = new EjbcaResourceAdapter({ request: async (...args) => { calls.push(args); return { ok: true }; } });
    await adapter.listCertificates(new URLSearchParams({ page: '2', limit: '10' }));
    expect(calls).toEqual([['/v2/certificate/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pagination: { current_page: 2, page_size: 10 }, criteria: [], sort_by: 'subject', sort_order: 'asc' }) }]]);
  });
  it('maps certificate count to the EJBCA v2 count endpoint', async () => {
    const calls: unknown[][] = [];
    const adapter = new EjbcaResourceAdapter({ request: async (...args) => { calls.push(args); return { count: 3 }; } });
    await adapter.getCertificateCount();
    expect(calls).toEqual([['/v2/certificate/count']]);
  });
});
