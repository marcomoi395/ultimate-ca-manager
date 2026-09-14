import { BadRequestException } from '@nestjs/common';
import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';

const PEM_HEADER = '-----BEGIN CERTIFICATE REQUEST-----';
const PEM_FOOTER = '-----END CERTIFICATE REQUEST-----';
const MAX_CSR_BYTES = 64 * 1024;

export interface ParsedCertificateRequest {
  certificate_request: string;
  subject_dn: string;
}

export async function parseCertificateRequest(value: string): Promise<ParsedCertificateRequest> {
  const der = decodeCertificateRequest(value);
  const asn1 = asn1js.fromBER(Uint8Array.from(der).buffer);
  if (asn1.offset === -1) throw new BadRequestException('CSR is invalid');

  try {
    const request = new pkijs.CertificationRequest({ schema: asn1.result });
    if (!await request.verify()) throw new BadRequestException('CSR signature is invalid');

    const subject_dn = formatSubject(request);
    if (!subject_dn) throw new BadRequestException('CSR subject is required');

    return {
      certificate_request: der.toString('base64'),
      subject_dn,
    };
  } catch (error) {
    if (error instanceof BadRequestException) throw error;
    throw new BadRequestException('CSR is invalid');
  }
}

function decodeCertificateRequest(value: string): Buffer {
  if (!value.trim()) throw new BadRequestException('certificate_request is required');

  const trimmed = value.trim();
  const base64 = trimmed.startsWith(PEM_HEADER)
    ? extractPemBase64(trimmed)
    : trimmed.replace(/\s/g, '');

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length % 4 !== 0) {
    throw new BadRequestException('certificate_request must be PEM or DER base64');
  }

  const der = Buffer.from(base64, 'base64');
  if (der.length === 0 || der.length > MAX_CSR_BYTES) {
    throw new BadRequestException('CSR size is invalid');
  }

  return der;
}
const DN_ATTRIBUTE_NAMES: Record<string, string> = {
  '0.9.2342.19200300.100.1.1': 'UID',
  '0.9.2342.19200300.100.1.25': 'DC',
  '1.2.840.113549.1.9.1': 'emailAddress',
  '2.5.4.3': 'CN',
  '2.5.4.4': 'SN',
  '2.5.4.5': 'serialNumber',
  '2.5.4.6': 'C',
  '2.5.4.7': 'L',
  '2.5.4.8': 'ST',
  '2.5.4.10': 'O',
  '2.5.4.11': 'OU',
};

function formatSubject(request: pkijs.CertificationRequest): string {
  return request.subject.typesAndValues
    .map((attribute) => {
      const value = attribute.value.valueBlock.value;
      return `${DN_ATTRIBUTE_NAMES[attribute.type] ?? attribute.type}=${escapeDn(value)}`;
    })
    .reverse()
    .join(',');
}

function escapeDn(value: string): string {
  const escaped = value.replace(/([,+"\\<>;=])/g, '\\$1');
  return escaped.replace(/^([ #])/, '\\$1').replace(/ $/, '\\ ');
}

function extractPemBase64(value: string): string {
  if (!value.endsWith(PEM_FOOTER)) {
    throw new BadRequestException('certificate_request must be PEM or DER base64');
  }
  return value.slice(PEM_HEADER.length, -PEM_FOOTER.length).replace(/\s/g, '');
}
