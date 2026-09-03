import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from '../constants/pagination.constants';
import { BaseListQueryDto, NormalizedListQueryParams } from '../dto/base-list-query.dto';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { PaginatedResponseDto, PaginationMetaDto } from '../dto/paginated-response.dto';

export interface OffsetPaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export function normalizePagination(
  paginationQueryDto?: PaginationQueryDto,
): OffsetPaginationParams {
  const page = Math.max(paginationQueryDto?.page ?? DEFAULT_PAGE, DEFAULT_PAGE);
  const limit = Math.min(Math.max(paginationQueryDto?.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMetaDto {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: totalPages > 0 && page < totalPages,
    hasPreviousPage: page > 1,
  };
}

export function createPaginatedResponse<T>(
  items: T[],
  page: number,
  limit: number,
  total: number,
): PaginatedResponseDto<T> {
  return {
    items,
    meta: buildPaginationMeta(page, limit, total),
  };
}

export function normalizeListQuery(listQueryDto?: BaseListQueryDto): NormalizedListQueryParams {
  const { page, limit, skip } = normalizePagination(listQueryDto);
  const search = listQueryDto?.search?.trim();

  return {
    page,
    limit,
    skip,
    ...(search ? { search } : {}),
  };
}
