import type { IRequest, RequestHandler, ResponseHandler } from 'itty-router';
import { error, json } from 'itty-router';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { ContractOperation, ContractAugmentedRequest } from './types.js';
import { createResponseHelpers, validateSchema, defineProp } from './utils.js';

/**
 * Normalize headers to Record<string, string> with lowercase keys
 * @param headers - Headers object or plain object
 */
function normalizeHeaders(headers: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (!headers || typeof headers !== 'object') {
    return result;
  }

  // Check if it's a Headers-like object (has entries() method)
  // This handles both native Headers and PonyfillHeaders from @whatwg-node/server
  if ('entries' in headers && typeof (headers as Headers).entries === 'function') {
    // Use entries() for reliable iteration across different environments
    // This ensures we capture all headers regardless of how they were set
    for (const [key, value] of (headers as Headers).entries()) {
      result[key.toLowerCase()] = value;
    }
  } else {
    // Plain object - use Object.entries
    for (const [key, value] of Object.entries(headers)) {
      result[key.toLowerCase()] = String(value);
    }
  }
  return result;
}

/**
 * Middleware factory: Stores the contract operation on the request object
 * This allows subsequent middleware to access the operation for validation
 *
 * @param operation - The contract operation to attach to the request
 * @returns A middleware function that augments the request with operation metadata
 */
export function withContractOperation<TOperation extends ContractOperation>(
  operation: TOperation
): RequestHandler<IRequest> {
  return (request: IRequest) => {
    // Augment request with operation metadata for use by subsequent middleware
    (request as ContractAugmentedRequest<TOperation>).__contractOperation = operation;
  };
}

/**
 * Check if a path pattern matches a URL pathname
 * Supports patterns like "/users/:id" matching "/users/123"
 */
function matchesPathPattern(pattern: string, pathname: string): boolean {
  const patternSegments = pattern.split('/').filter(Boolean);
  const pathSegments = pathname.split('/').filter(Boolean);

  if (patternSegments.length !== pathSegments.length) {
    return false;
  }

  for (let i = 0; i < patternSegments.length; i++) {
    const patternSegment = patternSegments[i];
    const pathSegment = pathSegments[i];

    // If pattern segment is a param (starts with :), it matches any value
    if (patternSegment.startsWith(':')) {
      continue;
    }

    // Otherwise, segments must match exactly
    if (patternSegment !== pathSegment) {
      return false;
    }
  }

  return true;
}

/**
 * Global middleware factory: Finds and sets the matching contract operation
 * This should be added to the router's `before` array to run for all routes
 *
 * @param contract - The contract definition containing all operations
 * @returns A middleware function that finds and sets the matching operation
 */
export function withMatchingContractOperation<TContract extends Record<string, ContractOperation>>(
  contract: TContract,
  base?: string
): RequestHandler<IRequest> {
  return (request: IRequest) => {
    // If operation already set (e.g., by route-specific middleware), skip
    if ((request as ContractAugmentedRequest).__contractOperation) {
      return;
    }

    const method = request.method.toLowerCase();
    const pathname = new URL(request.url).pathname.slice(base?.length || 0);

    // Find matching operation by method and path pattern
    for (const operation of Object.values(contract)) {
      // Method is required, so skip operations without it (should not happen in valid contracts)
      if (!operation.method) continue;
      const operationMethod = operation.method.toLowerCase();
      if (operationMethod === method && matchesPathPattern(operation.path, pathname)) {
        (request as ContractAugmentedRequest).__contractOperation = operation;
        return;
      }
    }
  };
}

/**
 * Middleware factory: Parses and validates path parameters according to the contract
 * Extends the request with typed params property
 *
 * Execution order: This middleware runs after withParams (from itty-router) which extracts
 * path parameters from the URL. If a pathParams schema is provided, it validates against it.
 * Otherwise, it uses the raw params extracted from the path.
 *
 * @param operation - The contract operation containing pathParams schema (optional)
 * @returns A middleware function that validates and attaches typed params to the request
 */
/**
 * Extract path parameters from URL path using the operation's path pattern
 */
function extractPathParamsFromUrl(pathPattern: string, url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const patternSegments = pathPattern.split('/').filter(Boolean);
  const pathSegments = new URL(url).pathname.split('/').filter(Boolean);
  for (let i = 0; i < patternSegments.length; i++) {
    const segment = patternSegments[i];
    if (segment.startsWith(':') && i < pathSegments.length) {
      params[segment.slice(1)] = pathSegments[i];
    }
  }
  return params;
}
/**
 * Middleware factory: Parses and validates query parameters according to the contract
 * Extends the request with typed query property
 *
 * Execution order: This middleware runs after withPathParams. It extracts query parameters
 * from the URL and validates them against the contract's query schema if provided.
 *
 * @param operation - The contract operation containing query schema (optional)
 * @returns A middleware function that validates and attaches typed query params to the request
 */
/**
 * Extract query parameters from URL query string
 */
