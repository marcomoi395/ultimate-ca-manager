import { describe, expect, it } from 'bun:test';
import { CertificatesController } from '../src/certificates/certificates.controller';
import { CertificatesService } from '../src/certificates/certificates.service';
import { EnvelopeInterceptor } from '../src/common/envelope.interceptor';
import { lastValueFrom, of } from 'rxjs';
import { CERTIFICATE_ROUTE_PARITY } from '../src/certificates/contracts';

function adapter() {
  return {
    listCertificates: async (query: URLSearchParams) => query.get('status') === 'CERT_ACTIVE'
      ? { certificates: [{ id: 'cert-1' }] }
      : { certificates: [] },
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
    expect(result).toMatchObject({
      data: [expect.objectContaining({ id: 'cert-1', serial_number: 'cert-1', subject: null, issuer: null, status: 'valid', has_private_key: false })],
      message: 'ok',
      meta: { page: 1, per_page: 20, total: 1 },
    });
  });
  it('records the v2 parity route outcomes and write policies', () => {
    expect(CERTIFICATE_ROUTE_PARITY).toEqual({
      readPermission: 'read:certificates',
      writes: {
        'POST /certificates': { permission: 'write:certificates', operation: 'POST /v1/certificate/enroll' },
        'POST /certificates/:id/revoke': { permission: 'delete:certificates', operation: 'PUT /v1/certificate/:issuer/:serial/revoke' },
        'POST /certificates/:id/unhold': { permission: 'write:certificates', operation: 'PUT /v1/certificate/:issuer/:serial/revoke?reason=REMOVE_FROM_CRL' },
      },
      audit: { required: true, fields: ['actor_id', 'action', 'correlation_id', 'outcome', 'metadata'] },
      idempotency: {
        key: 'Idempotency-Key',
        sameHash: 'replay',
        differentHash: '409',
        concurrency: 'single-claim',
      },
      retry: 'no-automatic-retry-after-side-effect-dispatch',
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
