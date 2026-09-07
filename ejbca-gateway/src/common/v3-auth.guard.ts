import { CanActivate, ExecutionContext, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { V2AuthClient, type V2AuthRequest } from './v2-auth.client';
import type { AuthContext } from './contracts';

export const PUBLIC_ROUTE = 'v3_public_route';
export const PublicRoute = () => SetMetadata(PUBLIC_ROUTE, true);

@Injectable()
export class V3AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authClient: V2AuthClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<V2AuthRequest & { path?: string; authContext?: AuthContext }>();
    const isPublicPath = request.path === '/api/v3/health' || request.path === '/api/v3/meta/contract';
    const isPublic = isPublicPath || this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;
    const hasApiKey = typeof request.headers?.['x-api-key'] === 'string';
    const hasCookie = typeof request.headers?.cookie === 'string';
    if (!hasApiKey && !hasCookie) throw new UnauthorizedException('Unauthorized');
    request.authContext = await this.authorize(request);
    return true;
  }

  authorize(request: V2AuthRequest): Promise<AuthContext> {
    return this.authClient.authorize(request);
  }
}