function extractQueryParamsFromUrl(url: string): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  try {
    new URL(url).searchParams.forEach((value, key) => {
      query[key] = value;
    });
  } catch {}
  return query;
}

/**
 * Get Content-Type header from request (lowercase)
 */
function getContentType(request: IRequest): string | null {
  const contentType = request.headers.get('content-type');
  if (!contentType) return null;
  // Remove charset and other parameters (e.g., "application/json; charset=utf-8" -> "application/json")
  return contentType.split(';')[0].trim().toLowerCase();
}

/**
 * Parse body data based on content type
 */
function parseBodyByContentType(contentType: string | null, bodyText: string): unknown {
  if (!contentType) {
    // Default to JSON parsing if no content type
    try {
      return JSON.parse(bodyText);
    } catch {
      return bodyText;
    }
  }

  const normalizedType = contentType.toLowerCase();
  if (normalizedType.includes('json')) {
    try {
      return JSON.parse(bodyText);
    } catch {
      return bodyText;
    }
  }
  // For other types (XML, HTML, plain text, etc.), return as string
  return bodyText;
}

/**
 * Global middleware: Validates path parameters using the operation from request
 * This reads from __contractOperation set by withMatchingContractOperation
 */
export const withPathParams: RequestHandler<IRequest> = async (request: IRequest) => {
  const operation = (request as ContractAugmentedRequest).__contractOperation;
  if (!operation) return;

  let requestParams = (request.params as Record<string, string> | undefined) || {};
  if (!Object.keys(requestParams).length && request.url) {
    requestParams = extractPathParamsFromUrl(operation.path, request.url);
  }
  const params = operation.pathParams
    ? await validateSchema<Record<string, string>>(operation.pathParams, requestParams)
    : requestParams;
  defineProp(request, 'params', params);
};

/**
 * Global middleware: Validates query parameters using the operation from request
 * This reads from __contractOperation set by withMatchingContractOperation
 */
export const withQueryParams: RequestHandler<IRequest> = async (request: IRequest) => {
  const operation = (request as ContractAugmentedRequest).__contractOperation;
  if (!operation) return;

  let requestQuery = (request.query as Record<string, unknown> | undefined) || {};
  if (!Object.keys(requestQuery).length && request.url) {
    requestQuery = extractQueryParamsFromUrl(request.url);
  }
  const query = operation.query
    ? await validateSchema<Record<string, unknown>>(operation.query, requestQuery)
    : requestQuery;
  defineProp(request, 'validatedQuery', query);
  defineProp(request, 'query', query);
};

/**
 * Try to validate headers, handling comma-separated values for specific headers
 */
async function validateHeadersWithFallback(
  schema: StandardSchemaV1,
  headers: Record<string, string>
): Promise<Record<string, unknown>> {
  try {
    // Try validating with original values first
    return await validateSchema<Record<string, unknown>>(schema, headers);
  } catch (err) {
    // If validation fails, try handling comma-separated values for certain headers
    const headersToSplit = ['accept', 'accept-encoding', 'accept-language'];
    const modifiedHeaders = { ...headers };
    let modified = false;

    for (const headerName of headersToSplit) {
      if (modifiedHeaders[headerName] && modifiedHeaders[headerName].includes(',')) {
        // Split by comma and try each value
        const values = modifiedHeaders[headerName].split(',').map((v) => v.trim());

        for (const value of values) {
          try {
            // Try validating with this single value
            const testHeaders = { ...headers, [headerName]: value };
            const validated = await validateSchema<Record<string, unknown>>(schema, testHeaders);
            // If validation succeeds, use this value
            modifiedHeaders[headerName] = value;
            modified = true;
            break;
          } catch {
            // Continue to next value
          }
        }
      }
    }

    if (modified) {
      // Try validation again with modified headers
      return await validateSchema<Record<string, unknown>>(schema, modifiedHeaders);
    }

    // If no modifications helped, rethrow original error
    throw err;
  }
}

/**
 * Global middleware: Validates headers using the operation from request
 * This reads from __contractOperation set by withMatchingContractOperation
 */
export const withHeaders: RequestHandler<IRequest> = async (request: IRequest) => {
  const operation = (request as ContractAugmentedRequest).__contractOperation;
  if (!operation) return;

  const requestHeaders = normalizeHeaders(request.headers);
  const headers = operation.headers
    ? await validateHeadersWithFallback(operation.headers, requestHeaders)
    : requestHeaders;
  defineProp(request, 'validatedHeaders', headers);
};

/**
 * Global middleware: Validates body using the operation from request
 * This reads from __contractOperation set by withMatchingContractOperation
 */
