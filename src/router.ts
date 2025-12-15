import {
  Router,
  type RouterType,
  type IRequest,
  withParams,
  error,
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
  withMatchingContractOperation,
  withGlobalPathParams,
  withGlobalQueryParams,
  withGlobalHeaders,
  withGlobalBody,
  withGlobalResponseHelpers,
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
 * const router = createRouter({
 *   contract: myContract,
 *   handlers: {
 *     getUsers: async (request) => {
 *       return request.json({ users: [] }, 200);
 *     },
 *   },
 * });
 * ```
 */
export const createRouter = <
  TContract extends ContractDefinition,
  RequestType extends IRequest = IRequest,
  Args extends any[] = any[],
>(
  options: ContractRouterOptions<TContract, RequestType, Args>
) => {
  // Create missing handler middleware
  // In itty-router, middleware that returns something stops execution
  // If no route matches, this will be called to handle 404s
  const missingHandler: ResponseHandler = (
    response: unknown,
    request: unknown,
    ...args: unknown[]
  ) => {
    // If a response was already returned, pass it through
    if (response != null) {
      return response as Response;
    }

    // No response means no route matched - handle missing route
    const requestWithHelpers = {
      ...(request as RequestType),
      ...createBasicResponseHelpers(),
    } as RequestType & ReturnType<typeof createBasicResponseHelpers>;

    if (options.missing) {
      return options.missing(requestWithHelpers, ...(args as Args));
    }
    return error(404);
  };

  // Build middleware chain following itty-router patterns:
  // - before: runs before route handlers, doesn't return to continue
  // - catch: handles errors thrown during execution
  // - finally: runs after §handlers, can transform responses
  const router = Router<RequestType, Args, Response>({
    base: options.base,
    before: [
      withParams as unknown as (request: RequestType, ...args: Args) => void,
      // Attach the contract to the request object
      withMatchingContractOperation(options.contract, options.base),
      // Use the contract operation to validate the request path
      withGlobalPathParams,
      // Use the contract operation to validate the request query params
      withGlobalQueryParams,
      // Use the contract operation to validate the request headers
      withGlobalHeaders,
      // Use the contract operation to validate the request body
      withGlobalBody,
      // Use the contract operation to validate the response
      withGlobalResponseHelpers,
      // Pass user defined before middleware to the chain
      ...(options.before || []),
    ],
    // Handle errors thrown during execution
    catch: withContractErrorHandler<RequestType, Args>(),
    finally: [
      // handle not found routes
      missingHandler,
      withContractFormat(options.format),
      ...(options.finally || []),
    ],
  });

  // Register routes - middleware is now global, so we only need to register handlers
  for (const [contractKey, operation] of Object.entries(options.contract)) {
    const handler = options.handlers[contractKey as keyof TContract];
    if (!handler) continue;
    const operationWithDefaults = {
      ...operation,
      operationId: operation.operationId ?? contractKey,
      method: operation.method ?? 'GET',
    };
    const method = operationWithDefaults.method.toLowerCase() as Lowercase<HttpMethod>;
    router[method]<IRequest, Args>(operation.path, async (request: IRequest, ...args: Args) =>
      handler(request as ContractRequest<TContract[keyof TContract]>, ...args)
    );
  }

  return router as RouterType<RequestType, Args, Response>;
};
