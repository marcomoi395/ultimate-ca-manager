import { describe, expect, it } from 'bun:test';
import { lastValueFrom, of } from 'rxjs';
import { EnvelopeInterceptor } from '../src/common/envelope.interceptor';

function context(statusCode = 200) {
  return {
    switchToHttp: () => ({ getResponse: () => ({ statusCode }) }),
  } as never;
}

function handler(data: unknown) {
  return { handle: () => of(data) } as never;
}

describe('V3 envelope interceptor', () => {
  it('wraps raw handler data into the V3 envelope', async () => {
    const result = await lastValueFrom(
      new EnvelopeInterceptor().intercept(context(), handler({ id: 'cert-1' })),
    );
    expect(result).toEqual({ data: { id: 'cert-1' }, message: 'ok', meta: {} });
  });

  it('keeps an existing V3 envelope untouched', async () => {
    const envelope = { data: { a: 1 }, message: 'ok', meta: {} };
    const result = await lastValueFrom(
      new EnvelopeInterceptor().intercept(context(), handler(envelope)),
    );
    expect(result).toEqual(envelope);
  });

  it('normalizes list payloads into data plus pagination meta', async () => {
    const result = await lastValueFrom(
      new EnvelopeInterceptor().intercept(context(), handler({ data: [{ id: 1 }], meta: { page: 1 } })),
    );
    expect(result).toEqual({ data: [{ id: 1 }], message: 'ok', meta: { page: 1 } });
  });

  it('normalizes bare arrays into data plus meta', async () => {
    const result = await lastValueFrom(
      new EnvelopeInterceptor().intercept(context(), handler([{ id: 1 }])),
    );
    expect(result).toEqual({ data: [{ id: 1 }], message: 'ok', meta: {} });
  });

  it('preserves 201 status code in meta for created responses', async () => {
    const result = await lastValueFrom(
      new EnvelopeInterceptor().intercept(context(201), handler({ id: 9 })),
    );
    expect(result.meta.http_status).toBe(201);
  });

  it('passes through blob responses without wrapping', async () => {
    const blob = new Blob(['pem-bytes']);
    const result = await lastValueFrom(
      new EnvelopeInterceptor().intercept(context(), handler(blob)),
    );
    expect(result).toBe(blob);
  });
});
