import { UnauthorizedException } from '@nestjs/common';
import type { AuthContext } from './contracts';

interface IntrospectionResponse {
  data?: {
    authenticated?: boolean;
    user?: { id?: string | number; username?: string };
    auth_method?: string;
    permissions?: string[];
  };
}

export interface V2AuthRequest {
  headers?: Record<string, string | string[] | undefined>;
  correlationId?: string;
  sourceIp?: string;
}

interface AuthFetchInit extends RequestInit {
  tls?: { rejectUnauthorized?: boolean };
}

export class V2AuthClient {
  constructor(
    private readonly baseUrl: string,
    private readonly internalSecret: string,
    private readonly fetcher: typeof fetch = fetch,
    private readonly rejectUnauthorized = true,
  ) {}

  async authorize(request: V2AuthRequest): Promise<AuthContext> {
    const headers: Record<string, string> = {
      accept: 'application/json',
      'x-ucm-internal-auth': this.internalSecret,
    };
    for (const name of ['x-api-key', 'cookie']) {
      const value = request.headers?.[name];
      if (typeof value === 'string') headers[name] = value;
    }

    const response = await this.fetcher(new URL('/internal/auth/introspect', this.baseUrl), {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(10_000),
      tls: { rejectUnauthorized: this.rejectUnauthorized },
    } as AuthFetchInit);
    if (!response.ok) throw new UnauthorizedException('Unauthorized');

    const payload = await response.json() as IntrospectionResponse;
    const data = payload.data;
    if (!data?.authenticated || data.user?.id === undefined || !data.auth_method || !Array.isArray(data.permissions)) {
      throw new UnauthorizedException('Unauthorized');
    }

    return {
      actorId: String(data.user.id),
      authenticationMethod: data.auth_method,
      permissions: data.permissions,
      correlationId: request.correlationId ?? crypto.randomUUID(),
      sourceIp: request.sourceIp ?? 'unknown',
      timestamp: new Date().toISOString(),
    };
  }
}
