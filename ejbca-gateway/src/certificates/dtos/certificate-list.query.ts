import { BadRequestException } from '@nestjs/common';

export interface CertificateListQueryInput {
  page?: string;
  limit?: string;
  per_page?: string;
  status?: string;
  ca_id?: string;
  source?: string;
  search?: string;
  has_key?: string;
  template_modified?: string;
  sort_by?: string;
  sort_order?: string;
}

export interface CertificateListQuery {
  page: number;
  limit: number;
  status?: string;
  caId?: string;
  source?: string;
  search?: string;
  hasKey?: boolean;
  templateModified?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const MAX_LIMIT = 100;

export function parseCertificateListQuery(input: CertificateListQueryInput): CertificateListQuery {
  const page = input.page === undefined ? 1 : Number(input.page);
  const requestedLimit = input.limit ?? input.per_page;
  const limit = requestedLimit === undefined ? 20 : Number(requestedLimit);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1) {
    throw new BadRequestException('Invalid pagination');
  }

  const parseBoolean = (value: string | undefined): boolean | undefined => {
    if (value === undefined) return undefined;
    if (value === 'true') return true;
    if (value === 'false') return false;
    throw new BadRequestException('Invalid boolean filter');
  };

  const sortOrder = input.sort_order;
  if (sortOrder !== undefined && sortOrder !== 'asc' && sortOrder !== 'desc') {
    throw new BadRequestException('Invalid sort order');
  }

  return {
    page,
    limit: Math.min(limit, MAX_LIMIT),
    status: input.status,
    caId: input.ca_id,
    source: input.source,
    search: input.search,
    hasKey: parseBoolean(input.has_key),
    templateModified: parseBoolean(input.template_modified),
    sortBy: input.sort_by,
    sortOrder,
  };
}
