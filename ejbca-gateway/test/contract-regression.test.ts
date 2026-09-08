import { describe, expect, it } from 'bun:test';
import { CertificatesController } from '../src/certificates/certificates.controller';
import { CertificatesService } from '../src/certificates/certificates.service';
import { EnvelopeInterceptor } from '../src/common/envelope.interceptor';
import { lastValueFrom, of } from 'rxjs';
import { CERTIFICATE_ROUTE_PARITY } from '../src/certificates/contracts';

function adapter() {
  return {
    listCertificates: async () => ({ certificates: [{ id: 'cert-1' }] }),
    getCertificate: async (id: string) => ({ id }),
    getCertificateCount: async () => ({ count: 1 }),
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
      data: [{ id: 'cert-1', serial_number: 'cert-1', subject: null, issuer: null, status: 'valid', has_private_key: false }],
      message: 'ok',
      meta: { page: 1, per_page: 20, total: 1 },
    });
  });
  it('records the v2 parity route outcomes and permission contract', () => {
    expect(CERTIFICATE_ROUTE_PARITY).toEqual({
      readPermission: 'read:certificates',
      removed: [
        'PATCH /certificates/:id',
        'DELETE /certificates/:id',
        'POST /certificates/:id/key',
        'GET /certificates/compliance',
        'GET /certificates/lint/status',
        'GET /certificates/:id/lint',
        'POST /certificates/:id/submit-ct',
      ],
      notImplemented: [
        'POST /certificates',
        'POST /certificates/:id/revoke',
        'POST /certificates/:id/unhold',
        'POST /certificates/:id/renew',
        'POST /certificates/:id/export',
        'POST /certificates/export',
        'POST /certificates/import',
        'POST /certificates/bulk/:operation',
        'POST /certificates/bulk/revoke',
        'POST /certificates/bulk/renew',
        'POST /certificates/bulk/delete',
        'POST /certificates/bulk/export',
      ],
    });
  });
});
