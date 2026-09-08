export interface CertificatePublicData {
  id: string;
  serial_number: string;
  subject: string | null;
  issuer: string | null;
  status: 'valid' | 'expiring' | 'expired' | 'revoked';
  has_private_key: boolean;
  [key: string]: unknown;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : value === undefined || value === null ? null : String(value);
}

function normalizeStatus(value: unknown): CertificatePublicData['status'] {
  const status = String(value ?? '').toUpperCase();
  if (status.includes('REVOK')) return 'revoked';
  if (status.includes('EXPIRED')) return 'expired';
  if (status.includes('EXPIR')) return 'expiring';
  return 'valid';
}

export function mapCertificatePublicData(record: Record<string, unknown>): CertificatePublicData {
  const serial = asString(record.serial_number ?? record.serialNumber ?? record.serial ?? record.id) ?? '';
  const subject = asString(record.subject ?? record.subject_dn ?? record.subjectDN);
  const issuer = asString(record.issuer ?? record.issuer_dn ?? record.issuerDN);

  return {
    id: serial,
    serial_number: serial,
    subject,
    issuer,
    status: normalizeStatus(record.status ?? record.certificate_status),
    has_private_key: false,
  };
}
