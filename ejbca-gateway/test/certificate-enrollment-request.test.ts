import { describe, expect, it } from 'bun:test';
import {
  parseCertificateEnrollmentRequest,
  toClientKeyEnrollmentRequest,
} from '../src/certificates/dtos/certificate-enrollment.request';
import { certificateRequestPem } from './fixtures/certificate-request';

const valid = {
  certificate_request: certificateRequestPem,
  certificate_profile_name: 'TLS',
  end_entity_profile_name: 'Default',
  certificate_authority_name: 'ManagementCA',
  username: 'enroll-user',
  password: 'secret',
};

describe('certificate enrollment request', () => {
  it('maps an external PKCS#10 request to the verified EJBCA client-key contract', async () => {
    const request = parseCertificateEnrollmentRequest(valid);

    await expect(toClientKeyEnrollmentRequest(request)).resolves.toEqual({
      certificate_request: expect.any(String),
      certificate_request_type: 'PKCS10',
      include_chain: true,
      response_format: 'DER',
      end_entity: {
        username: 'enroll-user',
        password: 'secret',
        subject_dn: 'CN=import.example.test,OU=Gateway,O=UCM,C=VN',
        ca_name: 'ManagementCA',
        certificate_profile_name: 'TLS',
        end_entity_profile_name: 'Default',
        token: 'USERGENERATED',
        status: 'NEW',
      },
    });
  });

  it('rejects missing enrollment fields', () => {
    expect(() => parseCertificateEnrollmentRequest({ ...valid, password: '' })).toThrow('password is required');
    expect(() => parseCertificateEnrollmentRequest({ ...valid, certificate_request: undefined })).toThrow('certificate_request is required');
  });

  it('rejects unsupported response configuration', () => {
    expect(() => parseCertificateEnrollmentRequest({ ...valid, include_chain: 'true' })).toThrow('include_chain must be a boolean');
    expect(() => parseCertificateEnrollmentRequest({ ...valid, response_format: 'PEM' })).toThrow('response_format must be DER');
  });
});
