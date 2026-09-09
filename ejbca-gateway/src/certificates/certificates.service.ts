import { ConflictException, GoneException, Inject, Injectable, NotFoundException, NotImplementedException } from '@nestjs/common';
import { EjbcaResourceAdapter } from '../integrations/ejbca/resource-adapter';
import { mapCertificatePublicData } from './public-mapper';
import type { CertificateListQuery } from './dtos/certificate-list.query';

type CertificateReader = (query: CertificateListQuery) => Promise<unknown>;

export interface CertificateReadResult {
  data: unknown;
  meta: { page: number; per_page: number; total: number };
}

@Injectable()
export class CertificatesService {
  private readonly reader?: CertificateReader;

  constructor(@Inject(EjbcaResourceAdapter) source: EjbcaResourceAdapter | CertificateReader) {
    if (typeof source === 'function') this.reader = source;
    else this.adapter = source;
  }

  private readonly adapter?: EjbcaResourceAdapter;

  async list(query: CertificateListQuery): Promise<CertificateReadResult> {
    const result = this.reader
      ? await this.reader(query)
      : await this.readForQuery(query);
    let certificates = this.extractCertificates(result).map(mapCertificatePublicData);
    if (query.status?.length) certificates = certificates.filter((certificate) => query.status!.includes(certificate.status));
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
      : await this.adapter!.listCertificates(new URLSearchParams({ page: '1', limit: '100' }));
    const records = this.extractCertificates(result);
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
    const result = this.reader
      ? await this.reader({ page: 1, limit: 100 })
      : await this.adapter!.getCertificate(id, issuer);
    const certificates = this.extractCertificates(result).map(mapCertificatePublicData);
    const matches = certificates.filter((certificate) =>
      certificate.serial_number === id && (!issuer || certificate.issuer === issuer),
    );
    if (matches.length > 1) throw new ConflictException(`Certificate ${id} is ambiguous`);
    const match = matches[0];
    if (!match) throw new NotFoundException(`Certificate ${id} not found`);
    return match;
  }

  mutate(): Promise<never> {
    throw new NotImplementedException('Certificate mutations are owned by UCM and are not exposed by EJBCA REST');
  }

  exportFile(): Promise<never> {
    throw new NotImplementedException('Certificate export through the EJBCA adapter is not implemented');
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
    const statuses = query.status ?? [];
    const nativeStatuses = statuses
      .map((status) => status === 'valid' || status === 'expiring' || status === 'expired' ? 'CERT_ACTIVE' : status === 'revoked' ? 'CERT_REVOKED' : status)
      .filter((status, index, all) => all.indexOf(status) === index);
    const base = { ...query, page: 1, limit: nativeStatuses.length > 1 ? 100 : query.limit };
    if (nativeStatuses.length <= 1) return this.adapter!.listCertificates(this.toEjbcaSearchQuery({ ...base, status: nativeStatuses }));
    const results = await Promise.all(nativeStatuses.map((status) => this.adapter!.listCertificates(this.toEjbcaSearchQuery({ ...base, status: [status] }))));
    return { certificates: results.flatMap((result) => this.extractCertificates(result)) };
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
        const total = (value.pagination_summary as Record<string, unknown>).total;
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
}
