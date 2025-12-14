import {
  Router,
  type RouterType,
  type IRequest,
  withParams,
  error,
  type RequestHandler,
  type ResponseHandler,
} from 'itty-router';
import type {
  ContractDefinition,
  ContractRouterOptions,
  ContractRequest,
  HttpMethod,
} from './types';
import { createBasicResponseHelpers } from './utils';
import {
  withContractOperation,
  withPathParams,
  withQueryParams,
  withHeaders,
  withBody,
  withResponseHelpers,
  withContractFormat,
  withContractErrorHandler,
} from './middleware.js';

/**
 * Creates a type-safe router from a contract definition
 *
 * This function automatically registers routes from a contract definition, providing:
 * - Automatic route registration based on contract operations
 * - Type-safe request/response handling
 * - Automatic validation of path params, query params, headers, and body
 * - Type-safe response helpers (json, error, noContent)
 *
 * @typeParam TContract - The contract definition type
 * @typeParam RequestType - The request type (extends IRequest)
 * @typeParam Args - Additional arguments passed to handlers
 *
 * @param options - Router configuration options
 * @param options.contract - The contract definition mapping operation IDs to operations
 * @param options.handlers - Handlers for each operation in the contract
 * @param options.base - Optional base path for all routes
 * @param options.missing - Optional handler for missing routes (defaults to 404)
 * @param options.before - Optional middleware to run before handlers
 * @param options.finally - Optional middleware to run after handlers
 * @param options.format - Optional custom response formatter
 *
 * @returns An itty-router instance with registered routes
 *
 * @example
 * ```typescript
 * const router = contractRouter({
 *   contract: myContract,
 *   handlers: {
 *     getUsers: async (request) => {
 *       return request.json({ users: [] }, 200);
 *     },
 *   },
 * });
 * ```
 */
export const contractRouter = <
  TContract extends ContractDefinition,
  RequestType extends IRequest = IRequest,
  Args extends any[] = any[],
>(
  options: ContractRouterOptions<TContract, RequestType, Args>
) => {
  /**
   * Default missing handler
   * @param _request - The request object
   * @param _args - The arguments
   * @returns A 404 error response
   */
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
      } as RequestType & {
        json: (body: any, status: number, headers?: HeadersInit) => any;
        error: (status: number, body: any, headers?: HeadersInit) => any;
        noContent: (status: number) => any;
      };
      return options.missing(requestWithHelpers, ...args);
    }
    return defaultMissing(request, ...args);
  };

  // Create router with middleware
  // Note: withParams from itty-router is typed as RequestHandler but may have slight type differences
  // We cast it to ensure compatibility with Router's before array
  const beforeMiddleware: RequestHandler<RequestType, Args>[] = [
    withParams as unknown as RequestHandler<RequestType, Args>,
    ...(options.before || []),
  ];

  // Create typed error handler middleware
  const errorHandler = withContractErrorHandler<RequestType, Args>();

  // Finally handler processes responses and handles missing routes
  // Note: itty-router's finally handlers receive (response, request, ...args) but ResponseHandler
  // type only includes (response, request). We use a type assertion to handle the args parameter.
  const finallyHandlers: ResponseHandler[] = [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((response: any, request: any, ...args: any[]) => {
      // If no response was returned, call missing handler
      if (response === null || response === undefined) {
        return wrappedMissingHandler(request as RequestType, ...(args as Args));
      }
      return response as Response;
    }) as unknown as ResponseHandler,
    withContractFormat(options.format),
    ...(options.finally || []),
  ];

  const router = Router<RequestType, Args, Response>({
    base: options.base,
    before: beforeMiddleware,
    catch: errorHandler,
    finally: finallyHandlers,
  });

  /**
   * Register routes for each operation in the contract
   *
   * For each operation:
   * 1. Extracts the handler from options.handlers
   * 2. Creates a middleware chain that validates and augments the request
   * 3. Registers the route with itty-router
   *
   * Middleware chain execution order:
   * 1. withContractOperation - Stores operation metadata on request
   * 2. withPathParams - Validates and attaches typed path parameters
   * 3. withQueryParams - Validates and attaches typed query parameters
   * 4. withHeaders - Validates and attaches typed headers
   * 5. withBody - Validates and attaches typed request body
   * 6. withResponseHelpers - Attaches typed response helper methods (json, error, noContent)
   */
  for (const [contractKey, operation] of Object.entries(options.contract)) {
    const handler = options.handlers[contractKey as keyof TContract];

    if (!handler) {
      // Skip operations without handlers
      continue;
    }

    // Use contract key as default operationId if not explicitly provided
    const operationId = operation.operationId ?? contractKey;

    // Default method to 'GET' if not provided
    const method = (operation.method ?? 'GET').toLowerCase() as Lowercase<HttpMethod>;
    const path = operation.path;

    // Create operation with defaults applied for middleware
    const operationWithDefaults = {
      ...operation,
      operationId,
      method: operation.method ?? 'GET',
    };

    // Create middleware chain for this operation
    // Order: operation → path params → query params → headers → body → response helpers
    const operationMiddleware = [
      withContractOperation(operationWithDefaults),
      withPathParams(operationWithDefaults),
      withQueryParams(operationWithDefaults),
      withHeaders(operationWithDefaults),
      withBody(operationWithDefaults),
      withResponseHelpers(operationWithDefaults),
    ];

    /**
     * Wrapper handler that calls the contract handler
     * The middleware chain has already parsed and validated the request,
     * augmenting it with typed properties and response helpers
     */
    const wrappedHandler = async (request: IRequest, ..._args: Args) => {
      // Call the contract handler with typed request (includes response helpers)
      // The request has been augmented by middleware to match ContractRequest
      const typedRequest = request as unknown as ContractRequest<TContract[keyof TContract]>;
      const response = await handler(typedRequest);
      return response;
    };

    // Register the route with itty-router using route-level generic typing
    // Apply middleware chain before the handler
    // This aligns with itty-router's pattern: router.get<RequestType>('/path', ...middleware, handler)
    router[method]<IRequest, Args>(path, ...operationMiddleware, wrappedHandler);
  }

  return router as RouterType<RequestType, Args, Response>;
};

/**
 * Creates a contract from a contract definition
 *
 * This function validates the structure of a contract definition and returns it with
 * full type inference. While it currently just returns the definition as-is, it
 * provides a clear API for contract creation and allows for future validation logic.
 *
 * **IMPORTANT**: For best type inference (especially for path parameter extraction),
 * use ` when defining your contract:
 *
 * ```typescript
 * const contract = createContract({
 *   getUsers: {
 *     operationId: 'getUsers',
 *     path: '/users/:id',  // Path params will be extracted correctly
 *     method: 'GET',
 *     responses: { 200: { body: z.object({ users: z.array(z.string()) }) } },
 *   },
 * });
 * ```
 *
 * Without `as const`, path parameter extraction may fall back to `EmptyObject`
 * because template literal pattern matching only works with literal types.
 *
 * @typeParam T - The contract definition type
 * @param definition - The contract definition mapping operation IDs to operations
 * @returns The same contract definition with full type inference
 *
 * @example
 * ```typescript
 * import { createContract } from './router';
 * import { z } from 'zod';
 * import type { ContractDefinition } from './types';
 *
 * const contract = createContract({
 *   getUsers: {
 *     operationId: 'getUsers',
 *     path: '/users/:id',
 *     method: 'GET',
 *     responses: { 200: { body: z.object({ users: z.array(z.string()) }) } },
 *   },
 * });
 * ```
 */
export function createContract<T extends ContractDefinition>(definition: T): T {
  return definition;
}
