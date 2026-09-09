import { GoneException } from '@nestjs/common';
import { describe, expect, it } from 'bun:test';
import { CertificatesController } from '../src/certificates/certificates.controller';
describe('certificate routes', () => {
  it('does not forward certificate mutations to another version', async () => {
    const calls: string[] = [];
    const service = {
      issue: async () => { calls.push('issue'); return { ok: true }; },
      revoke: async () => { calls.push('revoke'); return { ok: true }; },
      unhold: async () => { calls.push('unhold'); return { ok: true }; },
      exportFile: async () => { calls.push('export'); return { ok: true }; },
      lint: async () => { calls.push('lint'); return { ok: true }; },
      removed: async () => { calls.push('removed'); return { ok: true }; },
    } as never;
    const controller = new CertificatesController(service);

    await controller.create({ cn: 'example.test', ca_id: 'ca-1' });
    await controller.revoke('cert-1', { reason: 'cessation' });
    await controller.export('cert-1', { format: 'pem' });
    await controller.lint('cert-1', 'rfc5280');

    expect(calls).toEqual(['issue', 'revoke', 'export', 'removed']);
  });

  it('exposes read operations through the certificate service', async () => {
    const calls: string[] = [];
    const service = {
      stats: async () => { calls.push('stats'); return { count: 3 }; },
      compliance: async () => { calls.push('compliance'); return { unsupported: true }; },
      lintStatus: async () => { calls.push('lint-status'); return { unsupported: true }; },
      removed: async () => { calls.push('removed'); return { unsupported: true }; },
      list: async () => { calls.push('list'); return { data: [], meta: {} }; },
      getById: async () => { calls.push('detail'); return { id: 'cert-1' }; },
    } as never;
    const controller = new CertificatesController(service);

    await controller.stats();
    await controller.compliance();
    await controller.lintStatus();
    await controller.list({});
    await controller.detail('cert-1');
    expect(calls).toEqual(['stats', 'removed', 'removed', 'list', 'detail']);
  });
  it('requires read:certificates on list and detail handlers', () => {
    const controller = CertificatesController.prototype;
    expect(Reflect.getMetadata('v3_required_permission', controller.list)).toBe('read:certificates');
    expect(Reflect.getMetadata('v3_required_permission', controller.detail)).toBe('read:certificates');
    expect(Reflect.getMetadata('v3_required_permission', controller.stats)).toBe('read:certificates');
  });
  it('returns stable 410 for gateway-owned removed operations', async () => {
    const controller = new CertificatesController({ removed: async () => { throw new GoneException('GATEWAY_ENDPOINT_REMOVED'); } } as never);
    await expect(controller.compliance()).rejects.toMatchObject({ status: 410 });
    await expect(controller.lintStatus()).rejects.toMatchObject({ status: 410 });
    await expect(controller.lint('cert-1')).rejects.toMatchObject({ status: 410 });
    await expect(controller.rename('cert-1', {})).rejects.toMatchObject({ status: 410 });
    await expect(controller.remove('cert-1')).rejects.toMatchObject({ status: 410 });
    await expect(controller.uploadKey('cert-1', {})).rejects.toMatchObject({ status: 410 });
    await expect(controller.submitToCt('cert-1')).rejects.toMatchObject({ status: 410 });
  });
});
