import { BadRequestException } from '@nestjs/common';
import { parseCertificateRequest } from '../certificate-request.parser';

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
  include_chain?: boolean;
  response_format?: 'DER';
}

export interface ClientKeyEnrollmentRequest {
  certificate_request: string;
  certificate_request_type: 'PKCS10';
  include_chain: true;
  response_format: 'DER';
  end_entity: {
    username: string;
    password: string;
    subject_dn: string;
    ca_name: string;
    certificate_profile_name: string;
    end_entity_profile_name: string;
    token: 'USERGENERATED';
    status: 'NEW';
  };
}

export function parseCertificateEnrollmentRequest(body: Record<string, unknown>): CertificateEnrollmentRequest {
  const certificate_request = requiredString(body, 'certificate_request');
  const certificate_profile_name = requiredString(body, 'certificate_profile_name');
  const end_entity_profile_name = requiredString(body, 'end_entity_profile_name');
  const certificate_authority_name = requiredString(body, 'certificate_authority_name');
  const username = requiredString(body, 'username');
  const password = requiredString(body, 'password');

  if (body.include_chain !== undefined && typeof body.include_chain !== 'boolean') {
    throw new BadRequestException('include_chain must be a boolean');
  }
  if (body.response_format !== undefined && body.response_format !== 'DER') {
    throw new BadRequestException('response_format must be DER');
  }

  return {
    certificate_request,
    certificate_profile_name,
    end_entity_profile_name,
    certificate_authority_name,
    username,
    password,
    include_chain: body.include_chain as boolean | undefined,
    response_format: body.response_format as 'DER' | undefined,
  };
}

function requiredString(body: Record<string, unknown>, field: typeof REQUIRED_FIELDS[number]): string {
  const value = body[field];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new BadRequestException(`${field} is required`);
  }
  return value.trim();
}

export async function toClientKeyEnrollmentRequest(
  request: CertificateEnrollmentRequest,
): Promise<ClientKeyEnrollmentRequest> {
  const csr = await parseCertificateRequest(request.certificate_request);
  return {
    certificate_request: csr.certificate_request,
    certificate_request_type: 'PKCS10',
    include_chain: true,
    response_format: 'DER',
    end_entity: {
      username: request.username,
      password: request.password,
      subject_dn: csr.subject_dn,
      ca_name: request.certificate_authority_name,
      certificate_profile_name: request.certificate_profile_name,
      end_entity_profile_name: request.end_entity_profile_name,
      token: 'USERGENERATED',
      status: 'NEW',
    },
  };
}
