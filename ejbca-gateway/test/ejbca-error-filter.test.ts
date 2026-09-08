import { describe, expect, it } from 'bun:test';
import { EjbcaErrorFilter } from '../src/common/ejbca-error.filter';

describe('EJBCA error filter', () => {
  it('preserves normalized upstream errors and status', () => {
    let statusCode = 0;
    let body: unknown;
    const response = {
      status(code: number) { statusCode = code; return this; },
      json(value: unknown) { body = value; },
    };
    const host = { switchToHttp: () => ({ getResponse: () => response }) } as never;
    new EjbcaErrorFilter().catch({ error_code: 'EJBCA_UPSTREAM_ERROR', code: 'EJBCA_403', message: 'denied' }, host);
    expect(statusCode).toBe(403);
    expect(body).toEqual({ error_code: 'EJBCA_UPSTREAM_ERROR', code: 'EJBCA_403', message: 'denied' });
  });
});
