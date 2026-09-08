import { Inject, Injectable, NotFoundException, NotImplementedException } from '@nestjs/common';
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
      : await this.adapter!.listCertificates(this.toEjbcaSearchQuery(query));
    const certificates = this.extractCertificates(result).map(mapCertificatePublicData);
    return {
      data: certificates,
      meta: {
        page: query.page,
        per_page: query.limit,
        total: this.extractTotal(result, certificates.length),
      },
    };
  }

  stats(): Promise<unknown> {
    return this.adapter ? this.adapter.getCertificateCount() : this.list({ page: 1, limit: 100 });
  }

  compliance(): Promise<never> {
    throw new NotImplementedException('EJBCA does not provide UCM compliance statistics');
  }

  lintStatus(): Promise<never> {
    throw new NotImplementedException('Certificate linting is not an EJBCA REST operation');
  }
  async getById(id: string): Promise<unknown> {
    const result = this.reader
      ? await this.reader({ page: 1, limit: 100 })
      : await this.adapter!.getCertificate(id);
    const certificates = this.extractCertificates(result).map(mapCertificatePublicData);
    const match = certificates.find((certificate) => certificate.serial_number === id || certificate.id === id);
    if (!match) throw new NotFoundException(`Certificate ${id} not found`);
    return match;
  }

  mutate(): Promise<never> {
    throw new NotImplementedException('Certificate mutations are owned by UCM and are not exposed by EJBCA REST');
  }

  exportFile(): Promise<never> {
    throw new NotImplementedException('Certificate export through the EJBCA adapter is not implemented');
  }

  lint(_id?: string, _profile?: string): Promise<never> {
    throw new NotImplementedException('Certificate linting is not an EJBCA REST operation');
  }

  private toEjbcaSearchQuery(query: CertificateListQuery): URLSearchParams {
    const params = new URLSearchParams();
    params.set('page', String(query.page));
    params.set('limit', String(query.limit));
    return params;
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
