import { describe, expect, it } from 'bun:test';
import { CertificateWriteInfrastructure } from '../src/certificates/write-infrastructure';

describe('certificate write infrastructure', () => {
  it('replays public responses and rejects hash conflicts', () => {
    const infra = new CertificateWriteInfrastructure();
    expect(infra.claim('k', 'h')).toEqual({ status: 'CLAIMED' });
    infra.saveResponse('k', { id: '00af12' });
    expect(infra.claim('k', 'h')).toEqual({ status: 'REPLAY', response: { id: '00af12' } });
    expect(infra.claim('k', 'other')).toEqual({ status: 'CONFLICT' });
  });

  it('redacts sensitive audit metadata', () => {
    const infra = new CertificateWriteInfrastructure();
    infra.audit({ actor_id: '7', action: 'issue', correlation_id: 'c', outcome: 'success', metadata: { serial: '00af12', password: 'x', csr: 'y' } });
    expect(infra.audits[0].metadata).toEqual({ serial: '00af12' });
  });
});
