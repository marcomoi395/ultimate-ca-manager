import { Injectable } from '@nestjs/common';
import { EjbcaResourceAdapter } from '../integrations/ejbca/resource-adapter';
import type { CaListQuery } from './dtos/ca-list.query';

@Injectable()
export class CasService {
  constructor(private readonly adapter: EjbcaResourceAdapter) {}

  async list(_query: CaListQuery): Promise<unknown> {
    const result = await this.adapter.listCas();
    return normalizeCaList(result);
  }

  async getById(id: string): Promise<unknown> {
    return this.adapter.getCa(id);
  }

  certificates(id: string, query: CaListQuery): Promise<unknown> {
    return this.adapter.request(`/v1/ca/${encodeURIComponent(id)}/certificate${toQueryString(query)}`);
  }

  templates(id: string): Promise<unknown> {
    return this.adapter.request(`/v1/ca/${encodeURIComponent(id)}/certificateprofile`);
  }
}

function normalizeCaList(result: unknown): unknown {
  if (Array.isArray(result)) return result;
  if (!result || typeof result !== 'object') return result;
  const value = result as Record<string, unknown>;
  if (Array.isArray(value.certificate_authorities)) return value.certificate_authorities;
  if (Array.isArray(value.data)) return value.data;
  return result;
}

function toQueryParams(query: CaListQuery): URLSearchParams {
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('limit', String(query.limit));
  if (query.search) params.set('search', query.search);
  if (query.status) params.set('status', query.status);
  if (query.type) params.set('type', query.type);
  if (query.sortBy) params.set('sort_by', query.sortBy);
  if (query.sortOrder) params.set('sort_order', query.sortOrder);
  return params;
}

function toQueryString(query: CaListQuery): string {
  const params = toQueryParams(query);
  return params.size > 0 ? `?${params.toString()}` : '';
}
