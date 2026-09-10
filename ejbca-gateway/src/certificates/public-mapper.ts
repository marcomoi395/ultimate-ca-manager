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

function asIsoDate(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value).toISOString();
  if (typeof value === 'string' && value) {
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? value : new Date(timestamp).toISOString();
  }
  return null;
}

function toPem(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  if (value.includes('-----BEGIN CERTIFICATE-----')) return value;
  try {
    const decoded = atob(value);
    if (decoded.includes('-----BEGIN CERTIFICATE-----')) return decoded;
    const bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    const base64 = btoa(binary).match(/.{1,64}/g)?.join('\n') ?? '';
    return `-----BEGIN CERTIFICATE-----\n${base64}\n-----END CERTIFICATE-----\n`;
  } catch {
    return null;
  }
}

function normalizeStatus(value: unknown, revoked: boolean, validTo: string | null): CertificatePublicData['status'] {
  const status = String(value ?? '').toUpperCase();
  if (revoked || status.includes('REVOK')) return 'revoked';
  const expiry = validTo ? Date.parse(validTo) : Number.NaN;
  if (!Number.isNaN(expiry) && expiry <= Date.now()) return 'expired';
  if (!Number.isNaN(expiry) && expiry <= Date.now() + 30 * 86400000) return 'expiring';
  return 'valid';
}

function toDecimalSerial(value: unknown): string | null {
  const serial = asString(value);
  if (!serial) return null;
  try {
    return BigInt(`0x${serial.replace(/^0x/i, '')}`).toString(10);
  } catch {
    return serial;
  }
}

export function mapCertificatePublicData(record: Record<string, unknown>): CertificatePublicData {
  const serial = asString(record.serial_number ?? record.serialNumber ?? record.serial ?? record.id) ?? '';
  const subject = asString(record.subject ?? record.subject_dn ?? record.subjectDN);
  const issuer = asString(record.issuer ?? record.issuer_dn ?? record.issuerDN);
  const validFrom = asIsoDate(record.valid_from ?? record.validFrom ?? record.notBefore);
  const validTo = asIsoDate(record.valid_to ?? record.validTo ?? record.expireDate ?? record.notAfter);
  const historicalRevokedAt = asIsoDate(record.revoked_at ?? record.revokedAt ?? (Number(record.revocationDate) > 0 ? record.revocationDate : null));
  const pem = toPem(record.pem ?? record.base64Cert);
  const remaining = validTo ? Math.ceil((Date.parse(validTo) - Date.now()) / 86400000) : null;
  const san = asString(record.subjectAltName ?? record.subject_alt_name);
  const fingerprint = asString(record.fingerprint);
  const currentlyRevoked = record.revoked === true;
  const status = normalizeStatus(record.status ?? record.certificate_status, currentlyRevoked, validTo);
  const revokedAt = status === 'revoked' ? historicalRevokedAt : null;
  const revokeReason = status === 'revoked' ? record.revocationReason ?? null : null;

  return {
    id: serial,
    serial_number: serial,
    subject,
    issuer,
    status,
    has_private_key: false,
    valid_from: validFrom,
    valid_to: validTo,
    not_valid_before: validFrom,
    not_valid_after: validTo,
    revoked: status === 'revoked',
    revoked_at: revokedAt,
    revoke_reason: revokeReason,
    pem,
    thumbprint_sha1: fingerprint,
    ski: asString(record.subjectKeyId ?? record.ski),
    serial_number_decimal: record.serialNumber !== undefined
      ? toDecimalSerial(record.serialNumber)
      : asString(record.serial_number_decimal),
    san_combined: san,
    days_remaining: remaining,
    source: asString(record.source) ?? 'ejbca',
    imported_from: asString(record.imported_from),
    caref: asString(record.cAFingerprint ?? record.caref),
    issuer_name: issuer,
    key_algorithm: asString(record.key_algorithm),
    key_size: record.key_size ?? null,
    key_type: asString(record.key_type),
    signature_algorithm: asString(record.signature_algorithm),
    descr: asString(record.descr),
    created_at: asIsoDate(record.created_at ?? record.createdAt ?? record.updateTime ?? record.udpateTime),
    created_by: asString(record.created_by ?? record.username),
    archived: false,
    private_key_location: 'download_only',
    template_id: null,
    template_name: null,
    template_overrides: [],
    compliance_score: null,
    compliance_grade: null,
    refid: null,
  };
}
