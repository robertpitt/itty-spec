/**
 * Pagination utilities
 */

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginationResult<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Paginate an array of items
 */
export function paginate<T>(items: T[], options: PaginationOptions): PaginationResult<T> {
  const { page, limit } = options;
  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedItems = items.slice(startIndex, endIndex);

  return {
    items: paginatedItems,
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}
