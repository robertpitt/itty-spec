import { ContractDefinition } from './types';

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
 * import { createContract } from './router';
 * import { z } from 'zod';
 * import type { ContractDefinition } from './types';
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
