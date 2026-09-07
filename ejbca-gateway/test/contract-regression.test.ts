import { describe, expect, it } from 'bun:test';
import { CertificatesController } from '../src/certificates/certificates.controller';
import { ImportController } from '../src/supporting/import.controller';

describe('endpoint response contracts', () => {
  it('returns V3 envelopes for certificate and import responses', () => {
    expect(new CertificatesController().list()).toEqual({ data: [], message: 'ok', meta: {} });
    expect(new ImportController().execute()).toEqual({ data: { status: 'blocked' }, message: 'ok', meta: {} });
  });
});
