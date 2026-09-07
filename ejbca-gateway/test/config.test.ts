import { describe, expect, it } from 'bun:test';
import { loadGatewayConfig, redactHeaders } from '../src/common/gateway-config';

describe('gateway configuration', () => {
  it('requires the admin token and EJBCA URL', () => {
    expect(() => loadGatewayConfig({})).toThrow('EJBCA_API_URL');
  });
  it('redacts authorization headers', () => {
    expect(redactHeaders({ authorization: 'secret', accept: 'json' })).toEqual({ authorization: '[REDACTED]', accept: 'json' });
  });
});
