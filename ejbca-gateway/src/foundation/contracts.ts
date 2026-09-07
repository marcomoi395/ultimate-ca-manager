import type { AdapterStatus, V3SuccessEnvelope } from '../common/contracts';

export function healthResponse(gateway: AdapterStatus, ejbca: AdapterStatus): V3SuccessEnvelope<{ gateway: AdapterStatus; store: AdapterStatus; ejbca: AdapterStatus }> {
  return {
    data: { gateway, store: 'healthy', ejbca },
    message: 'ok',
    meta: {},
  };
}

export function contractResponse(): V3SuccessEnvelope<{ contractVersion: string; capabilities: string[] }> {
  return {
    data: { contractVersion: 'v3', capabilities: ['health', 'meta'] },
    message: 'ok',
    meta: {},
  };
}
