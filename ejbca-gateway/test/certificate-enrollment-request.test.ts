import { describe, expect, it } from 'bun:test';
import { parseCertificateEnrollmentRequest } from '../src/certificates/dtos/certificate-enrollment.request';

const valid = {
  certificate_request: 'Y3Ny',
  certificate_profile_name: 'TLS',
  end_entity_profile_name: 'Default',
  certificate_authority_name: 'Root CA',
  username: 'enroll-user',
  password: 'secret',
  account_binding_id: '1234567890',
  include_chain: true,
  email: 'john.doe@example.com',
  response_format: 'DER',
  subject_dn: 'CN=John Doe,C=SE',
  extension_data: [],
  custom_data: [],
  start_time: '2023-06-15 14:07:09',
  end_time: '2023-06-16 14:07:09',
};

describe('certificate enrollment request', () => {
  it('accepts the verified EJBCA payload', () => {
    expect(parseCertificateEnrollmentRequest(valid)).toEqual(valid);
  });

  it('rejects missing credentials and enrollment fields', () => {
    expect(() => parseCertificateEnrollmentRequest({ ...valid, password: '' })).toThrow('password is required');
    expect(() => parseCertificateEnrollmentRequest({ ...valid, certificate_request: undefined })).toThrow('certificate_request is required');
  });

  it('rejects invalid optional fields', () => {
    expect(() => parseCertificateEnrollmentRequest({ ...valid, include_chain: 'true' })).toThrow('include_chain must be a boolean');
    expect(() => parseCertificateEnrollmentRequest({ ...valid, response_format: 'P12' })).toThrow('response_format must be DER or PEM');
    expect(() => parseCertificateEnrollmentRequest({ ...valid, extension_data: {} })).toThrow('extension_data must be an array');
    expect(() => parseCertificateEnrollmentRequest({ ...valid, email: 42 })).toThrow('email must be a string');
  });
});
