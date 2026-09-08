import { describe, expect, it } from 'bun:test';
import { CertificatesController } from '../src/certificates/certificates.controller';
import { CertificatesService } from '../src/certificates/certificates.service';
import { EnvelopeInterceptor } from '../src/common/envelope.interceptor';
import { lastValueFrom, of } from 'rxjs';

function adapter() {
  return {
    listCertificates: async () => ({ certificates: [{ id: 'cert-1' }] }),
    getCertificate: async (id: string) => ({ id }),
  } as never;
}

function envelopeContext(statusCode = 200) {
  return { switchToHttp: () => ({ getResponse: () => ({ statusCode }) }) } as never;
}

describe('endpoint response contracts', () => {
  it('wraps upstream certificate data inside the V3 envelope', async () => {
    const controller = new CertificatesController(new CertificatesService(adapter()));
    const raw = await controller.list({});
    const result = await lastValueFrom(
      new EnvelopeInterceptor().intercept(envelopeContext(), { handle: () => of(raw) } as never),
    );
    expect(result).toEqual({
      data: { certificates: [{ id: 'cert-1' }] },
      message: 'ok',
      meta: {},
    });
  });
});
