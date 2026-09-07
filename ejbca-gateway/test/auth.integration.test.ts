import { describe, expect, it } from 'bun:test';
import { Reflector } from '@nestjs/core';
import { V3AuthGuard } from '../src/common/v3-auth.guard';

describe('V3AuthGuard', () => {
  it('allows public foundation routes without credentials', () => {
    const guard = new V3AuthGuard(new Reflector(), 'secret');
    expect(guard.canActivate({ getHandler: () => () => undefined, getClass: () => class Health {}, switchToHttp: () => ({ getRequest: () => ({ path: '/api/v3/health' }) }) } as never)).toBe(true);
  });

  it('rejects protected routes without a valid bearer token', () => {
    const guard = new V3AuthGuard(new Reflector(), 'secret');
    expect(() => guard.authorize({ authorization: undefined, path: '/api/v3/certificates' })).toThrow('Unauthorized');
  });
});
