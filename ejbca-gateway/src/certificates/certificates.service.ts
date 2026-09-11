import { BadGatewayException, BadRequestException, Injectable, ConflictException, GoneException, Inject, NotFoundException, NotImplementedException, Optional } from '@nestjs/common';
import * as asn1js from 'asn1js';
import * as pkijs from 'pkijs';
import { CertificateWriteInfrastructure } from './write-infrastructure';
import { EjbcaResourceAdapter } from '../integrations/ejbca/resource-adapter';
import { mapCertificatePublicData } from './public-mapper';
import type { CertificateListQuery } from './dtos/certificate-list.query';
import {
  toClientKeyEnrollmentRequest,
  type CertificateEnrollmentRequest,
} from './dtos/certificate-enrollment.request';
type CertificateReader = (query: CertificateListQuery) => Promise<unknown>;

const SEARCH_PAGE_SIZE = 100;
const SEARCH_PAGE_CONCURRENCY = 4;
const MAX_SEARCH_PAGES = 1000;

export interface CertificateReadResult {
  data: unknown;
  meta: { page: number; per_page: number; total: number };
}

type CertificateExportFormat = 'pem' | 'der' | 'p7b';

interface CertificateExport {
  data: Buffer;
  type: string;
  filename: string;
}

function field(record: Record<string, unknown>, names: string[]): string | undefined {
  for (const name of names) {
    if (typeof record[name] === 'string') return record[name] as string;
  }
  return undefined;
}

@Injectable()
export class CertificatesService {
  private readonly reader?: CertificateReader;
  private readonly adapter?: EjbcaResourceAdapter;

