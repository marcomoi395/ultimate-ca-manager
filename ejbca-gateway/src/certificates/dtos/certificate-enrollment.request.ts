import { BadRequestException } from '@nestjs/common';

const REQUIRED_FIELDS = [
  'certificate_request',
  'certificate_profile_name',
  'end_entity_profile_name',
  'certificate_authority_name',
  'username',
  'password',
] as const;

export interface CertificateEnrollmentRequest {
  certificate_request: string;
  certificate_profile_name: string;
  end_entity_profile_name: string;
  certificate_authority_name: string;
  username: string;
  password: string;
  account_binding_id?: string;
  include_chain?: boolean;
  email?: string;
  response_format?: 'DER' | 'PEM';
  subject_dn?: string;
  extension_data?: unknown[];
  custom_data?: unknown[];
  start_time?: string;
  end_time?: string;
}

export function parseCertificateEnrollmentRequest(body: Record<string, unknown>): CertificateEnrollmentRequest {
  for (const field of REQUIRED_FIELDS) {
    if (typeof body[field] !== 'string' || body[field].trim() === '') {
      throw new BadRequestException(`${field} is required`);
    }
  }
  if (body.include_chain !== undefined && typeof body.include_chain !== 'boolean') {
    throw new BadRequestException('include_chain must be a boolean');
  }
  if (body.response_format !== undefined && body.response_format !== 'DER' && body.response_format !== 'PEM') {
    throw new BadRequestException('response_format must be DER or PEM');
  }
  for (const field of ['account_binding_id', 'email', 'subject_dn', 'start_time', 'end_time']) {
    if (body[field] !== undefined && typeof body[field] !== 'string') {
      throw new BadRequestException(`${field} must be a string`);
    }
  }
  for (const field of ['extension_data', 'custom_data']) {
    if (body[field] !== undefined && !Array.isArray(body[field])) {
      throw new BadRequestException(`${field} must be an array`);
    }
  }
  return body as unknown as CertificateEnrollmentRequest;
}
