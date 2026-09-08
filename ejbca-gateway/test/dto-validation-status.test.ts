import { describe, expect, it } from 'bun:test';
import { parseCertificateListQuery } from '../src/certificates/dtos/certificate-list.query';
import { parseCsrListQuery } from '../src/csrs/dtos/csr-list.query';

describe('query validation errors are client errors', () => {
  it('throws BadRequest for invalid certificate pagination', () => {
    try {
      parseCertificateListQuery({ page: '0' });
      expect.unreachable();
    } catch (error) {
      expect(error.getStatus()).toBe(400);
    }
  });

  it('throws BadRequest for invalid csr pagination', () => {
    try {
      parseCsrListQuery({ limit: 'abc' });
      expect.unreachable();
    } catch (error) {
      expect(error.getStatus()).toBe(400);
    }
  });

  it('still caps and parses valid pagination', () => {
    expect(parseCertificateListQuery({ page: '2', per_page: '500' })).toEqual({
      page: 2,
      limit: 100,
    });
  });
});
