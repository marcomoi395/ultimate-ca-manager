import { describe, expect, it } from 'bun:test';
import { CertificatesController } from '../src/certificates/certificates.controller';
import { CertificatesService } from '../src/certificates/certificates.service';

function adapter() {
  return {
    listCertificates: async () => ({ certificates: [{ id: 'cert-1' }] }),
    getCertificate: async (id: string) => ({ id }),
  } as never;
}

describe('endpoint response contracts', () => {
  it('returns upstream certificate data inside the V3 envelope', async () => {
    const controller = new CertificatesController(new CertificatesService(adapter()));
    await expect(controller.list({})).resolves.toEqual({
      data: { certificates: [{ id: 'cert-1' }] },
      message: 'ok',
      meta: {},
    });
  });
});
