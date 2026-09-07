import { describe, expect, it } from 'bun:test';
import { CasService } from '../src/cas/cas.service';
import { CsrsService } from '../src/csrs/csrs.service';
import { TemplatesService } from '../src/templates/templates.service';

describe('read facade use cases', () => {
  it('returns explicit missing state for unknown CA and template IDs', async () => {
    await expect(new CasService().getById('missing')).resolves.toEqual({ status: 'MISSING' });
    await expect(new CsrsService().getById('missing')).resolves.toEqual({ status: 'MISSING' });
    await expect(new TemplatesService().getById('missing')).resolves.toEqual({ status: 'MISSING' });
  });
});
