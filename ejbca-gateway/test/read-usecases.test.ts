import { describe, expect, it } from 'bun:test';
import { CasService } from '../src/cas/cas.service';
import { parseCaListQuery } from '../src/cas/dtos/ca-list.query';
import { CsrsService } from '../src/csrs/csrs.service';

describe('read facade use cases', () => {
  it('delegates CA reads with v2-compatible pagination and field names', async () => {
    const calls: unknown[][] = [];
    const adapter = {
      listCas: async (...args: unknown[]) => { calls.push(args); return [{ id: 1, name: 'Root', subject_dn: 'CN=Root', issuer_dn: 'CN=Root', expiration_date: '2036-09-05T01:57:37Z', external: false }]; },
      request: async (path: string) => { calls.push([path]); return { path }; },
    } as never;
    const service = new CasService(adapter);
    await expect(service.list({ page: 2, limit: 10, sortBy: 'name', sortOrder: 'desc' })).resolves.toEqual({
      data: [expect.objectContaining({
        id: 1,
        name: 'Root',
        common_name: 'Root',
        subject: 'CN=Root',
        issuer: 'CN=Root',
        expires: '2036-09-05',
        expiry: '2036-09-05',
        is_root: true,
        type: 'root',
        cdp_urls: [],
        aia_ca_issuers_urls: [],
      })],
      meta: { page: 2, per_page: 10, total: 1, total_pages: 1 },
    });
    expect(calls[0]).toEqual([expect.any(URLSearchParams)]);
    expect((calls[0][0] as URLSearchParams).toString()).toContain('page=2');
  });

  it('links intermediate CAs to a listed issuer CA', async () => {
    const adapter = {
      listCas: async () => ({ certificate_authorities: [
        { id: 1, name: 'Root', subject_dn: 'CN=Root', issuer_dn: 'CN=Root' },
        { id: 2, name: 'Intermediate', subject_dn: 'CN=Intermediate', issuer_dn: 'CN=Root' },
      ] }),
    } as never;
    const result = await new CasService(adapter).list({ page: 1, limit: 20 });
    expect(result).toMatchObject({
      data: [
        expect.objectContaining({ id: 1, parent_id: null, type: 'root' }),
        expect.objectContaining({ id: 2, parent_id: 1, type: 'intermediate' }),
      ],
    });
  });
  it('resolves CA detail from the EJBCA CA list by numeric id', async () => {
    const adapter = {
      listCas: async () => ({ certificate_authorities: [
        { id: 1626169540, name: 'test', subject_dn: 'CN=test', issuer_dn: 'CN=test', expiration_date: '2027-09-08T03:46:47Z', external: false },
      ] }),
    } as never;
    await expect(new CasService(adapter).getById('1626169540')).resolves.toEqual(expect.objectContaining({
      id: 1626169540,
      common_name: 'test',
      subject: 'CN=test',
      is_root: true,
    }));
  });

  it('returns not found when a CA id is absent from the EJBCA list', async () => {
    const adapter = { listCas: async () => [] } as never;
    await expect(new CasService(adapter).getById('missing')).rejects.toThrow('CA not found');
  });

  it('normalizes EJBCA CA list responses for the v2 data envelope', async () => {
    const adapter = {
      listCas: async () => ({ certificate_authorities: [{ id: 'ca-1', name: 'Imported' }], total: 1 }),
    } as never;
    await expect(new CasService(adapter).list({ page: 1, limit: 20 })).resolves.toEqual(expect.objectContaining({
      data: [expect.objectContaining({ id: 'ca-1', name: 'Imported' })],
      meta: { page: 1, per_page: 20, total: 1, total_pages: 1 },
    }));
  });

  it('rejects invalid CA pagination and sort order', async () => {
    const adapter = { listCas: async () => [] } as never;
    const service = new CasService(adapter);
    expect(() => parseCaListQuery({ page: '0' })).toThrow('Invalid pagination');
    expect(() => parseCaListQuery({ sort_order: 'latest' })).toThrow('Invalid sort order');
    await expect(service.list(parseCaListQuery({ per_page: '25' }))).resolves.toEqual({
      data: [],
      meta: { page: 1, per_page: 25, total: 0, total_pages: 0 },
    });
  });

  it('delegates detail reads to the EJBCA CA list', async () => {
    const adapter = {
      listCas: async () => [{ id: 'ca-1', name: 'Root', subject_dn: 'CN=Root', issuer_dn: 'CN=Root' }],
    } as never;
    const ca = await new CasService(adapter).getById('ca-1');
    expect(ca).toEqual(expect.objectContaining({ id: 'ca-1', common_name: 'Root' }));
  });
});
