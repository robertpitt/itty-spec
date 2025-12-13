import {
  Router,
  type RouterType,
  type IRequest,
  withParams,
  error,
  json,
  type RequestHandler,
  type ResponseHandler,
} from 'itty-router';
import type { ContractDefinition } from '../types.js';
import { createBasicResponseHelpers } from './helpers.js';
import {
  withContractOperation,
  withPathParams,
  withQueryParams,
  withHeaders,
  withBody,
  withResponseHelpers,
} from './middleware.js';
import type { ContractRouterOptions } from './types.js';

/**
 * ContractRouter provides a type-safe layer on top of itty-router
 * that automatically registers routes from a contract.
 */
export const contractRouter = <
  TContract extends ContractDefinition,
  RequestType extends IRequest = IRequest,
  Args extends any[] = any[],
>(
  options: ContractRouterOptions<TContract, RequestType, Args>
) => {
  // Default missing handler
  const defaultMissing: RequestHandler<RequestType, Args> = (
    _request: RequestType,
    ..._args: Args
  ) => error(404);

  // Wrap missing handler to attach response helpers
  const wrappedMissingHandler: RequestHandler<RequestType, Args> = (
    request: RequestType,
    ...args: Args
  ) => {
    if (options.missing) {
      // Attach response helpers to request for missing handler
      const requestWithHelpers = {
        ...request,
        ...createBasicResponseHelpers(),
      } as any;
      return options.missing(requestWithHelpers, ...args);
    }
    return defaultMissing(request, ...args);
  };

  // Create contract-aware format function
  const contractFormat: ResponseHandler = (response: any, _request: any) => {
    // If response is already a Response, return it
    if (response instanceof Response) {
      return response;
    }

    // If response is a contract response object (has status and body)
    if (response && typeof response === 'object' && 'status' in response) {
      const { status, body, headers } = response as {
        status: number;
        body?: any;
        headers?: HeadersInit;
      };

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

    // Fall back to default JSON formatter
    return options.format ? options.format(response, _request) : json(response);
  };

  // Create error handler that handles Zod validation errors
  const contractErrorHandler = (err: any, request: RequestType) => {
    // Handle validation errors
    if (err instanceof Error && 'issues' in err) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: err.issues,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Fall back to default error handler
    return error(err, request);
  };

  // Create router with middleware
  const router = Router<RequestType, Args, Response>({
    base: options.base,
    before: [
      // @ts-ignore
      withParams,
      ...(options.before || []),
    ],
    // @ts-ignore
    catch: contractErrorHandler,
    finally: [
      // @ts-ignore
      (r: any, request: RequestType, ...args: Args) => r ?? wrappedMissingHandler(request, ...args),
      contractFormat,
      ...(options.finally || []),
    ],
  });

  // Register routes for each operation in the contract
  for (const [operationId, operation] of Object.entries(options.contract)) {
    const handler = options.handlers[operationId as keyof TContract];

    if (!handler) {
      // Skip operations without handlers
      continue;
    }

    // Register route based on HTTP method
    const method = operation.method.toLowerCase() as Lowercase<typeof operation.method>;
    const path = operation.path;

    // Create middleware chain for this operation
    // Order: operation → path params → query params → headers → body → response helpers
    const operationMiddleware = [
      withContractOperation(operation),
      withPathParams(operation),
      withQueryParams(operation),
      withHeaders(operation),
      withBody(operation),
      withResponseHelpers(operation),
    ];

    // Create a wrapper handler that calls the contract handler
    // The middleware chain will have already parsed and validated the request
    const wrappedHandler = async (request: IRequest, ..._args: Args) => {
      // Call the contract handler with typed request (includes response helpers)
      // TypeScript will ensure type safety at compile time
      const response = await (handler as any)(request);

      return response;
    };

    // Register the route with itty-router using route-level generic typing
    // Apply middleware chain before the handler
    // This aligns with itty-router's pattern: router.get<RequestType>('/path', ...middleware, handler)
    router[method]<IRequest, Args>(path, ...operationMiddleware, wrappedHandler);
  }

  return router as RouterType<RequestType, Args, Response>;
};

// Re-export types for convenience
export type {
  ContractRequest,
  HandlerResponse,
  TypedContractRequest,
  Handler,
  Router,
  ContractRouterOptions,
  ValidStatusCodes,
  ResponseBodyForStatus,
  ResponseHeadersForStatus,
  TypedResponseHelpers,
} from './types.js';
