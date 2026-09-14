import { ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import type { AuthContext } from './contracts';

export const REQUIRED_PERMISSION = 'v3_required_permission';
export const RequirePermission = (permission: string) => SetMetadata(REQUIRED_PERMISSION, permission);

interface PermissionRequest {
  authContext?: AuthContext;
}

@Injectable()
export class PermissionGuard {
  canActivate(context: { getHandler(): object; getClass(): object; switchToHttp(): { getRequest<T>(): T } }): boolean {
    const required = this.readPermission(context.getHandler()) ?? this.readPermission(context.getClass());
    if (!required) return true;
    const request = context.switchToHttp().getRequest<PermissionRequest>();
    const permissions = request.authContext?.permissions ?? [];
    if (permissions.includes('*') || permissions.includes(required)) return true;
    throw new ForbiddenException('Forbidden');
  }

  private readPermission(target: object): string | undefined {
    return Reflect.getMetadata(REQUIRED_PERMISSION, target) as string | undefined;
  }
}
