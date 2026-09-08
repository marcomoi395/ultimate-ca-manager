import { BadRequestException } from '@nestjs/common';

export interface CsrListQueryInput {
  page?: string;
  limit?: string;
  per_page?: string;
  search?: string;
  sort_by?: string;
  sort_order?: string;
}

export interface CsrListQuery {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const MAX_LIMIT = 100;

export function parseCsrListQuery(input: CsrListQueryInput): CsrListQuery {
  const page = input.page === undefined ? 1 : Number(input.page);
  const requestedLimit = input.limit ?? input.per_page;
  const limit = requestedLimit === undefined ? 20 : Number(requestedLimit);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1) {
    throw new BadRequestException('Invalid pagination');
  }
  const sortOrder = input.sort_order === undefined ? 'desc' : input.sort_order.toLowerCase();
  if (sortOrder !== 'asc' && sortOrder !== 'desc') {
    throw new BadRequestException('Invalid sort_order');
  }
  return {
    page,
    limit: Math.min(limit, MAX_LIMIT),
    search: input.search,
    sortBy: input.sort_by,
    sortOrder,
  };
}