  constructor(
    @Inject(EjbcaResourceAdapter) source: EjbcaResourceAdapter | CertificateReader,
    @Optional() @Inject(CertificateWriteInfrastructure) private readonly writes = new CertificateWriteInfrastructure(),
  ) {
    if (typeof source === 'function') this.reader = source;
    else this.adapter = source;
  }
  async list(query: CertificateListQuery): Promise<CertificateReadResult> {
    const result = this.reader
      ? await this.reader(query)
      : await this.readForQuery(query);
    const records = await this.refreshRevocationStatuses(this.extractCertificates(result));
    let certificates = records.map(mapCertificatePublicData);
    if (query.status?.length) certificates = certificates.filter((certificate) => query.status!.includes(certificate.status));
    const sortBy = query.sortBy ?? 'subject';
    const sortOrder = query.sortOrder ?? 'asc';
    const statusRank: Record<string, number> = { revoked: 1, expired: 2, expiring: 3, valid: 4 };
    certificates.sort((left, right) => {
      if (sortBy === 'status') {
        const comparison = statusRank[left.status] - statusRank[right.status];
        if (comparison !== 0) return sortOrder === 'desc' ? -comparison : comparison;
        return String(left.subject ?? left.descr ?? '').localeCompare(String(right.subject ?? right.descr ?? ''));
      }
      const field = sortBy === 'subject_cn' ? 'subject' : sortBy === 'key_algo' ? 'key_algorithm' : sortBy;
      const leftValue = field === 'subject' ? left.subject ?? left.descr : left[field];
      const rightValue = field === 'subject' ? right.subject ?? right.descr : right[field];
      const comparison = String(leftValue ?? '').localeCompare(String(rightValue ?? ''));
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    const offset = (query.page - 1) * query.limit;
    return {
      data: certificates.slice(offset, offset + query.limit),
      meta: {
        page: query.page,
        per_page: query.limit,
        total: this.reader ? this.extractTotal(result, certificates.length) : certificates.length,
      },
    };
  }

  async stats(): Promise<unknown> {
    const result = this.reader
      ? await this.reader({ page: 1, limit: 100 })
      : await this.readForQuery({ page: 1, limit: 100 });
    const records = await this.refreshRevocationStatuses(this.extractCertificates(result));
    const now = Date.now();
    const threshold = now + 30 * 86400000;
    let valid = 0;
    let expiring = 0;
    let expired = 0;
    let revoked = 0;
    const sources = new Set<string>();
    for (const record of records) {
      const source = typeof record.source === 'string' && record.source ? record.source : 'manual';
      sources.add(source);
      const isRevoked = record.revoked === true || String(record.status ?? '').toUpperCase().includes('REVOK');
      const validTo = Date.parse(String(record.valid_to ?? record.validTo ?? ''));
      if (isRevoked) {
        revoked += 1;
      } else if (validTo <= now) {
        expired += 1;
      } else if (validTo <= threshold) {
        expiring += 1;
      } else {
        valid += 1;
      }
    }
    return { total: records.length, valid, expiring, expired, revoked, sources: [...sources].sort() };
  }

  removed(): Promise<never> {
    throw new GoneException('GATEWAY_ENDPOINT_REMOVED');
  }

  compliance(): Promise<never> { return this.removed(); }

  lintStatus(): Promise<never> { return this.removed(); }
  async getById(id: string, issuer?: string): Promise<unknown> {
    const record = await this.getCertificateRecord(id, issuer);
    const [current] = await this.refreshRevocationStatuses([record]);
    return mapCertificatePublicData(current);
  }

  mutate(): Promise<never> {
    throw new NotImplementedException('Certificate mutations are owned by UCM and are not exposed by EJBCA REST');
  }

  async exportFile(id: string, body: unknown): Promise<CertificateExport> {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('Export body must be a JSON object');
    }
    const request = body as Record<string, unknown>;
    if (typeof request.issuer !== 'string' || !request.issuer) {
      throw new BadRequestException('issuer is required for certificate export');
    }

    const requestedFormat = String(request.format ?? 'pem').toLowerCase();
    let format: CertificateExportFormat;
    if (requestedFormat === 'pkcs7' || requestedFormat === 'p7b') {
      format = 'p7b';
    } else if (requestedFormat === 'pem' || requestedFormat === 'der') {
      format = requestedFormat;
    } else {
      throw new BadRequestException(`Unsupported export format: ${requestedFormat}`);
    }

    const record = await this.getCertificateRecord(id, request.issuer);
    const encoded = field(record, ['base64Cert', 'certificate']);
    if (!encoded) throw new BadGatewayException('EJBCA certificate search did not return certificate bytes');

    const firstPass = Buffer.from(encoded.replace(/\s/g, ''), 'base64');
    const nestedBase64 = firstPass.toString('ascii').replace(/\s/g, '');
    const der = /^[A-Za-z0-9+/]+={0,2}$/.test(nestedBase64) && nestedBase64.length % 4 === 0
      ? Buffer.from(nestedBase64, 'base64')
      : firstPass;
    const parsed = asn1js.fromBER(der.buffer.slice(der.byteOffset, der.byteOffset + der.byteLength));
    if (parsed.offset === -1) throw new BadGatewayException('EJBCA returned an invalid DER certificate');
    let certificate: pkijs.Certificate;
    try {
      certificate = new pkijs.Certificate({ schema: parsed.result });
    } catch {
      throw new BadGatewayException('EJBCA returned a certificate that is not valid X.509 DER');
    }
    const filenameBase = id.replace(/[^A-Za-z0-9._-]/g, '_') || 'certificate';

    if (format === 'pem') {
      const base64 = der.toString('base64').match(/.{1,64}/g)?.join('\n');
      return {
        data: Buffer.from(`-----BEGIN CERTIFICATE-----\n${base64}\n-----END CERTIFICATE-----\n`),
        type: 'application/x-pem-file',
        filename: `${filenameBase}.pem`,
      };
    }
    if (format === 'der') {
      return { data: der, type: 'application/pkix-cert', filename: `${filenameBase}.der` };
    }

    const signedData = new pkijs.SignedData({
      version: 1,
      encapContentInfo: new pkijs.EncapsulatedContentInfo({ eContentType: pkijs.SignedData.ID_DATA }),
      certificates: [certificate],
      signerInfos: [],
    });
    const contentInfo = new pkijs.ContentInfo({
      contentType: pkijs.ContentInfo.SIGNED_DATA,
      content: signedData.toSchema(),
    });
    return {
      data: Buffer.from(contentInfo.toSchema().toBER()),
      type: 'application/pkcs7-mime',
      filename: `${filenameBase}.p7b`,
    };
  }
  async issue(body: CertificateEnrollmentRequest, key?: string): Promise<unknown> {
    const claim = this.writes.claim(key, JSON.stringify(body));
    if (claim.status === 'REPLAY') return claim.response;
    if (claim.status === 'CONFLICT') return this.writes.conflict();

    const enrollment = await toClientKeyEnrollmentRequest(body);
    const result = this.publicWriteResult(await this.adapter!.issueCertificate(enrollment));
    this.writes.saveResponse(key, result);
    this.writes.audit({ actor_id: 'unknown', action: 'certificate.issue', correlation_id: 'unknown', outcome: 'success', metadata: { serial: result.serial_number } });
    return result;
  }

  async revoke(id: string, body: { reason?: string; issuer?: string }, key?: string): Promise<unknown> {
    const claim = this.writes.claim(key, JSON.stringify({ id, ...body }));
    if (claim.status === 'REPLAY') return claim.response;
    if (claim.status === 'CONFLICT') return this.writes.conflict();
    if (!body.issuer) throw new NotFoundException(`Certificate ${id} issuer not found`);
    const reason = body.reason ?? 'UNSPECIFIED';
    await this.adapter!.revokeCertificate(body.issuer, id, reason);
    const result = { serial_number: id, revoked: true, reason };
    this.writes.saveResponse(key, result);
    this.writes.audit({ actor_id: 'unknown', action: 'certificate.revoke', correlation_id: 'unknown', outcome: 'success', metadata: { serial: id } });
    return result;
  }

  async unhold(id: string, issuer?: string, key?: string): Promise<unknown> {
    const claim = this.writes.claim(key, JSON.stringify({ id, issuer }));
    if (claim.status === 'REPLAY') return claim.response;
    if (claim.status === 'CONFLICT') return this.writes.conflict();
    if (!issuer) throw new NotFoundException(`Certificate ${id} issuer not found`);
    const result = this.publicWriteResult(await this.adapter!.unholdCertificate(issuer, id));
    this.writes.saveResponse(key, result);
    this.writes.audit({ actor_id: 'unknown', action: 'certificate.unhold', correlation_id: 'unknown', outcome: 'success', metadata: { serial: id } });
    return result;
  }

  private async getCertificateRecord(id: string, issuer?: string): Promise<Record<string, unknown>> {
    const result = this.reader
      ? await this.reader({ page: 1, limit: 100 })
      : await this.adapter!.getCertificate(id, issuer);
    const matches = this.extractCertificates(result).filter((record) =>
      field(record, ['serial_number', 'serialNumber', 'serial', 'id']) === id
      && (!issuer || field(record, ['issuer', 'issuer_dn', 'issuerDN']) === issuer),
    );
    if (matches.length > 1) throw new ConflictException(`Certificate ${id} is ambiguous`);
    if (!matches[0]) throw new NotFoundException(`Certificate ${id} not found`);
    return matches[0];
  }

  private publicWriteResult(result: unknown): {
    certificate: string;
    certificate_chain: string[];
    serial_number: string;
    response_format: 'DER';
  } {
    if (!result || typeof result !== 'object') {
      throw new BadGatewayException('EJBCA enrollment did not return a certificate');
    }
    const value = result as Record<string, unknown>;
    if (typeof value.certificate !== 'string' || typeof value.serial_number !== 'string' || value.response_format !== 'DER') {
      throw new BadGatewayException('EJBCA enrollment returned an invalid certificate response');
    }
    const certificate_chain = value.certificate_chain;
    if (certificate_chain !== undefined && (!Array.isArray(certificate_chain) || certificate_chain.some((certificate) => typeof certificate !== 'string'))) {
      throw new BadGatewayException('EJBCA enrollment returned an invalid certificate chain');
    }
    return {
      certificate: value.certificate,
      certificate_chain: certificate_chain ?? [],
      serial_number: value.serial_number,
      response_format: 'DER',
    };
  }

  lint(_id?: string, _profile?: string): Promise<never> { return this.removed(); }

  private toEjbcaSearchQuery(query: CertificateListQuery): URLSearchParams {
    const params = new URLSearchParams();
    params.set('page', String(query.page));
    params.set('limit', String(query.limit));
    for (const status of query.status ?? []) params.append('status', status);
    for (const caId of query.caId ?? []) params.append('ca_id', String(caId));
    for (const source of query.source ?? []) params.append('source', source);
    if (query.search) params.set('search', query.search);
    if (query.hasKey !== undefined) params.set('has_key', String(query.hasKey));
    if (query.templateModified !== undefined) params.set('template_modified', String(query.templateModified));
    if (query.sortBy) params.set('sort_by', query.sortBy);
    if (query.sortOrder) params.set('sort_order', query.sortOrder);
    return params;
  }

  private async readForQuery(query: CertificateListQuery): Promise<unknown> {
    const statuses = query.status ?? ['valid', 'revoked'];
    const nativeStatuses = statuses
      .map((status) => status === 'valid' || status === 'expiring' || status === 'expired' ? 'CERT_ACTIVE' : status === 'revoked' ? 'CERT_REVOKED' : status)
      .filter((status, index, all) => all.indexOf(status) === index);
    const results = await Promise.all(nativeStatuses.map((status) => this.readAllForStatus(query, status)));
    return {
      certificates: results.flatMap((result) => result.certificates),
      total: results.reduce((total, result) => total + result.total, 0),
    };
  }

  private async readAllForStatus(query: CertificateListQuery, status: string) {
    const first = await this.adapter!.listCertificates(this.toEjbcaSearchQuery({
      ...query, page: 1, limit: SEARCH_PAGE_SIZE, status: [status],
    }));
    const certificates = this.extractCertificates(first);
    const total = this.extractTotal(first, certificates.length);
    const pageCount = Math.ceil(total / SEARCH_PAGE_SIZE);
    if (!Number.isSafeInteger(total) || total < certificates.length || pageCount > MAX_SEARCH_PAGES) {
      throw new BadGatewayException('EJBCA certificate search returned an invalid total');
    }

    const remaining: Record<string, unknown>[] = [];
    for (let page = 2; page <= pageCount; page += SEARCH_PAGE_CONCURRENCY) {
      const pageCountInBatch = Math.min(SEARCH_PAGE_CONCURRENCY, pageCount - page + 1);
      const results = await Promise.all(Array.from({ length: pageCountInBatch }, (_, index) =>
        this.adapter!.listCertificates(this.toEjbcaSearchQuery({
          ...query, page: page + index, limit: SEARCH_PAGE_SIZE, status: [status],
        }))));
      remaining.push(...results.flatMap((result) => this.extractCertificates(result)));
    }
    return { certificates: [...certificates, ...remaining], total };
  }

  private extractCertificates(result: unknown): Record<string, unknown>[] {
    if (Array.isArray(result)) return result.filter(this.isRecord);
    if (!result || typeof result !== 'object') return [];
    const value = result as Record<string, unknown>;
    if (Array.isArray(value.certificates)) return value.certificates.filter(this.isRecord);
    if (Array.isArray(value.data)) return value.data.filter(this.isRecord);
    return [];
  }

  private extractTotal(result: unknown, fallback: number): number {
    if (result && typeof result === 'object') {
      const value = result as Record<string, unknown>;
      if (typeof value.total === 'number') return value.total;
      if (value.pagination_summary && typeof value.pagination_summary === 'object') {
        const summary = value.pagination_summary as Record<string, unknown>;
        const total = summary.total ?? summary.total_certs;
        if (typeof total === 'number') return total;
      }
      if (value.pagination && typeof value.pagination === 'object') {
        const total = (value.pagination as Record<string, unknown>).total;
        if (typeof total === 'number') return total;
      }
    }
    return fallback;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private async refreshRevocationStatuses(records: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
    if (!this.adapter || typeof this.adapter.getRevocationStatus !== 'function') return records;
    return Promise.all(records.map(async (record) => {
      const issuer = record.issuer ?? record.issuer_dn ?? record.issuerDN;
      const serial = record.serial_number ?? record.serialNumber ?? record.serial ?? record.id;
      if (typeof issuer !== 'string' || !issuer || typeof serial !== 'string' || !serial) return record;
      try {
        const status = await this.adapter!.getRevocationStatus(issuer, serial);
        if (!this.isRecord(status) || typeof status.revoked !== 'boolean') return record;
        return {
          ...record,
          status: status.revoked ? 'CERT_REVOKED' : 'CERT_ACTIVE',
          revoked: status.revoked,
          revocationDate: status.revocation_date ?? status.revocationDate,
          revocationReason: status.revocation_reason ?? status.revocationReason,
        };
      } catch {
        return record;
      }
    }));
  }
}
