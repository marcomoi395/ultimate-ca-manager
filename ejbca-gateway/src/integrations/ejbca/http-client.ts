import { normalizeEjbcaError } from './client';

export interface EjbcaHttpConfig {
  baseUrl: string;
  username: string;
  password: string;
  timeoutMs?: number;
  fetcher?: typeof fetch;
}

export class EjbcaHttpClient {
  private readonly fetcher: typeof fetch;

  constructor(private readonly config: EjbcaHttpConfig) {
    this.fetcher = config.fetcher ?? fetch;
  }

  async request(path: string, init: RequestInit = {}): Promise<unknown> {
    const method = (init.method ?? 'GET').toUpperCase();
    const attempts = method === 'GET' ? 2 : 1;
    let response: Response | undefined;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        response = await this.fetcher(new URL(path, this.config.baseUrl), {
          ...init,
          method,
          headers: {
            accept: 'application/json',
            authorization: `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`,
            ...init.headers,
          },
          signal: AbortSignal.timeout(this.config.timeoutMs ?? 10_000),
        });
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
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  private async safeBody(response: Response): Promise<unknown> {
    try {
      return await this.parseBody(response);
    } catch {
      return undefined;
    }
  }
}
