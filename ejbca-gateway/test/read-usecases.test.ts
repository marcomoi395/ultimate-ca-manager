import { describe, expect, it } from 'bun:test';
import { CasService } from '../src/cas/cas.service';
import { CsrsService } from '../src/csrs/csrs.service';
import { TemplatesService } from '../src/templates/templates.service';

describe('read facade use cases', () => {
  it('delegates detail reads to EJBCA', async () => {
    const adapter = {
      getCa: async (id: string) => ({ resource: 'ca', id }),
      request: async (path: string) => ({ path }),
    } as never;
    const ca = await new CasService(adapter).getById('ca-1');
    const csr = await new CsrsService(adapter).getById('csr-1');
    const template = await new TemplatesService(adapter).getById('template-1');
    expect(ca).toEqual({ resource: 'ca', id: 'ca-1' });
    expect(csr).toEqual({ path: '/v1/certificaterequest/csr-1' });
    expect(template).toEqual({ path: '/v1/endentity/template-1' });
  });
});
