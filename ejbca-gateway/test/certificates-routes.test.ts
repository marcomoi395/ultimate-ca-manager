import { describe, expect, it } from 'bun:test';
import { CertificatesController } from '../src/certificates/certificates.controller';

describe('certificate routes', () => {
  it('does not forward certificate mutations to another version', async () => {
    const calls: string[] = [];
    const service = {
      mutate: async () => { calls.push('mutate'); return { ok: true }; },
      exportFile: async () => { calls.push('export'); return { ok: true }; },
      lint: async () => { calls.push('lint'); return { ok: true }; },
    } as never;
    const controller = new CertificatesController(service);

    await controller.create({ cn: 'example.test', ca_id: 'ca-1' });
    await controller.revoke('cert-1', { reason: 'cessation' });
    await controller.export('cert-1', { format: 'pem' });
    await controller.lint('cert-1', 'rfc5280');

    expect(calls).toEqual(['mutate', 'mutate', 'export', 'lint']);
  });

  it('exposes read operations through the certificate service', async () => {
    const calls: string[] = [];
    const service = {
      stats: async () => { calls.push('stats'); return { count: 3 }; },
      compliance: async () => { calls.push('compliance'); return { unsupported: true }; },
      lintStatus: async () => { calls.push('lint-status'); return { unsupported: true }; },
      list: async () => { calls.push('list'); return { data: [], meta: {} }; },
      getById: async () => { calls.push('detail'); return { id: 'cert-1' }; },
    } as never;
    const controller = new CertificatesController(service);

    await controller.stats();
    await controller.compliance();
    await controller.lintStatus();
    await controller.list({});
    await controller.detail('cert-1');

    expect(calls).toEqual(['stats', 'compliance', 'lint-status', 'list', 'detail']);
  });
});
