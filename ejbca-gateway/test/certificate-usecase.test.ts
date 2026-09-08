import { describe, expect, it } from 'bun:test';
import { CertificatesService } from '../src/certificates/certificates.service';

describe('certificate use cases', () => {
  it('rejects unknown certificate IDs with NotFound', async () => {
    const service = new CertificatesService(async () => []);
    await expect(service.getById('missing')).rejects.toThrow('not found');
  });
});
