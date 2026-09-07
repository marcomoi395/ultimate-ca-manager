import { describe, expect, it } from 'bun:test';
import { normalizeIdentity, resolveMapping } from '../src/mappings/resolver';

describe('mapping resolver', () => {
  it('normalizes canonical identities deterministically', () => expect(normalizeIdentity('  CN=Root   CA ')).toBe('cn=root ca'));
  it('does not choose among duplicate mappings', () => {
    const records = [
      { resourceType: 'ca', ucmId: '1', canonicalId: 'a', status: 'MATCHED' as const },
      { resourceType: 'ca', ucmId: '1', canonicalId: 'b', status: 'DUPLICATE' as const },
    ];
    expect(resolveMapping(records, 'ca', '1')).toBeUndefined();
  });
});
