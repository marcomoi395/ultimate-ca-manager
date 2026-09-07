import { describe, expect, it } from 'bun:test';
import { PermissionGuard, RequirePermission } from '../src/common/permission.guard';

describe('PermissionGuard', () => {
  it('rejects an authenticated actor without the required permission', () => {
    const handler = () => undefined;
    RequirePermission('certificates:read')(handler);
    const guard = new PermissionGuard();
    const context = {
      getHandler: () => handler,
      getClass: () => class Route {},
      switchToHttp: () => ({ getRequest: () => ({ authContext: { permissions: [] } }) }),
    } as never;
    expect(() => guard.canActivate(context)).toThrow('Forbidden');
  });
});
