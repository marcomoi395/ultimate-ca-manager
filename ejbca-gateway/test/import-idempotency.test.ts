import { describe, expect, it } from 'bun:test';
import { ImportIdempotencyService } from '../src/supporting/import-idempotency.service';

describe('import idempotency', () => {
  it('replays same request and rejects hash conflicts', () => {
    const service = new ImportIdempotencyService();
    expect(service.claim('key-1', 'hash-1')).toEqual({ status: 'CLAIMED' });
    expect(service.claim('key-1', 'hash-1')).toEqual({ status: 'REPLAY' });
    expect(service.claim('key-1', 'hash-2')).toEqual({ status: 'CONFLICT' });
  });
});
