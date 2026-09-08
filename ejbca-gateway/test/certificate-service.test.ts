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
      data: [{ id: 'cert-1' }],
      meta: { page: 1, per_page: 25, total: 1 },
    });
  });
});
