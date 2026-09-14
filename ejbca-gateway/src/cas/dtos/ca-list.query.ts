import { BadRequestException } from '@nestjs/common';

export interface CaListQueryInput {
  page?: string;
  limit?: string;
  per_page?: string;
  search?: string;
  status?: string;
  type?: string;
  sort_by?: string;
  sort_order?: string;
}

export interface CaListQuery {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  type?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const MAX_LIMIT = 100;

export function parseCaListQuery(input: CaListQueryInput): CaListQuery {
  const page = input.page === undefined ? 1 : Number(input.page);
  const requestedLimit = input.limit ?? input.per_page;
  const limit = requestedLimit === undefined ? 20 : Number(requestedLimit);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1) {
    throw new BadRequestException('Invalid pagination');
  }
  if (input.sort_order !== undefined && input.sort_order !== 'asc' && input.sort_order !== 'desc') {
    throw new BadRequestException('Invalid sort order');
  }
  return {
    page,
    limit: Math.min(limit, MAX_LIMIT),
    search: input.search,
    status: input.status,
    type: input.type,
    sortBy: input.sort_by,
    sortOrder: input.sort_order,
  };
}
