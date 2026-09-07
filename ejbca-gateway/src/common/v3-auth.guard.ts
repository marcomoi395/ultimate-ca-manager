import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminAuthGuard, type AdminAuthRequest } from './admin-auth.guard';

export const PUBLIC_ROUTE = 'v3_public_route';
export const PublicRoute = () => SetMetadata(PUBLIC_ROUTE, true);

@Injectable()
export class V3AuthGuard implements CanActivate {
  private readonly adminGuard: AdminAuthGuard;

  constructor(private readonly reflector: Reflector, token: string) {
    this.adminGuard = new AdminAuthGuard(token);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AdminAuthRequest & { path?: string }>();
    const isPublicPath = request.path === '/api/v3/health' || request.path === '/api/v3/meta/contract';
    const isPublic = isPublicPath || this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;
    request.authContext = this.authorize(request);
    return true;
  }

  authorize(request: AdminAuthRequest & { path?: string }): ReturnType<AdminAuthGuard['authorize']> {
    return this.adminGuard.authorize(request);
  }
}
