import { describe, expect, it } from 'bun:test';
import { CasService } from '../src/cas/cas.service';
import { CsrsService } from '../src/csrs/csrs.service';
import { TemplatesService } from '../src/templates/templates.service';

function adapter() {
  return {
    listCas: async () => [{ id: 'ca-1' }],
    listCsrs: async () => [{ id: 'csr-1' }],
    listTemplates: async () => [{ id: 'template-1' }],
  } as never;
}

describe('domain read services', () => {
  it('delegates CA, CSR, and template reads to EJBCA', async () => {
    const source = adapter();
    expect(await new CasService(source).list()).toEqual([{ id: 'ca-1' }]);
    expect(await new CsrsService(source).list()).toEqual([{ id: 'csr-1' }]);
    expect(await new TemplatesService(source).list()).toEqual([{ id: 'template-1' }]);
  });
});
