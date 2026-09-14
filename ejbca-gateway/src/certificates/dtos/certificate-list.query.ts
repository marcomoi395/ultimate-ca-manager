import { BadRequestException } from '@nestjs/common';

export interface CertificateListQueryInput {
  page?: string;
  limit?: string;
  per_page?: string;
  status?: string | string[];
  ca_id?: string | string[];
  source?: string | string[];
  search?: string;
  has_key?: string;
  template_modified?: string;
  sort_by?: string;
  sort_order?: string;
  sort?: string;
  order?: string;
}

export interface CertificateListQuery {
  page: number;
  limit: number;
  status?: string[];
  caId?: number[];
  source?: string[];
  search?: string;
  hasKey?: boolean;
  templateModified?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const MAX_LIMIT = 100;
const ALLOWED_SORT_FIELDS = new Set(['subject', 'subject_cn', 'issuer', 'valid_to', 'valid_from', 'created_at', 'serial_number', 'revoked', 'descr', 'key_algo', 'status', 'compliance_grade']);

function values(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  return (Array.isArray(value) ? value : [value]).filter((item) => item.length > 0);
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  if (value === 'true' || value === '1' || value === 'yes') return true;
  if (value === 'false' || value === '0' || value === 'no') return false;
  throw new BadRequestException('Invalid boolean filter');
}

export function parseCertificateListQuery(input: CertificateListQueryInput): CertificateListQuery {
  const page = input.page === undefined ? 1 : Number(input.page);
  const requestedLimit = input.per_page ?? input.limit;
  const limit = requestedLimit === undefined ? 20 : Number(requestedLimit);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1) {
    throw new BadRequestException('Invalid pagination');
  }

  const status = values(input.status);
  const caValues = values(input.ca_id);
  const caId = caValues?.map(Number);
  if (caId?.some((value) => !Number.isInteger(value) || value < 1)) {
    throw new BadRequestException('Invalid ca_id filter');
  }

  const sortBy = input.sort_by ?? input.sort;
  if (sortBy !== undefined && !ALLOWED_SORT_FIELDS.has(sortBy)) throw new BadRequestException('Invalid sort field');
  const sortOrder = input.sort_order ?? input.order;
  if (sortOrder !== undefined && sortOrder !== 'asc' && sortOrder !== 'desc') throw new BadRequestException('Invalid sort order');

  const result: CertificateListQuery = { page, limit: Math.min(limit, MAX_LIMIT) };
  if (status?.length) result.status = status;
  if (caId?.length) result.caId = caId;
  const source = values(input.source);
  if (source?.length) result.source = source;
  if (input.search?.trim()) result.search = input.search.trim();
  const hasKey = parseBoolean(input.has_key);
  if (hasKey !== undefined) result.hasKey = hasKey;
  const templateModified = parseBoolean(input.template_modified);
  if (templateModified !== undefined) result.templateModified = templateModified;
  if (sortBy !== undefined) result.sortBy = sortBy;
  if (sortOrder !== undefined) result.sortOrder = sortOrder;
  return result;
}
