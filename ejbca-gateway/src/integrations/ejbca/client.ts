import type { V3Error } from '../../common/contracts';

export interface EjbcaConfig {
  baseUrl: string;
  username: string;
  password: string;
  timeoutMs?: number;
}

export function normalizeEjbcaError(status: number, payload: unknown): V3Error {
  let detail = 'EJBCA request failed';
  if (typeof payload === 'object' && payload !== null && 'message' in payload) {
    const message = payload.message;
    if (typeof message === 'string') detail = message;
  }
  return {
    error: 'EJBCA upstream error',
    message: detail,
    code: `EJBCA_${status}`,
    detail: `upstream status ${status}`,
    error_code: 'EJBCA_UPSTREAM_ERROR',
  };
}

export class EjbcaClient {
  constructor(private readonly config: EjbcaConfig) {}

  requestOptions(path: string): RequestInit & { url: string } {
    return {
      url: new URL(path, this.config.baseUrl).toString(),
      headers: {
        authorization: `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`,
        accept: 'application/json',
      },
      signal: AbortSignal.timeout(this.config.timeoutMs ?? 10_000),
    };
  }
}