export const withBody: RequestHandler<IRequest> = async (request: IRequest) => {
  const operation = (request as ContractAugmentedRequest).__contractOperation;
  if (!operation) return;

  // If no request schemas defined, set empty body and return
  if (!operation.requests) {
    defineProp(request, 'validatedBody', {});
    return;
  }

  let bodyData: unknown = {};
  let bodyReadSuccessfully = false;
  let bodyText = '';

  try {
    bodyText = await request.text();
    bodyReadSuccessfully = true;
  } catch {
    bodyData = {};
  }

  if (bodyReadSuccessfully && bodyText.trim()) {
    // Check if request is a content-type map

    const contentType = getContentType(request);
    if (!contentType) {
      throw error(400, 'Content-Type header is required');
    }

    // Find matching schema (case-insensitive)
    const matchingEntry = Object.entries(operation.requests).find(([key]) => {
      return key.toLowerCase() === contentType;
    });

    if (!matchingEntry) {
      throw error(
        400,
        `Unsupported Content-Type: ${contentType}. Supported types: ${Object.keys(operation.requests).join(', ')}`
      );
    }

    const [, requestSchema] = matchingEntry;
    if (!requestSchema || typeof requestSchema !== 'object' || !('body' in requestSchema)) {
      throw error(500, 'Invalid request schema configuration');
    }
    bodyData = parseBodyByContentType(contentType, bodyText);
    const body = await validateSchema((requestSchema as { body: StandardSchemaV1 }).body, bodyData);
    defineProp(request, 'validatedBody', body);
  } else {
    // Empty body
    defineProp(request, 'validatedBody', bodyData);
  }
};

/**
 * Global middleware: Attaches response helpers using the operation from request
 * This reads from __contractOperation set by withMatchingContractOperation
 */
export const withResponseHelpers: RequestHandler<IRequest> = (request: IRequest) => {
  const operation = (request as ContractAugmentedRequest).__contractOperation;
  if (!operation) return;

  const helpers = createResponseHelpers(operation);
  defineProp(request, 'respond', helpers.respond);
};

/**
 * Contract-aware response formatter middleware
 *
 * Converts contract response objects (with status, body, headers) to Response objects.
 * This middleware should be used in the `finally` array of the router configuration.
 *
 * Handles three response types:
 * 1. Already a Response object - returns as-is
 * 2. Contract response object ({ status, body?, headers? }) - converts to Response
 * 3. Other values - falls back to default JSON formatter
 *
 * @param customFormatter - Optional custom formatter to use as fallback instead of default JSON formatter
 * @returns A ResponseHandler that formats contract responses
 *
 * @example
 * ```typescript
 * const router = Router({
 *   finally: [
 *     withContractFormat(),
 *   ],
 * });
 * ```
 */
export function withContractFormat(customFormatter?: ResponseHandler): ResponseHandler {
  return (response: unknown, request: unknown): Response => {
    if (response instanceof Response) return response;
    if (response && typeof response === 'object' && 'status' in response) {
      const { status, body, headers } = response as {
        status: number;
        body?: unknown;
        headers?: HeadersInit;
      };
      const responseHeaders = new Headers(headers);

      // Set default content-type if not provided
      if (!responseHeaders.has('content-type') && status !== 204) {
        responseHeaders.set('content-type', 'application/json');
      }

      // Get content-type after potentially setting default
      const contentType = responseHeaders.get('content-type') || '';

      // Serialize body appropriately based on content type
      let responseBody: BodyInit | null = null;
      if (body === undefined || body === null || status === 204) {
        responseBody = null;
      } else if (
        typeof body === 'string' &&
        (contentType.startsWith('text/') || contentType.includes('html'))
      ) {
        // Return text/HTML as-is (don't JSON.stringify)
        responseBody = body;
      } else {
        // JSON serialize for JSON content types or non-string bodies
        responseBody = JSON.stringify(body);
      }

      return new Response(responseBody, { status, headers: responseHeaders });
    }
    return customFormatter ? customFormatter(response, request as IRequest) : json(response);
  };
}

/**
 * Contract-aware error handler middleware
 *
 * Handles validation errors from schema validation and falls back to itty-router's
 * default error handler for other errors. This middleware should be used as the
 * `catch` handler in the router configuration.
 *
 * @typeParam RequestType - The request type (extends IRequest)
 * @typeParam Args - Additional arguments passed to handlers
 *
 * @returns An error handler function that handles validation errors and other errors
 *
 * @example
 * ```typescript
 * const router = Router({
 *   catch: withContractErrorHandler(),
 * });
 * ```
 */
export function withContractErrorHandler<
  RequestType extends IRequest = IRequest,
  Args extends any[] = any[],
>(): (err: unknown, request: RequestType, ...args: Args) => Response {
  return (err: unknown, request: RequestType, ..._args: Args): Response => {
    if (err instanceof Error && 'issues' in err) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: (err as Error & { issues: unknown }).issues,
        }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }

    // Handle other errors - return error message without circular reference issues
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    const statusCode =
      err && typeof err === 'object' && 'status' in err ? (err as any).status : 500;

    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      { status: statusCode, headers: { 'content-type': 'application/json' } }
    );
  };
}
