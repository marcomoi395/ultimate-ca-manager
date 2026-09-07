import type { AuthContext } from './contracts';

export interface AdminAuthRequest {
  authorization?: string;
  correlationId?: string;
  sourceIp?: string;
  authContext?: AuthContext;
}

export class AdminAuthGuard {
  constructor(private readonly expectedToken: string) {}

  authorize(request: AdminAuthRequest | undefined): AuthContext {
    if (!request || request.authorization !== `Bearer ${this.expectedToken}`) {
      throw new Error('Unauthorized');
    }

    return {
      actorId: 'admin',
      authenticationMethod: 'bearer',
      permissions: ['*'],
      correlationId: request.correlationId ?? crypto.randomUUID(),
      sourceIp: request.sourceIp ?? 'unknown',
      timestamp: new Date().toISOString(),
    };
  }
}
