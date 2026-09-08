import { describe, expect, it } from 'bun:test';
import { CsrsService } from '../src/csrs/csrs.service';
import { parseCsrListQuery } from '../src/csrs/dtos/csr-list.query';

function proxy() {
  const calls: Array<{ path: string; method?: string; body?: BodyInit }> = [];
  return {
    calls,
    request: async (path: string, options: { method?: string; body?: BodyInit } = {}) => {
      calls.push({ path, method: options.method, body: options.body });
      return { status: 200, headers: new Headers({ 'content-type': 'application/json' }), body: { data: [] } };
    },
  } as never;
}

describe('CSR query contract', () => {
  it('normalizes pagination, alias, and sort parameters', () => {
    expect(parseCsrListQuery({ per_page: '50', sort_by: 'created_at', sort_order: 'asc' })).toEqual({
      page: 1, limit: 50, sortBy: 'created_at', sortOrder: 'asc',
    });
  });

  it('rejects invalid sort order', () => {
    expect(() => parseCsrListQuery({ sort_order: 'sideways' })).toThrow('Invalid sort_order');
  });

  it('forwards list and mutation routes to UCM v2', async () => {
    const upstream = proxy();
    const service = new CsrsService(upstream);
    const headers = { cookie: 'session=x' };
    await service.list({ page: 2, limit: 50, search: 'acme', sortBy: 'created_at', sortOrder: 'asc' }, headers);
    await service.create({ cn: 'example.test' }, headers);
    await service.sign('csr-1', { ca_id: 2, validity_days: 365 }, headers);
    expect(upstream.calls.map((call) => call.path)).toEqual([
      '/api/v2/csrs?page=2&per_page=50&search=acme&sort_by=created_at&sort_order=asc',
      '/api/v2/csrs', '/api/v2/csrs/csr-1/sign',
    ]);
  });
});
