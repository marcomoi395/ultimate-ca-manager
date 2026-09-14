import { readFileSync } from 'node:fs';
import type { AdapterStatus } from '../common/contracts';

interface EJBCAProbeInit extends RequestInit {
  tls?: { ca: string; cert: string; key: string };
}

export class EjbcaHealthProbe {
  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async check(): Promise<AdapterStatus> {
    const baseUrl = process.env.EJBCA_API_URL;
    if (!baseUrl) return 'unavailable';

    try {
      const response = await this.fetcher(new URL('v1/ca', `${baseUrl.replace(/\/$/, '')}/`), {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(Number(process.env.EJBCA_TIMEOUT_MS ?? '3000')),
        tls: {
          ca: readFileSync(process.env.EJBCA_CA_CERT_FILE ?? '', 'utf8'),
          cert: readFileSync(process.env.EJBCA_CLIENT_CERT_FILE ?? '', 'utf8'),
          key: readFileSync(process.env.EJBCA_CLIENT_KEY_FILE ?? '', 'utf8'),
        },
      } as EJBCAProbeInit);
      return response.ok ? 'healthy' : 'degraded';
    } catch {
      return 'unavailable';
    }
  }
}
