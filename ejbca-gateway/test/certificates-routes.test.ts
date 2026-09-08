import { describe, expect, it } from 'bun:test';
import { CertificatesController } from '../src/certificates/certificates.controller';

describe('certificate routes', () => {
  it('forwards frontend mutation contracts', async () => {
    const calls: unknown[][] = [];
    const service = {
      mutate: async (...args: unknown[]) => { calls.push(args); return { data: { ok: true } }; },
      lint: async (...args: unknown[]) => { calls.push(['lint', ...args]); return { data: [] }; },
    } as never;
    const controller = new CertificatesController(service);

    await controller.create({ cn: 'example.test', ca_id: 'ca-1' });
    await controller.rename('cert/1', { descr: 'updated' });
    await controller.revoke('cert-1', { reason: 'cessation' });
    await controller.unhold('cert-1');
    await controller.renew('cert-1');
    await controller.export('cert-1', { format: 'pem', include_key: false });
    await controller.exportAll({ format: 'pem' });
    await controller.uploadKey('cert-1', { key: 'PEM', passphrase: null });
    await controller.submitToCt('cert-1');
    await controller.bulk('revoke', { ids: ['cert-1'], reason: 'unspecified' });
    await controller.remove('cert-1');
    await controller.lint('cert-1', 'rfc5280');

    expect(calls).toEqual([
      ['/v1/certificate', 'POST', { cn: 'example.test', ca_id: 'ca-1' }],
      ['/v1/certificate/cert%2F1', 'PATCH', { descr: 'updated' }],
      ['/v1/certificate/cert-1/revoke', 'POST', { reason: 'cessation' }],
      ['/v1/certificate/cert-1/unhold', 'POST', undefined],
      ['/v1/certificate/cert-1/renew', 'POST', undefined],
      ['/v1/certificate/cert-1/export', 'POST', { format: 'pem', include_key: false }],
      ['/v1/certificate/export', 'POST', { format: 'pem' }],
      ['/v1/certificate/cert-1/key', 'POST', { key: 'PEM', passphrase: null }],
      ['/v1/certificate/cert-1/submit-ct', 'POST', undefined],
      ['/v1/certificate/bulk/revoke', 'POST', { ids: ['cert-1'], reason: 'unspecified' }],
      ['/v1/certificate/cert-1', 'DELETE', undefined],
      ['lint', 'cert-1', 'rfc5280'],
    ]);
  });
});
