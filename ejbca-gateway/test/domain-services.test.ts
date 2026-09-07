import { describe, expect, it } from 'bun:test';
import { CasService } from '../src/cas/cas.service';
import { CsrsService } from '../src/csrs/csrs.service';
import { TemplatesService } from '../src/templates/templates.service';

describe('domain read services', () => {
  it('returns public-safe empty collections by default', async () => {
    expect((await new CasService().list()).data).toEqual([]);
    expect((await new CsrsService().list()).data).toEqual([]);
    expect((await new TemplatesService().list()).data).toEqual([]);
  });
});
