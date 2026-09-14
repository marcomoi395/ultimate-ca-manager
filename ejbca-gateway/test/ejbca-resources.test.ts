import { describe, expect, it } from 'bun:test';
import { EjbcaResourceAdapter } from '../src/integrations/ejbca/resource-adapter';

describe('EJBCA resource adapter', () => {
  it('maps certificate listing to the EJBCA v2 search endpoint', async () => {
    const calls: unknown[][] = [];
    const adapter = new EjbcaResourceAdapter({ request: async (...args) => { calls.push(args); return { ok: true }; } });
    await adapter.listCertificates(new URLSearchParams({ page: '2', limit: '10' }));
    expect(calls).toEqual([['/v2/certificate/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pagination: { current_page: 2, page_size: 10 }, criteria: [{ property: 'STATUS', operation: 'EQUAL', value: 'CERT_ACTIVE' }], sort_by: 'subject', sort_order: 'asc' }) }]]);
  });
  it('maps certificate count to the EJBCA v2 count endpoint', async () => {
    const calls: unknown[][] = [];
    const adapter = new EjbcaResourceAdapter({ request: async (...args) => { calls.push(args); return { count: 3 }; } });
    await adapter.getCertificateCount();
    expect(calls).toEqual([['/v2/certificate/count']]);
  });
  it('maps certificate detail to v2 search with SERIAL_NUMBER', async () => {
    const calls: unknown[][] = [];
    const adapter = new EjbcaResourceAdapter({ request: async (...args) => { calls.push(args); return { ok: true }; } });
    await adapter.getCertificate('ABC');
    expect(calls).toEqual([['/v2/certificate/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pagination: { current_page: 1, page_size: 100 }, criteria: [{ property: 'SERIAL_NUMBER', operation: 'EQUAL', value: 'ABC' }], sort_by: 'subject', sort_order: 'asc' }) }]]);
  });
  it('maps certificate status verification to EJBCA revocationstatus', async () => {
    const calls: unknown[][] = [];
    const adapter = new EjbcaResourceAdapter({ request: async (...args) => { calls.push(args); return { revoked: false }; } });
    await adapter.getRevocationStatus('CN=Example CA,O=Example', '00af12');
    expect(calls).toEqual([['/v1/certificate/CN%3DExample%20CA%2CO%3DExample/00af12/revocationstatus']]);
  });
  it('maps CA certificate-chain download to the EJBCA CA endpoint', async () => {
    const calls: unknown[][] = [];
    const adapter = new EjbcaResourceAdapter({ request: async (...args) => { calls.push(args); return Buffer.from('chain'); } });
    await adapter.getCertificateChain('CN=Example CA,O=Example');
    expect(calls).toEqual([['/v1/ca/CN%3DExample%20CA%2CO%3DExample/certificate/download']]);
  });

  it('maps client-generated-key enrollment to the verified EJBCA endpoint', async () => {
    const calls: unknown[][] = [];
    const adapter = new EjbcaResourceAdapter({ request: async (...args) => { calls.push(args); return { ok: true }; } });
    const body = {
      certificate_request: 'DER_BASE64_CSR',
      certificate_request_type: 'PKCS10',
      include_chain: true,
      response_format: 'DER',
      end_entity: {
        username: 'enroll-user',
        password: 'secret',
        subject_dn: 'CN=import.example.test',
        ca_name: 'ManagementCA',
        certificate_profile_name: 'TLS',
        end_entity_profile_name: 'Default',
        token: 'USERGENERATED',
        status: 'NEW',
      },
    };

    await adapter.issueCertificate(body);

    expect(calls).toEqual([['/v1/certificate/enroll', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }]]);
  });
});
