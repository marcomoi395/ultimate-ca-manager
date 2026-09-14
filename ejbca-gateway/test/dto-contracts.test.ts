import { describe, expect, it } from 'bun:test';
import { parseCertificateListQuery } from '../src/certificates/dtos/certificate-list.query';

describe('certificate request contracts', () => {
  it('parses pagination and applies the server-side limit cap', () => {
    const query = parseCertificateListQuery({ page: '2', limit: '500', status: 'issued' });
    expect(query).toEqual({ page: 2, limit: 100, status: ['issued'] });
  });

  it('rejects invalid pagination values', () => {
    expect(() => parseCertificateListQuery({ page: '0', limit: '-1' })).toThrow('Invalid pagination');
  });
  it('parses repeated filters, v2 booleans, aliases, and per_page precedence', () => {
    expect(parseCertificateListQuery({
      limit: '5', per_page: '25', status: ['valid', 'expired'], ca_id: ['1', '2'], source: ['manual', 'ejbca'],
      template_modified: 'yes', sort: 'valid_to', order: 'desc',
    })).toEqual({
      page: 1, limit: 25, status: ['valid', 'expired'], caId: [1, 2], source: ['manual', 'ejbca'],
      templateModified: true, sortBy: 'valid_to', sortOrder: 'desc',
    });
  });
});
