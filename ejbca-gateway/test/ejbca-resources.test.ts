import { describe, expect, it } from 'bun:test';
import { EjbcaResourceAdapter } from '../src/integrations/ejbca/resource-adapter';

describe('EJBCA resource adapter', () => {
  it('maps certificate and CA resource calls to typed methods', async () => {
    const adapter = new EjbcaResourceAdapter({ request: async (path) => ({ path }) });
    expect(await adapter.listCertificates()).toEqual({ path: '/certificates' });
    expect(await adapter.getCa('ca-1')).toEqual({ path: '/cas/ca-1' });
  });
});
