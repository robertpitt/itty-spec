import type { IRequest, RequestHandler, ResponseHandler } from 'itty-router';
import { error, json } from 'itty-router';
import type {
  ContractOperation,
  ContractOperationParameters,
  ContractOperationQuery,
  ContractOperationBody,
  ContractOperationHeaders,
  ContractAugmentedRequest,
} from './types.js';
import { createResponseHelpers, validateSchema, defineProp } from './utils.js';

const COMMON_HEADER_CASES: Record<string, string> = {
  authorization: 'Authorization',
  'content-type': 'Content-Type',
  'content-length': 'Content-Length',
  accept: 'Accept',
  'user-agent': 'User-Agent',
};

/**
 * Normalize headers to Record<string, string>
 * @param headers - Headers object or plain object
 * @param preserveCase - Whether to preserve header case (default: true)
 */
function normalizeHeaders(headers: unknown, preserveCase = true): Record<string, string> {
  const result: Record<string, string> = {};
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      result[preserveCase ? COMMON_HEADER_CASES[key] || key : key] = value;
    });
  } else if (headers && typeof headers === 'object') {
    for (const [key, value] of Object.entries(headers)) {
      result[preserveCase ? key : key.toLowerCase()] = String(value);
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

    const method = request.method.toUpperCase();
    const pathname = new URL(request.url).pathname.slice(base?.length || 0);

    // Find matching operation by method and path pattern
    for (const operation of Object.values(contract)) {
      const operationMethod = (operation.method || 'GET').toUpperCase();
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

export function withPathParams<TOperation extends ContractOperation>(
  operation: TOperation
): RequestHandler<IRequest> {
  return async (request: IRequest) => {
    let requestParams = (request.params as Record<string, string> | undefined) || {};
    if (!Object.keys(requestParams).length && request.url) {
      requestParams = extractPathParamsFromUrl(operation.path, request.url);
    }
    const params = operation.pathParams
      ? await validateSchema<Record<string, string>>(operation.pathParams, requestParams)
      : requestParams;
    defineProp(request, 'params', params as ContractOperationParameters<TOperation>);
  };
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

export function withQueryParams<TOperation extends ContractOperation>(
  operation: TOperation
): RequestHandler<IRequest> {
  return async (request: IRequest) => {
    let requestQuery = (request.query as Record<string, unknown> | undefined) || {};
    if (!Object.keys(requestQuery).length && request.url) {
      requestQuery = extractQueryParamsFromUrl(request.url);
    }
    const query = operation.query
      ? await validateSchema<Record<string, unknown>>(operation.query, requestQuery)
      : requestQuery;
    const typedQuery = query as ContractOperationQuery<TOperation>;
    defineProp(request, 'validatedQuery', typedQuery);
    defineProp(request, 'query', typedQuery);
  };
}

/**
 * Middleware factory: Parses and validates request headers according to the contract
 * Extends the request with typed headers property
 *
 * Execution order: This middleware runs after withQueryParams. It extracts headers from
 * the request and validates them against the contract's headers schema if provided.
 *
 * @param operation - The contract operation containing headers schema (optional)
 * @returns A middleware function that validates and attaches typed headers to the request
 */
export function withHeaders<TOperation extends ContractOperation>(
  operation: TOperation
): RequestHandler<IRequest> {
  return async (request: IRequest) => {
    const requestHeaders = normalizeHeaders(request.headers, !operation.headers);
    const headers = operation.headers
      ? await validateSchema<Record<string, unknown>>(operation.headers, requestHeaders)
      : requestHeaders;
    defineProp(request, 'validatedHeaders', headers as ContractOperationHeaders<TOperation>);
  };
}

/**
 * Middleware factory: Parses and validates request body according to the contract
 * Extends the request with typed body property
 *
 * Execution order: This middleware runs after withHeaders. It reads and parses the request
 * body, then validates it against the contract's request schema if provided.
 *
 * IMPORTANT: Request bodies can only be read once. If the body has already been consumed
 * (e.g., by previous middleware), this will use an empty object and validation will fail
 * if a body is required by the contract.
 *
 * @param operation - The contract operation containing request body schema (optional)
 * @returns A middleware function that validates and attaches typed body to the request
 */
export function withBody<TOperation extends ContractOperation>(
  operation: TOperation
): RequestHandler<IRequest> {
  return async (request: IRequest) => {
    if (!operation.request) return;
    let bodyData: unknown = {};
    let bodyReadSuccessfully = false;
    try {
      const bodyText = await request.text();
      bodyReadSuccessfully = true;
      if (bodyText?.trim()) {
        try {
          bodyData = JSON.parse(bodyText);
        } catch {
          bodyData = bodyText;
        }
      }
    } catch {
      bodyData = {};
    }
    const body = bodyReadSuccessfully
      ? await validateSchema<ContractOperationBody<TOperation>>(operation.request, bodyData)
      : (bodyData as ContractOperationBody<TOperation>);
    defineProp(request, 'validatedBody', body);
  };
}

/**
 * Middleware factory: Attaches typed response helper methods to the request object
 * These helpers validate responses against the contract's response schemas
 *
 * Execution order: This middleware runs last in the chain, after withBody. It attaches
 * response helper methods (json, error, noContent) to the request object that handlers
 * can use to create type-safe responses.
 *
 * @param operation - The contract operation to create response helpers for
 * @returns A middleware function that attaches response helpers to the request
 */
export function withResponseHelpers<TOperation extends ContractOperation>(
  operation: TOperation
): RequestHandler<IRequest> {
  return (request: IRequest) => {
    const helpers = createResponseHelpers(operation);
    defineProp(request, 'respond', helpers.respond);
  };
}

/**
 * Global middleware: Validates path parameters using the operation from request
 * This reads from __contractOperation set by withMatchingContractOperation
 */
export const withGlobalPathParams: RequestHandler<IRequest> = async (request: IRequest) => {
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
export const withGlobalQueryParams: RequestHandler<IRequest> = async (request: IRequest) => {
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
 * Global middleware: Validates headers using the operation from request
 * This reads from __contractOperation set by withMatchingContractOperation
 */
export const withGlobalHeaders: RequestHandler<IRequest> = async (request: IRequest) => {
  const operation = (request as ContractAugmentedRequest).__contractOperation;
  if (!operation) return;

  const requestHeaders = normalizeHeaders(request.headers, !operation.headers);
  const headers = operation.headers
    ? await validateSchema<Record<string, unknown>>(operation.headers, requestHeaders)
    : requestHeaders;
  defineProp(request, 'validatedHeaders', headers);
};

/**
 * Global middleware: Validates body using the operation from request
 * This reads from __contractOperation set by withMatchingContractOperation
 */
export const withGlobalBody: RequestHandler<IRequest> = async (request: IRequest) => {
  const operation = (request as ContractAugmentedRequest).__contractOperation;
  if (!operation || !operation.request) return;

  let bodyData: unknown = {};
  let bodyReadSuccessfully = false;
  try {
    const bodyText = await request.text();
    bodyReadSuccessfully = true;
    if (bodyText?.trim()) {
      try {
        bodyData = JSON.parse(bodyText);
      } catch {
        bodyData = bodyText;
      }
    }
  } catch {
    bodyData = {};
  }
  const body = bodyReadSuccessfully ? await validateSchema(operation.request, bodyData) : bodyData;
  defineProp(request, 'validatedBody', body);
};

/**
 * Global middleware: Attaches response helpers using the operation from request
 * This reads from __contractOperation set by withMatchingContractOperation
 */
export const withGlobalResponseHelpers: RequestHandler<IRequest> = (request: IRequest) => {
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

      // Set default Content-Type if not provided
      if (!responseHeaders.has('Content-Type') && status !== 204) {
        responseHeaders.set('Content-Type', 'application/json');
      }

      // Get Content-Type after potentially setting default
      const contentType = responseHeaders.get('Content-Type') || '';

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
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return error(400, request);
  };
}
