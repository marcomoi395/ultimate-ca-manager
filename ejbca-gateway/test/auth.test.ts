import { describe, expect, it } from 'bun:test';
import { AdminAuthGuard } from '../src/common/admin-auth.guard';

describe('AdminAuthGuard', () => {
  it('rejects requests without the configured bearer token', () => {
    const guard = new AdminAuthGuard('secret');
    expect(() => guard.authorize(undefined)).toThrow('Unauthorized');
  });

  it('derives trusted actor context for an allowed request', () => {
    const guard = new AdminAuthGuard('secret');
    const context = guard.authorize({
      authorization: 'Bearer secret',
      correlationId: 'corr-123',
      sourceIp: '127.0.0.1',
    });
    expect(context.actorId).toBe('admin');
    expect(context.correlationId).toBe('corr-123');
  });
});
