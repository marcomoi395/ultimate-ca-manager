import { describe, expect, it } from 'bun:test';
import { Reflector } from '@nestjs/core';
import { V3AuthGuard } from '../src/common/v3-auth.guard';
import { V2AuthClient } from '../src/common/v2-auth.client';

describe('V3AuthGuard', () => {
  it('allows public foundation routes without credentials', async () => {
    const client = new V2AuthClient('http://auth.test', 'secret', fetch);
    const guard = new V3AuthGuard(new Reflector(), client);
    expect(await guard.canActivate({ getHandler: () => () => undefined, getClass: () => class Health {}, switchToHttp: () => ({ getRequest: () => ({ path: '/api/v3/health' }) }) } as never)).toBe(true);
  });

  it('forwards v2 credentials and maps the introspection result', async () => {
    let received: RequestInit | undefined;
    const fetcher = async (_input: RequestInfo | URL, init?: RequestInit) => {
      received = init;
      return new Response(JSON.stringify({ data: { authenticated: true, user: { id: 7, username: 'alice' }, auth_method: 'api_key', permissions: ['read:cas'] } }), { status: 200 });
    };
    const client = new V2AuthClient('http://auth.test', 'secret', fetcher);
    const context = await client.authorize({ headers: { 'x-api-key': 'ucm_ak_test', cookie: 'session_id=abc' }, sourceIp: '127.0.0.1', correlationId: 'corr' });
    expect(context.actorId).toBe('7');
    expect(context.permissions).toEqual(['read:cas']);
    expect(received?.headers).toEqual({ accept: 'application/json', 'x-ucm-internal-auth': 'secret', 'x-api-key': 'ucm_ak_test', cookie: 'session_id=abc' });
  });

  it('rejects failed v2 introspection', async () => {
    const fetcher = async () => new Response('Unauthorized', { status: 401 });
    const client = new V2AuthClient('http://auth.test', 'secret', fetcher);
    await expect(client.authorize({ headers: {} })).rejects.toThrow('Unauthorized');
  });
});
