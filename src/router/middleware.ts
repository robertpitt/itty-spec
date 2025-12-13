import type { IRequest } from 'itty-router';
import type { RequestHandler } from 'itty-router';
import type {
  ContractOperation,
  ExtractPathParamsType,
  ExtractQueryType,
  ExtractBodyType,
  ExtractHeadersType,
} from '../types.js';
import { createResponseHelpers } from './helpers.js';

/**
 * Middleware factory: Stores the contract operation on the request object
 * This allows subsequent middleware to access the operation for validation
 */
export function withContractOperation<TOperation extends ContractOperation>(
  operation: TOperation
): RequestHandler<IRequest> {
  return (request: IRequest) => {
    (request as any).__contractOperation = operation;
  };
}

/**
 * Middleware factory: Parses and validates path parameters according to the contract
 * Extends the request with typed params property
 */
export function withPathParams<TOperation extends ContractOperation>(
  operation: TOperation
): RequestHandler<IRequest> {
  return async (request: IRequest) => {
    const requestParams: Record<string, string> =
      (request.params as Record<string, string> | undefined) || {};
    let params: Record<string, string> = {};

    if (operation.pathParams) {
      // If pathParams schema is provided, validate against it
      params = (await operation.pathParams['~standard'].validate(requestParams)) as any;
    } else {
      // Otherwise, use params from withParams middleware (already extracted from path)
      params = requestParams;
    }

    // Attach typed params to request
    (request as any).params = params as ExtractPathParamsType<TOperation>;
  };
}

/**
 * Middleware factory: Parses and validates query parameters according to the contract
 * Extends the request with typed query property
 */
export function withQueryParams<TOperation extends ContractOperation>(
  operation: TOperation
): RequestHandler<IRequest> {
  return async (request: IRequest) => {
    const requestQuery: Record<string, unknown> =
      (request.query as Record<string, unknown> | undefined) || {};
    let query: Record<string, unknown> = {};

    if (operation.query) {
      query = (await operation.query['~standard'].validate(requestQuery)) as any;
    } else {
      query = requestQuery;
    }

    // Attach typed query to request
    (request as any).query = query as ExtractQueryType<TOperation>;
  };
}

/**
 * Middleware factory: Parses and validates request headers according to the contract
 * Extends the request with typed headers property
 */
export function withHeaders<TOperation extends ContractOperation>(
  operation: TOperation
): RequestHandler<IRequest> {
  return async (request: IRequest) => {
    let headers: Record<string, unknown> = {};

    if (operation.headers) {
      // Extract headers from the request
      // Headers can be accessed via request.headers (Headers object) or request.headers (Record)
      const requestHeaders: Record<string, string> = {};

      // Convert Headers object to plain object
      if (request.headers instanceof Headers) {
        request.headers.forEach((value, key) => {
          requestHeaders[key] = value;
        });
      } else if (request.headers && typeof request.headers === 'object') {
        // Handle case where headers might already be a plain object
        for (const [key, value] of Object.entries(request.headers)) {
          requestHeaders[key] = String(value);
        }
      }

      headers = (await operation.headers['~standard'].validate(requestHeaders)) as any;
    } else {
      // If no headers schema, extract headers as-is
      if (request.headers instanceof Headers) {
        request.headers.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (request.headers && typeof request.headers === 'object') {
        // Convert to plain object
        for (const [key, value] of Object.entries(request.headers)) {
          headers[key] = value;
        }
      }
    }

    // Attach typed headers to request
    (request as any).headers = headers as ExtractHeadersType<TOperation>;
  };
}

/**
 * Middleware factory: Parses and validates request body according to the contract
 * Extends the request with typed body property
 */
export function withBody<TOperation extends ContractOperation>(
  operation: TOperation
): RequestHandler<IRequest> {
  return async (request: IRequest) => {
    let body: unknown = undefined;

    if (operation.request) {
      let bodyData: unknown = {};

      // Try to read request body
      try {
        const bodyText = await request.text();
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
        // Zod validation will catch if body is required
        bodyData = {};
      }

      body = operation.request['~standard'].validate(bodyData);
    }

    // Attach typed body to request
    (request as any).body = body as ExtractBodyType<TOperation>;
  };
}

/**
 * Middleware factory: Attaches typed response helper methods to the request object
 * These helpers validate responses against the contract's response schemas
 */
export function withResponseHelpers<TOperation extends ContractOperation>(
  operation: TOperation
): RequestHandler<IRequest> {
  return (request: IRequest) => {
    // Attach response helpers to request
    Object.assign(request, createResponseHelpers(operation));
  };
}
