import { describe, expect, it } from 'bun:test';
import { CasService } from '../src/cas/cas.service';
import { parseCaListQuery } from '../src/cas/dtos/ca-list.query';
import { CsrsService } from '../src/csrs/csrs.service';

describe('read facade use cases', () => {
  it('delegates CA reads with encoded IDs', async () => {
    const paths: string[] = [];
    const adapter = {
      listCas: async () => { paths.push('/v1/ca'); return [{ id: 'ca-1' }]; },
      getCa: async (id: string) => ({ resource: 'ca', id }),
      request: async (path: string) => { paths.push(path); return { path }; },
    } as never;
    const service = new CasService(adapter);
    expect(await service.list({ page: 2, limit: 10, sortBy: 'name', sortOrder: 'desc' })).toEqual([{ id: 'ca-1' }]);
    expect(await service.certificates('ca/1', { page: 1, limit: 5 })).toEqual({ path: '/v1/ca/ca%2F1/certificate?page=1&limit=5' });
    expect(await service.templates('ca/1')).toEqual({ path: '/v1/ca/ca%2F1/certificateprofile' });
    expect(paths).toEqual(['/v1/ca', '/v1/ca/ca%2F1/certificate?page=1&limit=5', '/v1/ca/ca%2F1/certificateprofile']);
  });
  it('unwraps EJBCA CA list responses for the v3 data envelope', async () => {
    const adapter = {
      listCas: async () => ({ certificate_authorities: [{ id: 'ca-1' }] }),
      getCa: async () => null,
      request: async () => null,
    } as never;
    await expect(new CasService(adapter).list({ page: 1, limit: 20 })).resolves.toEqual([{ id: 'ca-1' }]);
  });
  it('rejects invalid CA pagination and sort order', async () => {
    const adapter = { listCas: async () => [], getCa: async () => null, request: async () => null } as never;
    const service = new CasService(adapter);
    expect(() => parseCaListQuery({ page: '0' })).toThrow('Invalid pagination');
    expect(() => parseCaListQuery({ sort_order: 'latest' })).toThrow('Invalid sort order');
    await expect(service.list(parseCaListQuery({ per_page: '25' }))).resolves.toEqual([]);
  });

  it('delegates detail reads to EJBCA', async () => {
    const adapter = {
      getCa: async (id: string) => ({ resource: 'ca', id }),
      request: async (path: string) => ({ path }),
    } as never;
    const ca = await new CasService(adapter).getById('ca-1');
    expect(ca).toEqual({ resource: 'ca', id: 'ca-1' });
  });
});
