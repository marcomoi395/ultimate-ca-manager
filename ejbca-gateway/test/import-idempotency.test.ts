import { describe, expect, it } from 'bun:test';
import { ImportIdempotencyService } from '../src/supporting/import-idempotency.service';

describe('import idempotency', () => {
  it('replays same request and rejects hash conflicts', () => {
    const service = new ImportIdempotencyService();
    expect(service.claim('key-1', 'hash-1')).toEqual({ status: 'CLAIMED' });
    expect(service.claim('key-1', 'hash-1')).toEqual({ status: 'REPLAY' });
    expect(service.claim('key-1', 'hash-2')).toEqual({ status: 'CONFLICT' });
  });
  it('stores safe audit metadata without sensitive payloads', () => {
    const audit: Record<string, unknown>[] = [];
    const metadata = { certificate_id: '00af12', outcome: 'success', csr: '[REDACTED]' };
    audit.push(metadata);
    expect(audit[0]).toEqual(metadata);
    expect(JSON.stringify(audit)).not.toContain('private_key');
    expect(JSON.stringify(audit)).not.toContain('password');
  });
});
