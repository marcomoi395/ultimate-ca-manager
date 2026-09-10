import { Injectable, NotFoundException } from '@nestjs/common';
import { EjbcaResourceAdapter } from '../integrations/ejbca/resource-adapter';
import type { CaListQuery } from './dtos/ca-list.query';

type CaRecord = Record<string, unknown>;

@Injectable()
export class CasService {
  constructor(private readonly adapter: EjbcaResourceAdapter) {}

  async list(query: CaListQuery): Promise<unknown> {
    const result = await this.adapter.listCas(toQueryParams(query));
    const { items, total } = normalizeCaList(result);
    return {
      data: toLegacyCas(items),
      meta: {
        page: query.page,
        per_page: query.limit,
        total,
        total_pages: total === 0 ? 0 : Math.ceil(total / query.limit),
      },
    };
  }

  async getById(id: string): Promise<unknown> {
    const { items } = normalizeCaList(await this.adapter.listCas());
    const index = items.findIndex(item => String(item.id ?? '') === id);
    if (index < 0) throw new NotFoundException('CA not found');
    return toLegacyCas(items)[index];
  }
}

function normalizeCaList(result: unknown): { items: CaRecord[]; total: number } {
  if (Array.isArray(result)) {
    const items = result.filter((item): item is CaRecord => item !== null && typeof item === 'object' && !Array.isArray(item));
    return { items, total: items.length };
  }
  if (result === null || typeof result !== 'object') return { items: [], total: 0 };
  const value = result as CaRecord;
  const rawItems = Array.isArray(value.certificate_authorities)
    ? value.certificate_authorities
    : Array.isArray(value.data) ? value.data : [];
  const items = rawItems.filter((item): item is CaRecord => item !== null && typeof item === 'object' && !Array.isArray(item));
  return { items, total: typeof value.total === 'number' ? value.total : items.length };
}

function toLegacyCas(cas: CaRecord[]): CaRecord[] {
  const idsBySubject = new Map(
    cas
      .filter(ca => typeof ca.subject_dn === 'string' && ca.id !== undefined)
      .map(ca => [ca.subject_dn as string, ca.id]),
  );
  return cas.map(ca => toLegacyCa(ca, idsBySubject));
}

function toLegacyCa(ca: CaRecord, idsBySubject: Map<string, unknown>): CaRecord {
  const subject = typeof ca.subject_dn === 'string' ? ca.subject_dn : typeof ca.subject === 'string' ? ca.subject : null;
  const issuer = typeof ca.issuer_dn === 'string' ? ca.issuer_dn : typeof ca.issuer === 'string' ? ca.issuer : null;
  const isRoot = Boolean(subject && issuer && subject === issuer);
  const parentId = !isRoot && issuer ? idsBySubject.get(issuer) ?? null : null;
  const commonName = typeof ca.name === 'string'
    ? ca.name
    : typeof ca.common_name === 'string'
      ? ca.common_name
      : subject?.replace(/^CN=/, '').split(',')[0] ?? null;
  const validTo = dateOnly(ca.expiration_date ?? ca.valid_to ?? ca.expires);
  const validFrom = dateOnly(ca.creation_date ?? ca.valid_from ?? ca.issued);
  return {
    aia_ca_issuers_enabled: false, aia_ca_issuers_url: null, aia_ca_issuers_urls: [], caref: null,
    cdp_enabled: false, cdp_url: null, cdp_urls: [], certs: 0, common_name: commonName, country: null,
    cps_enabled: false, cps_oid: '2.5.29.32.0', cps_uri: null, created_at: ca.created_at ?? null,
    created_by: ca.created_by ?? null, crl_digest: 'sha256', crl_publish_interval_hours: null,
    crl_validity_days: 7, csr_pem: null, delta_crl_enabled: false, delta_crl_interval: 4,
    descr: commonName, expires: validTo, expiry: validTo, has_csr: false, has_private_key: false,
    hash_algorithm: null, hsm_key_id: null, hsm_key_label: null, hsm_provider_id: null,
    hsm_provider_name: null, id: ca.id ?? null, imported_from: ca.external === true ? 'external' : 'ejbca',
    inhibit_any_policy: null, is_root: isRoot, issued: validFrom, issuer, key_type: null, locality: null,
    name: commonName, name_constraints_excluded: [], name_constraints_permitted: [], ocsp_enabled: false,
    ocsp_url: null, ocsp_urls: [], offline: false, offline_label: null, offline_mode: null,
    offline_reason: null, organization: null, organizational_unit: null, owner_group_id: null,
    owner_group_name: null, parent_id: parentId, path_length: null, pem: null, pending: false,
    policy_constraints_inhibit: null, policy_constraints_require: null, refid: ca.id ?? null,
    serial: ca.serial_number ?? ca.serial ?? null, serial_number: ca.serial_number ?? ca.serial ?? null, sia_enabled: false, sia_urls: [], ski: null, state: null,
    status: validTo && validTo < new Date().toISOString().slice(0, 10) ? 'Expired' : 'Active', subject,
    type: isRoot ? 'root' : 'intermediate', url_slug: null, uses_hsm: false,
    valid_from: ca.creation_date ?? ca.valid_from ?? null, valid_to: ca.expiration_date ?? ca.valid_to ?? null,
  };
}

function dateOnly(value: unknown): string | null {
  return typeof value === 'string' && value.length >= 10 ? value.slice(0, 10) : null;
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
