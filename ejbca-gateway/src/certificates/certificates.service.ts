import { Inject, Injectable, NotFoundException } from '@nestjs/common';
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
    if (query.source) params.set('source', query.source);
    if (query.search) params.set('search', query.search);
    if (query.hasKey !== undefined) params.set('has_key', String(query.hasKey));
    if (query.templateModified !== undefined) params.set('template_modified', String(query.templateModified));
    if (query.sortBy) params.set('sort_by', query.sortBy);
    if (query.sortOrder) params.set('sort_order', query.sortOrder);
    return this.adapter!.listCertificates(params);
  }

  async stats(): Promise<unknown> {
    return this.adapter ? this.adapter.request('/v1/certificate/stats') : this.list({ page: 1, limit: 100 });
  }

  async compliance(): Promise<unknown> {
    return this.adapter ? this.adapter.request('/v1/certificate/compliance') : this.list({ page: 1, limit: 100 });
  }

  async lintStatus(): Promise<unknown> {
    return this.adapter ? this.adapter.request('/v1/certificate/lint/status') : this.list({ page: 1, limit: 100 });
  }

  async getById(id: string): Promise<unknown> {
    if (this.reader) {
      const result = await this.reader({ page: 1, limit: 100 });
      if (!Array.isArray(result)) return result;
      const match = result.find((certificate) => {
        if (!certificate || typeof certificate !== 'object' || !('id' in certificate)) return false;
        return certificate.id === id;
      });
      if (!match) throw new NotFoundException(`Certificate ${id} not found`);
      return match;
    }
    return this.adapter!.getCertificate(id);
  }
  async mutate(path: string, method: string, body?: unknown): Promise<unknown> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const headers = isFormData || body === undefined ? undefined : { 'content-type': 'application/json' };
    return this.adapter!.request(path, {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? body as FormData : JSON.stringify(body),
    });
  }
  async lint(id: string, profile?: string): Promise<unknown> {
    const suffix = profile ? `?profile=${encodeURIComponent(profile)}` : '';
    return this.adapter ? this.adapter.request(`/v1/certificate/${encodeURIComponent(id)}/lint${suffix}`) : this.getById(id);
  }
}
