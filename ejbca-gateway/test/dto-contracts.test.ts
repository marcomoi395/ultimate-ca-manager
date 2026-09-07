import { describe, expect, it } from 'bun:test';
import { parseCertificateListQuery } from '../src/certificates/dtos/certificate-list.query';

describe('certificate request contracts', () => {
  it('parses pagination and applies the server-side limit cap', () => {
    const query = parseCertificateListQuery({ page: '2', limit: '500', status: 'issued' });
    expect(query).toEqual({ page: 2, limit: 100, status: 'issued' });
  });

  it('rejects invalid pagination values', () => {
    expect(() => parseCertificateListQuery({ page: '0', limit: '-1' })).toThrow('Invalid pagination');
  });
});
