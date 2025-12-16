import type { IRequest, RequestHandler } from 'itty-router';
import type { ContractOperation, ContractAugmentedRequest } from '../types.js';
import { matchesPathPattern } from './utils.js';

/**
 * Middleware factory: Finds and sets the matching contract operation from a contract
 * This should be added to the router's `before` array to run for all routes
 *
 * @param contract - The contract definition containing all operations
 * @param base - Optional base path to strip from the URL
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

    const method = request.method.toLowerCase();
    const pathname = new URL(request.url).pathname.slice(base?.length || 0);

    // Find matching operation by method and path pattern
    for (const operation of Object.values(contract)) {
      // Method is required, so skip operations without it (should not happen in valid contracts)
      if (!operation.method) continue;
      const operationMethod = operation.method.toLowerCase();
      if (operationMethod === method && matchesPathPattern(operation.path, pathname)) {
        (request as ContractAugmentedRequest).__contractOperation = operation;
        return;
      }
    }
  };
}
