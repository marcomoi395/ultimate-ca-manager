import { describe, expect, it } from 'bun:test';
import { CertificatesService } from '../src/certificates/certificates.service';

describe('CertificatesService', () => {
  it('returns paginated public certificate data', async () => {
    const service = new CertificatesService(async () => [{ id: 'cert-1', status: 'MATCHED' }]);
    const result = await service.list({ page: 1, limit: 10 });
    expect(result.data[0].id).toBe('cert-1');
    expect(result.meta.page).toBe(1);
  });
});
