import { describe, expect, it } from 'bun:test';
import { CertificatesService } from '../src/certificates/certificates.service';

describe('certificate use cases', () => {
  it('returns a missing result for unknown certificate IDs', async () => {
    const service = new CertificatesService(async () => []);
    await expect(service.getById('missing')).resolves.toEqual({ status: 'MISSING' });
  });
});
