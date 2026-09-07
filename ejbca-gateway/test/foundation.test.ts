import { describe, expect, it } from 'bun:test';
import { GatewayStore } from '../src/persistence/store';
import { healthResponse, contractResponse } from '../src/foundation/contracts';

describe('gateway persistence and foundation', () => {
  it('stores mappings without secrets and reports health', () => {
    const store = new GatewayStore();
    store.save({ resourceType: 'ca', ucmId: '1', canonicalId: 'ca-1', status: 'MATCHED' });
    expect(store.find('ca', '1')?.status).toBe('MATCHED');
    expect(healthResponse('healthy', 'degraded').data.gateway).toBe('healthy');
  });
  it('exposes contract metadata', () => expect(contractResponse().data.contractVersion).toBe('v3'));
});
