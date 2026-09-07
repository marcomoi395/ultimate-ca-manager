import { describe, expect, it } from 'bun:test';
import { SqliteGatewayStore } from '../src/persistence/sqlite-store';

describe('SQLite gateway store', () => {
  it('persists mappings across store instances using the same database', () => {
    const first = new SqliteGatewayStore(':memory:');
    first.save({ resourceType: 'certificate', ucmId: 'cert-1', canonicalId: 'serial-1', status: 'MATCHED' });
    expect(first.find('certificate', 'cert-1')?.canonicalId).toBe('serial-1');
    first.close();
  });
});
