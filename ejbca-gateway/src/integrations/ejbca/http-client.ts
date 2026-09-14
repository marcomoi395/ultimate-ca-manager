import { readFileSync } from 'node:fs';
import { normalizeEjbcaError } from './client';

export interface EjbcaHttpConfig {
  baseUrl: string;
  caCertFile: string;
  clientCertFile: string;
  clientKeyFile: string;
  timeoutMs?: number;
  fetcher?: typeof fetch;
}

interface BunTlsRequestInit extends RequestInit {
  tls: { ca: string; cert: string; key: string };
}

export class EjbcaHttpClient {
  private readonly fetcher: typeof fetch;
  private readonly tls: BunTlsRequestInit['tls'];

  constructor(private readonly config: EjbcaHttpConfig) {
    this.fetcher = config.fetcher ?? fetch;
    this.tls = {
      ca: readFileSync(config.caCertFile, 'utf8'),
      cert: readFileSync(config.clientCertFile, 'utf8'),
      key: readFileSync(config.clientKeyFile, 'utf8'),
    };
  }

  async request(path: string, init: RequestInit = {}): Promise<unknown> {
    const method = (init.method ?? 'GET').toUpperCase();
    const attempts = method === 'GET' ? 2 : 1;
    let response: Response | undefined;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const headers = new Headers(init.headers);
        if (!headers.has('accept')) headers.set('accept', '*/*');
        response = await this.fetcher(new URL(path.replace(/^\/+/, ''), `${this.config.baseUrl.replace(/\/$/, '')}/`), {
          ...init,
          method,
          headers,
          signal: AbortSignal.timeout(this.config.timeoutMs ?? 10_000),
          tls: this.tls,
        } as BunTlsRequestInit);
      } catch (error) {
        if (attempt + 1 === attempts) throw error;
        continue;
      }

      if (response.ok) return this.parseBody(response);
      if (response.status < 500 || attempt + 1 === attempts) {
        throw normalizeEjbcaError(response.status, await this.safeBody(response));
      }
    }

    throw new Error('EJBCA request failed');
  }

  private async parseBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/octet-stream') || contentType.includes('application/pkcs') || contentType.includes('application/x-pem-file')) {
      return new Uint8Array(await response.arrayBuffer());
    }
    const text = await response.text();
    if (!text) return null;
    if (contentType.includes('text/html') || /^\s*<!doctype html/i.test(text) || /^\s*<html/i.test(text)) {
      throw normalizeEjbcaError(502, { message: 'EJBCA returned HTML instead of JSON' });
    }
    try { return JSON.parse(text) as unknown; } catch { return text; }
  }


  private async safeBody(response: Response): Promise<unknown> {
    try {
      return await this.parseBody(response);
    } catch {
      return undefined;
    }
  }
}
