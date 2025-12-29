import { IRequest } from 'itty-router';
import {
  ContractDefinition,
  ContractOperation,
  ContractOperationHandler,
  HandlersForContract,
} from './types';

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
 *     responses: {
 *       200: {
 *         'application/json': { body: z.object({ users: z.array(z.string()) }) },
 *       },
 *     },
 *   },
 * });
 * ```
 *
 * Without `as const`, path parameter extraction may fall back to `EmptyObject`
 * because template literal pattern matching only works with literal types.
 *
 * @typeParam T - The contract definition type (must match ContractDefinition)
 * @param definition - The contract definition mapping operation IDs to operations
 * @returns The same contract definition with full type inference
 *
 * @example
 * ```typescript
 * import { createContract, ContractDefinition } from 'itty-spec';
 * import { z } from 'zod';
 *
 * const contract = createContract({
 *   getUsers: {
 *     operationId: 'getUsers',
 *     path: '/users/:id',
 *     method: 'GET',
 *     responses: {
 *       200: {
 *         'application/json': { body: z.object({ users: z.array(z.string()) }) },
 *       },
 *     },
 *   },
 * });
 * ```
 */
export function createContract<T extends ContractDefinition>(definition: T): T {
  return definition;
}

/**
 * Define handlers for a contract with type safety
 * This function validates that handlers match the contract and can be used
 * to define handlers in separate files that will be combined later
 *
 * The function accepts handlers that may use extended request types (e.g., AuthenticatedRequest)
 * as long as they are compatible with the contract's ContractRequest type.
 *
 * @typeParam TContract - The contract definition type
 * @typeParam Args - Additional arguments passed to handlers (defaults to any[])
 *
 * @param contract - The contract definition to validate handlers against
 * @param handlers - Handlers object that must match all operations in the contract.
 *                   Handlers can use extended request types (e.g., AuthenticatedRequest)
 *                   as long as they extend IRequest and are compatible with ContractRequest.
 * @returns The handlers object with full type safety, ready to be combined with other handlers
 *
 * @example
 * ```typescript
 * // handlers/users.handlers.ts
 * import { usersContract } from '../contracts/users.contract';
 * import { defineHandlers } from 'itty-spec';
 * import type { AuthenticatedRequest } from '../middleware/auth.middleware';
 *
 * export const userHandlers = defineHandlers(usersContract, {
 *   getUsers: async (request: AuthenticatedRequest) => {
 *     // request is fully typed based on usersContract.getUsers
 *     // and also has userId, userRole from AuthenticatedRequest
 *     const { page, limit } = request.validatedQuery;
 *     return request.respond({
 *       status: 200,
 *       contentType: 'application/json',
 *       body: { users: [] },
 *     });
 *   },
 *   getUserById: async (request: AuthenticatedRequest) => {
 *     // implementation
 *   },
 *   // TypeScript will ensure all contract operations have handlers
 * });
 * ```
 *
 * @example
 * ```typescript
 * // index.ts - combine handlers later
 * import { userHandlers } from './handlers/users.handlers';
 * import { productHandlers } from './handlers/products.handlers';
 * import { contract } from './contracts';
 *
 * const router = createRouter({
 *   contract,
 *   handlers: {
 *     ...userHandlers,
 *     ...productHandlers,
 *   },
 * });
 * ```
 */
export function defineHandlers<TContract extends ContractDefinition, Args extends any[] = any[]>(
  contract: TContract,
  handlers: {
    [K in keyof TContract]: (
      request: IRequest & Parameters<ContractOperationHandler<TContract[K], Args>>[0],
      ...args: Args
    ) => ReturnType<ContractOperationHandler<TContract[K], Args>>;
  }
): HandlersForContract<TContract, Args> {
  return handlers as HandlersForContract<TContract, Args>;
}
