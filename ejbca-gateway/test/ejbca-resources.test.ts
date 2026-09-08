import { describe, expect, it } from 'bun:test';
import { EjbcaResourceAdapter } from '../src/integrations/ejbca/resource-adapter';

describe('EJBCA resource adapter', () => {
  it('maps gateway resources to EJBCA v1 paths', async () => {
    const paths: string[] = [];
    const adapter = new EjbcaResourceAdapter({ request: async (path) => { paths.push(path); return { path }; } });
    await adapter.listCertificates();
    await adapter.getCa('ca-1');
    expect(paths).toEqual(['/v1/certificate', '/v1/ca/ca-1']);
  });
});
