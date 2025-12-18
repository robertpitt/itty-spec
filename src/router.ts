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
  withSpecValidation,
  withResponseHelpers,
  withContractFormat,
  withContractErrorHandler,
} from './middleware';

/**
 * Creates a type-safe router from a contract definition
 *
 * This function automatically registers routes from a contract definition, providing:
 * - Automatic route registration based on contract operations
 * - Type-safe request/response handling
 * - Automatic validation of path params, query params, headers, and body
 * - Type-safe response helpers (respond)
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
 *       return request.respond({
 *         status: 200,
 *         contentType: 'application/json',
 *         body: { users: [] },
 *       });
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
): RouterType<RequestType, Args, Response> => {
  const missingHandler: ResponseHandler = (
    response: unknown,
    request: unknown,
    ...args: unknown[]
  ) => {
    if (response != null) return response as Response;
    if (options.missing) {
      return options.missing(
        { ...(request as RequestType), ...createBasicResponseHelpers() } as RequestType &
          ReturnType<typeof createBasicResponseHelpers>,
        ...(args as Args)
      );
    }
    return error(404);
  };

  const before = [
    withParams as unknown as (request: RequestType, ...args: Args) => void,
    withMatchingContractOperation(options.contract, options.base),
    withSpecValidation,
    withResponseHelpers,
  ];
  if (options.before) before.push(...options.before);

  const finally_ = [missingHandler, withContractFormat(options.format)];
  if (options.finally) finally_.push(...options.finally);

  const router = Router<RequestType, Args, Response>({
    base: options.base,
    before,
    catch: withContractErrorHandler<RequestType, Args>(),
    finally: finally_,
  });

  for (const [contractKey, operation] of Object.entries(options.contract)) {
    const handler = options.handlers[contractKey as keyof TContract];
    if (!handler) continue;
    if (!operation.method) {
      throw new Error(
        `Contract operation "${contractKey}" must explicitly specify a method. ` +
          `Found: undefined. Please add method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'`
      );
    }
    router[operation.method.toLowerCase() as Lowercase<HttpMethod>]<IRequest, Args>(
      operation.path,
      async (request: IRequest, ...args: Args) =>
        handler(request as ContractRequest<TContract[keyof TContract]>, ...args)
    );
  }

  return router as RouterType<RequestType, Args, Response>;
};
