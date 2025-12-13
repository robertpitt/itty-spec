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
import { createResponseHelpers } from './utils.js';

/**
 * Converts Headers object or plain object to a Record<string, string>
 * Utility function to normalize header access across different request types
 * Preserves original header key case when possible
 */
function normalizeHeaders(headers: unknown): Record<string, string> {
  const result: Record<string, string> = {};

  if (headers instanceof Headers) {
    // Headers API normalizes keys to lowercase when iterating
    // However, we can try to preserve case by checking if the headers object
    // has any special properties or by using a different iteration method
    // For now, we'll iterate and preserve the case as much as possible
    // Note: This is a limitation of the Headers API - it always normalizes to lowercase
    // But we'll try to preserve case by checking the original keys if available
    const headerMap = new Map<string, string>();
    headers.forEach((value, key) => {
      // Headers API gives us lowercase keys, but we'll store them as-is
      // If the original had a different case, we can't recover it from Headers API
      headerMap.set(key.toLowerCase(), value);
    });
    
    // Try to preserve original case by checking if we can get it from the headers object
    // This is a workaround for the Headers API limitation
    // We'll use the lowercase keys from Headers, but try to match against common header cases
    headerMap.forEach((value, lowerKey) => {
      // Common header cases to try
      const commonCases: Record<string, string> = {
        'authorization': 'Authorization',
        'content-type': 'Content-Type',
        'content-length': 'Content-Length',
        'accept': 'Accept',
        'user-agent': 'User-Agent',
      };
      
      // Use common case if available, otherwise use lowercase
      const preservedKey = commonCases[lowerKey] || lowerKey;
      result[preservedKey] = value;
    });
  } else if (headers && typeof headers === 'object') {
    // For plain objects, preserve the original case
    for (const [key, value] of Object.entries(headers)) {
      result[key] = String(value);
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
 * e.g., path pattern "/users/:id" with URL "/users/123" -> { id: "123" }
 */
function extractPathParamsFromUrl(pathPattern: string, url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const urlObj = new URL(url);
  const pathname = urlObj.pathname;
  
  // Split path pattern and actual pathname into segments
  const patternSegments = pathPattern.split('/').filter(Boolean);
  const pathSegments = pathname.split('/').filter(Boolean);
  
  // Match segments and extract params
  for (let i = 0; i < patternSegments.length; i++) {
    const patternSegment = patternSegments[i];
    if (patternSegment.startsWith(':')) {
      const paramName = patternSegment.slice(1);
      if (i < pathSegments.length) {
        params[paramName] = pathSegments[i];
      }
    }
  }
  
  return params;
}

export function withPathParams<TOperation extends ContractOperation>(
  operation: TOperation
): RequestHandler<IRequest> {
  return async (request: IRequest) => {
    // Get params from request if already extracted by withParams middleware
    let requestParams: Record<string, string> =
      (request.params as Record<string, string> | undefined) || {};
    
    // If params are empty and we have a path pattern, extract them from URL
    if (Object.keys(requestParams).length === 0 && request.url) {
      requestParams = extractPathParamsFromUrl(operation.path, request.url);
    }
    
    let params: Record<string, string> = {};

    if (operation.pathParams) {
      // If pathParams schema is provided, validate against it
      // Standard Schema validate returns a Result type with value or issues
      const result = await operation.pathParams['~standard'].validate(requestParams);
      
      // Check if validation failed (has issues property)
      if ('issues' in result && result.issues) {
        const error = new Error('Validation failed');
        (error as any).issues = result.issues;
        throw error;
      }
      
      // Extract value from successful validation result
      params = (result as { value: Record<string, string> }).value;
    } else {
      // Otherwise, use params extracted from path
      params = requestParams;
    }

    // Attach typed params to request
    // Type assertion is safe because we've validated against the schema or extracted from path
    // Use defineProperty to ensure the property can be set even if it already exists
    Object.defineProperty(request, 'params', {
      value: params as ContractOperationParameters<TOperation>,
      writable: true,
      enumerable: true,
      configurable: true,
    });
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
    const urlObj = new URL(url);
    urlObj.searchParams.forEach((value, key) => {
      query[key] = value;
    });
  } catch {
    // If URL parsing fails, return empty object
  }
  return query;
}

export function withQueryParams<TOperation extends ContractOperation>(
  operation: TOperation
): RequestHandler<IRequest> {
  return async (request: IRequest) => {
    // Get query from request if already extracted
    let requestQuery: Record<string, unknown> =
      (request.query as Record<string, unknown> | undefined) || {};
    
    // If query is empty and we have a URL, extract from URL
    if (Object.keys(requestQuery).length === 0 && request.url) {
      requestQuery = extractQueryParamsFromUrl(request.url);
    }
    
    let query: Record<string, unknown> = {};

    if (operation.query) {
      // Standard Schema validate returns a Result type with value or issues
      const result = await operation.query['~standard'].validate(requestQuery);
      
      // Check if validation failed (has issues property)
      if ('issues' in result && result.issues) {
        const error = new Error('Validation failed');
        (error as any).issues = result.issues;
        throw error;
      }
      
      // Extract value from successful validation result
      query = (result as { value: Record<string, unknown> }).value;
    } else {
      query = requestQuery;
    }

    // Attach typed query to request
    // Type assertion is safe because we've validated against the schema
    // Use defineProperty to ensure the property can be set even if it already exists
    Object.defineProperty(request, 'query', {
      value: query as ContractOperationQuery<TOperation>,
      writable: true,
      enumerable: true,
      configurable: true,
    });
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
/**
 * Normalize headers for validation (always use lowercase keys)
 * This is used when we have a schema that expects lowercase keys
 */
function normalizeHeadersForValidation(headers: unknown): Record<string, string> {
  const result: Record<string, string> = {};

  if (headers instanceof Headers) {
    // For validation, use lowercase keys as Headers API provides
    headers.forEach((value, key) => {
      result[key] = value; // key is already lowercase from Headers API
    });
  } else if (headers && typeof headers === 'object') {
    // For plain objects, convert keys to lowercase for validation
    for (const [key, value] of Object.entries(headers)) {
      result[key.toLowerCase()] = String(value);
    }
  }

  return result;
}

export function withHeaders<TOperation extends ContractOperation>(
  operation: TOperation
): RequestHandler<IRequest> {
  return async (request: IRequest) => {
    let headers: Record<string, unknown> = {};

    if (operation.headers) {
      // Extract and normalize headers from the request (use lowercase for validation)
      const requestHeaders = normalizeHeadersForValidation(request.headers);
      // Validate against the contract schema
      // Standard Schema validate returns a Result type with value or issues
      const result = await operation.headers['~standard'].validate(requestHeaders);
      
      // Check if validation failed (has issues property)
      if ('issues' in result && result.issues) {
        const error = new Error('Validation failed');
        (error as any).issues = result.issues;
        throw error;
      }
      
      // Extract value from successful validation result
      headers = (result as { value: Record<string, unknown> }).value;
    } else {
      // If no headers schema, extract headers preserving case when possible
      headers = normalizeHeaders(request.headers);
    }

    // Attach typed headers to request
    // Type assertion is safe because we've validated against the schema
    // Use defineProperty to override the read-only headers getter from native Request
    Object.defineProperty(request, 'headers', {
      value: headers as ContractOperationHeaders<TOperation>,
      writable: true,
      enumerable: true,
      configurable: true,
    });
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
    let body: unknown = undefined;

    if (operation.request) {
      let bodyData: unknown = {};

      // Try to read request body
      // Note: Request bodies can only be read once, so if this fails, the body was already consumed
      let bodyReadSuccessfully = false;
      try {
        const bodyText = await request.text();
        bodyReadSuccessfully = true;
        if (bodyText && bodyText.trim()) {
          try {
            bodyData = JSON.parse(bodyText);
          } catch {
            // If JSON parsing fails, use raw text
            // This allows for non-JSON body types if needed
            bodyData = bodyText;
          }
        }
      } catch {
        // If reading body fails (e.g., already consumed), use empty object
        // Set bodyData to empty object but don't validate it
        // This allows handlers to check if body exists without throwing validation error
        bodyData = {};
        bodyReadSuccessfully = false;
      }

      // Only validate if we successfully read the body
      if (bodyReadSuccessfully) {
        // Validate against the contract schema
        // Standard Schema validate returns a Result type with value or issues
        const result = await operation.request['~standard'].validate(bodyData);
        
        // Check if validation failed (has issues property)
        if ('issues' in result && result.issues) {
          const error = new Error('Validation failed');
          (error as any).issues = result.issues;
          throw error;
        }
        
        // Extract value from successful validation result
        body = result.value as ContractOperationBody<TOperation>;
      } else {
        // Body couldn't be read - set to empty object without validation
        // This allows handlers to check if body exists
        body = bodyData as unknown as ContractOperationBody<TOperation>;
      }
    }

    // Attach typed body to request
    // Type assertion is safe because we've validated against the schema
    // Use defineProperty to ensure the property can be set even if it already exists
    Object.defineProperty(request, 'body', {
      value: body as ContractOperationBody<TOperation>,
      writable: true,
      enumerable: true,
      configurable: true,
    });
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
    // Attach response helpers to request
    // These helpers provide type-safe response creation methods
    const helpers = createResponseHelpers(operation);
    // Use defineProperty for each helper method to ensure they can be set
    Object.defineProperty(request, 'json', {
      value: helpers.json,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(request, 'error', {
      value: helpers.error,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(request, 'noContent', {
      value: helpers.noContent,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  };
}

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
    // If response is already a Response, return it
    if (response instanceof Response) {
      return response;
    }

    // If response is a contract response object (has status and body)
    if (response && typeof response === 'object' && 'status' in response) {
      const contractResponse = response as {
        status: number;
        body?: unknown;
        headers?: HeadersInit;
      };

      const { status, body, headers } = contractResponse;
      const responseHeaders = new Headers(headers);

      // Set Content-Type if not already set (unless it's a 204 No Content)
      if (!responseHeaders.has('Content-Type') && status !== 204) {
        responseHeaders.set('Content-Type', 'application/json');
      }

      // Handle void responses (e.g., 204 No Content)
      if (body === undefined || body === null || status === 204) {
        return new Response(null, {
          status,
          headers: responseHeaders,
        });
      }

      return new Response(JSON.stringify(body), {
        status,
        headers: responseHeaders,
      });
    }

    // Fall back to custom formatter or default JSON formatter
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
    // Handle validation errors (from Standard Schema validation)
    // Validation errors typically have an 'issues' property with validation details
    if (err instanceof Error && 'issues' in err) {
      const validationError = err as Error & { issues: unknown };
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: validationError.issues,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Fall back to itty-router's default error handler for other errors
    return error(400, request);
  };
}
