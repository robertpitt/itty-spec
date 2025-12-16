import { z } from 'zod/v4';

/**
 * Common error response schema
 */
export const ErrorResponse = z
  .object({
    error: z
      .string()
      .meta({ title: 'Error Message', description: 'A human-readable error message' }),
    code: z
      .string()
      .optional()
      .meta({ title: 'Error Code', description: 'An error code for programmatic handling' }),
    details: z
      .record(z.string(), z.unknown())
      .optional()
      .meta({ title: 'Error Details', description: 'Additional error details' }),
  })
  .meta({ title: 'Error Response', description: 'Standard error response format' });

/**
 * Pagination query parameters
 */
export const PaginationQuery = z
  .object({
    page: z
      .string()
      .default('1')
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(1).max(1000))
      .optional()
      .meta({ title: 'Page', description: 'Page number (1-indexed)' }),
    limit: z
      .string()
      .default('20')
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().min(1).max(100))
      .optional()
      .meta({ title: 'Limit', description: 'Number of items per page' }),
  })
  .meta({ title: 'Pagination Query', description: 'Pagination parameters' });

/**
 * Paginated response metadata
 */
export const PaginationMeta = z
  .object({
    page: z.number().meta({ title: 'Current Page', description: 'Current page number' }),
    limit: z.number().meta({ title: 'Items Per Page', description: 'Number of items per page' }),
    total: z.number().meta({ title: 'Total Items', description: 'Total number of items' }),
    totalPages: z.number().meta({ title: 'Total Pages', description: 'Total number of pages' }),
  })
  .meta({ title: 'Pagination Metadata', description: 'Pagination information' });

/**
 * Common headers for authenticated requests
 * Note: Authorization is optional for the complex example (mock responses)
 */
export const AuthHeaders = z
  .object({
    authorization: z
      .jwt({ alg: 'HS256' })
      .startsWith('Bearer ')
      .meta({ title: 'Authorization', description: 'Bearer token for authentication' }),
  })
  .meta({ title: 'Authentication Headers', description: 'Headers for authenticated endpoints' });

/**
 * ID parameter schema
 */
export const IdParam = z
  .object({
    id: z.uuid().meta({ title: 'ID', description: 'Resource identifier (UUID)' }),
  })
  .meta({ title: 'ID Parameter', description: 'Path parameter for resource ID' });
