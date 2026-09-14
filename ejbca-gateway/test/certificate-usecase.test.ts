import { describe, expect, it } from 'bun:test';
import { CertificatesService } from '../src/certificates/certificates.service';

describe('certificate use cases', () => {
  it('rejects unknown certificate IDs with NotFound', async () => {
    const service = new CertificatesService(async () => []);
    await expect(service.getById('missing')).rejects.toThrow('not found');
  });
  it('rejects ambiguous serial identities instead of choosing the first match', async () => {
    const service = new CertificatesService(async () => [
      { serial_number: '00af12', issuer_dn: 'CN=CA One' },
      { serial_number: '00af12', issuer_dn: 'CN=CA Two' },
    ]);
    await expect(service.getById('00af12')).rejects.toMatchObject({ status: 409 });
  });
  it('preserves leading zero serials and forwards issuer disambiguation', async () => {
    const queries: URLSearchParams[] = [];
    const service = new CertificatesService({
      getCertificate: async (id: string, issuer?: string) => {
        queries.push(new URLSearchParams({ serial: id, ...(issuer ? { issuer } : {}) }));
        return [{ serial_number: id, issuer_dn: issuer ?? 'CN=CA' }];
      },
    } as never);
    await expect(service.getById('00af12', 'CN=CA')).resolves.toMatchObject({ serial_number: '00af12' });
    expect(queries[0].get('serial')).toBe('00af12');
    expect(queries[0].get('issuer')).toBe('CN=CA');
  });
});
