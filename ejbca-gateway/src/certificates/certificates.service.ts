import { Inject, Injectable } from '@nestjs/common';
import { EjbcaResourceAdapter } from '../integrations/ejbca/resource-adapter';
import type { CertificateListQuery } from './dtos/certificate-list.query';

type CertificateReader = (query: CertificateListQuery) => Promise<unknown>;

@Injectable()
export class CertificatesService {
  private readonly reader?: CertificateReader;
  private readonly adapter?: EjbcaResourceAdapter;

  constructor(@Inject(EjbcaResourceAdapter) source: EjbcaResourceAdapter | CertificateReader) {
    if (typeof source === 'function') this.reader = source;
    else this.adapter = source;
  }

  async list(query: CertificateListQuery): Promise<unknown> {
    if (this.reader) {
      const data = await this.reader(query);
      return { data, meta: { page: query.page, limit: query.limit } };
    }
    const params = new URLSearchParams();
    params.set('page', String(query.page));
    params.set('limit', String(query.limit));
    if (query.status) params.set('status', query.status);
    if (query.caId) params.set('ca_id', query.caId);
    if (query.search) params.set('search', query.search);
    return this.adapter!.listCertificates(params);
  }

  async getById(id: string): Promise<unknown> {
    if (this.reader) {
      const result = await this.reader({ page: 1, limit: 100 });
      if (!Array.isArray(result)) return result;
      const match = result.find((certificate) => {
        if (!certificate || typeof certificate !== 'object' || !('id' in certificate)) return false;
        return certificate.id === id;
      });
      return match ?? { status: 'MISSING' };
    }
    return this.adapter!.getCertificate(id);
  }
}
