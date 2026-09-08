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
});
