import type { V3Error } from '../../common/contracts';

export interface EjbcaConfig {
  baseUrl: string;
  timeoutMs?: number;
}

export function normalizeEjbcaError(status: number, payload: unknown): V3Error {
  const detail = errorMessage(payload) ?? 'EJBCA request failed';
  return {
    error: 'EJBCA upstream error',
    message: detail,
    code: `EJBCA_${status}`,
    detail: `upstream status ${status}`,
    error_code: 'EJBCA_UPSTREAM_ERROR',
  };
}

function errorMessage(payload: unknown): string | undefined {
  if (typeof payload !== 'object' || payload === null) return undefined;
  const value = payload as Record<string, unknown>;
  for (const key of ['message', 'error_message', 'detail']) {
    if (typeof value[key] === 'string' && value[key].trim()) return value[key] as string;
  }
  return undefined;
}

export class EjbcaClient {
  constructor(private readonly config: EjbcaConfig) {}

  requestOptions(path: string): RequestInit & { url: string } {
    return {
      url: new URL(path, this.config.baseUrl).toString(),
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(this.config.timeoutMs ?? 10_000),
    };
  }
}
