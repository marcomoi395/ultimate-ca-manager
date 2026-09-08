import { describe, expect, it } from 'bun:test';
import { CatalogService } from '../src/supporting/catalog.service';

describe('EKU catalog', () => {
  it('returns the RFC 5280 well-known EKU OIDs', async () => {
    const catalog = await new CatalogService().knownEku();
    expect(Array.isArray(catalog.ekus)).toBe(true);
    expect(catalog.ekus.length).toBeGreaterThan(10);
    expect(catalog.ekus.find((e) => e.oid === '1.3.6.1.5.5.7.3.1')).toEqual({
      oid: '1.3.6.1.5.5.7.3.1',
      name: 'serverAuth',
    });
  });
});
