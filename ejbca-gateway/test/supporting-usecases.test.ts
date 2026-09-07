import { describe, expect, it } from 'bun:test';
import { CatalogService } from '../src/supporting/catalog.service';
import { HsmService } from '../src/supporting/hsm.service';

describe('supporting discovery use cases', () => {
  it('returns explicit unavailable metadata without secrets', async () => {
    expect((await new CatalogService().microsoftCas()).data.enabled).toBe(false);
    expect((await new HsmService().status()).data.status).toBe('unavailable');
  });
});
