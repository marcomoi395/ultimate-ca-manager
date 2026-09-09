import { describe, expect, it } from 'bun:test';
import { CertificatesService } from '../src/certificates/certificates.service';

describe('CertificatesService', () => {
  it('returns paginated public certificate data', async () => {
    const service = new CertificatesService(async () => [{ id: 'cert-1', status: 'MATCHED' }]);
    const result = await service.list({ page: 1, limit: 10 });
    expect(result.data[0].id).toBe('cert-1');
    expect(result.meta.page).toBe(1);
  });
  it('computes statistics from certificate records', async () => {
    const calls: string[] = [];
    const adapter = {
      listCertificates: async () => { calls.push('list'); return { certificates: [{ valid_to: '2099-01-01T00:00:00Z' }] }; },
    } as never;
    const service = new CertificatesService(adapter);
    await expect(service.stats()).resolves.toEqual({ total: 1, valid: 1, expiring: 0, expired: 0, revoked: 0, sources: ['manual'] });
    expect(calls).toEqual(['list']);
  });
  it('does not proxy certificate reads through UCM v2', async () => {
    const adapter = {
      listCertificates: async () => ({ certificates: [{ id: 'cert-1' }] }),
    } as never;
    const service = new CertificatesService(adapter);
    await expect(service.list({ page: 1, limit: 25 })).resolves.toMatchObject({
      data: [expect.objectContaining({ id: 'cert-1', serial_number: 'cert-1', subject: null, issuer: null, status: 'valid', has_private_key: false })],
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
  it('computes v2-compatible status counts and normalized sources', async () => {
    const service = new CertificatesService(async () => [
      { serial_number: 'valid', valid_to: '2099-01-01T00:00:00Z', source: null },
      { serial_number: 'expiring', valid_to: new Date(Date.now() + 10 * 86400000).toISOString(), source: 'ejbca' },
      { serial_number: 'expired', valid_to: '2020-01-01T00:00:00Z', source: 'manual' },
      { serial_number: 'revoked', valid_to: '2099-01-01T00:00:00Z', revoked: true, source: 'ejbca' },
    ]);
    await expect(service.stats()).resolves.toEqual({
      total: 4, valid: 1, expiring: 1, expired: 1, revoked: 1, sources: ['ejbca', 'manual'],
    });
  });
});
