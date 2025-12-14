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
  const wrappedMissingHandler: RequestHandler<RequestType, Args> = (
    request: RequestType,
    ...args: Args
  ) => {
    if (options.missing) {
      return options.missing(
        { ...request, ...createBasicResponseHelpers() } as RequestType &
          ReturnType<typeof createBasicResponseHelpers>,
        ...args
      );
    }
    return error(404);
  };

  const beforeMiddleware: RequestHandler<RequestType, Args>[] = [
    withParams as unknown as RequestHandler<RequestType, Args>,
    ...(options.before || []),
  ];
  const errorHandler = withContractErrorHandler<RequestType, Args>();
  const finallyHandlers: ResponseHandler[] = [
    ((response: any, request: any, ...args: any[]) =>
      response == null
        ? wrappedMissingHandler(request as RequestType, ...(args as Args))
        : (response as Response)) as unknown as ResponseHandler,
    withContractFormat(options.format),
    ...(options.finally || []),
  ];

  const router = Router<RequestType, Args, Response>({
    base: options.base,
    before: beforeMiddleware,
    catch: errorHandler,
    finally: finallyHandlers,
  });

  for (const [contractKey, operation] of Object.entries(options.contract)) {
    const handler = options.handlers[contractKey as keyof TContract];
    if (!handler) continue;
    const operationWithDefaults = {
      ...operation,
      operationId: operation.operationId ?? contractKey,
      method: operation.method ?? 'GET',
    };
    const method = operationWithDefaults.method.toLowerCase() as Lowercase<HttpMethod>;
    router[method]<IRequest, Args>(
      operation.path,
      withContractOperation(operationWithDefaults),
      withPathParams(operationWithDefaults),
      withQueryParams(operationWithDefaults),
      withHeaders(operationWithDefaults),
      withBody(operationWithDefaults),
      withResponseHelpers(operationWithDefaults),
      async (request: IRequest, ...args: Args) =>
        handler(request as unknown as ContractRequest<TContract[keyof TContract]>)
    );
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
