import { describe, expect, it } from 'bun:test';
import { loadGatewayConfig, redactHeaders } from '../src/common/gateway-config';

describe('gateway configuration', () => {
  it('requires the v2 auth URL and internal secret', () => {
    expect(() => loadGatewayConfig({})).toThrow('UCM_AUTH_BASE_URL');
    expect(() => loadGatewayConfig({ UCM_AUTH_BASE_URL: 'http://ucm' })).toThrow('UCM_INTERNAL_AUTH_SECRET');
  });
  it('redacts authorization headers', () => {
    expect(redactHeaders({ authorization: 'secret', accept: 'json' })).toEqual({ authorization: '[REDACTED]', accept: 'json' });
  });
});
