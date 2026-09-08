import { describe, expect, it } from 'bun:test';
import { CertificatesService } from '../src/certificates/certificates.service';

describe('CertificatesService', () => {
  it('returns paginated public certificate data', async () => {
    const service = new CertificatesService(async () => [{ id: 'cert-1', status: 'MATCHED' }]);
    const result = await service.list({ page: 1, limit: 10 });
    expect(result.data[0].id).toBe('cert-1');
    expect(result.meta.page).toBe(1);
  });
  it('uses the EJBCA count endpoint for stats', async () => {
    const calls: string[] = [];
    const adapter = { getCertificateCount: async () => { calls.push('/v2/certificate/count'); return { count: 3 }; } } as never;
    const service = new CertificatesService(adapter);
    await service.stats();
    expect(calls).toEqual(['/v2/certificate/count']);
  });
  it('does not proxy certificate reads through UCM v2', async () => {
    const adapter = {
      listCertificates: async () => ({ certificates: [{ id: 'cert-1' }] }),
    } as never;
    const service = new CertificatesService(adapter);
    await expect(service.list({ page: 1, limit: 25 })).resolves.toEqual({
      data: [{ id: 'cert-1', serial_number: 'cert-1', subject: null, issuer: null, status: 'valid', has_private_key: false }],
      meta: { page: 1, per_page: 25, total: 1 },
    });
  });
  it('maps EJBCA records to a safe v2-compatible public shape', async () => {
    const service = new CertificatesService(async () => [{
      serial_number: '00af12',
      subject_dn: 'CN=example.com',
      issuer_dn: 'CN=Example CA',
      status: 'CERT_ACTIVE',
      certificate_data: 'PRIVATE-RAW-CERT',
      private_key: 'PRIVATE-KEY',
    }]);
    const result = await service.list({ page: 1, limit: 10 });
    expect(result.data[0]).toEqual(expect.objectContaining({
      id: '00af12',
      serial_number: '00af12',
      subject: 'CN=example.com',
      issuer: 'CN=Example CA',
      status: 'valid',
      has_private_key: false,
    }));
    expect(result.data[0]).not.toHaveProperty('private_key');
    expect(result.data[0]).not.toHaveProperty('certificate_data');
  });
});
