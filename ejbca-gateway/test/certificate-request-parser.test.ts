import { describe, expect, it } from 'bun:test';
import { parseCertificateRequest } from '../src/certificates/certificate-request.parser';
import {
  certificateRequestPem as csrPem,
  ecCertificateRequestPem,
} from './fixtures/certificate-request';

describe('parseCertificateRequest', () => {
  it('verifies a PEM PKCS#10 request and normalizes it to DER base64', async () => {
    await expect(parseCertificateRequest(csrPem)).resolves.toEqual(expect.objectContaining({
      certificate_request: expect.any(String),
      subject_dn: 'CN=import.example.test,OU=Gateway,O=UCM,C=VN',
    }));
  });


  it('verifies an EC P-256 PKCS#10 request', async () => {
    await expect(parseCertificateRequest(ecCertificateRequestPem)).resolves.toEqual(expect.objectContaining({
      subject_dn: 'CN=ec-import.example.test',
    }));
  });
  it('rejects a CSR whose signature does not verify', async () => {
    const tampered = csrPem.replace('FBkaPA==', 'FBkaPQ==');
    await expect(parseCertificateRequest(tampered)).rejects.toThrow('CSR signature is invalid');
  });
});
