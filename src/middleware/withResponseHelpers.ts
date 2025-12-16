import type { IRequest, RequestHandler } from 'itty-router';
import type { ContractAugmentedRequest } from '../types.js';
import { createResponseHelpers, defineProp } from '../utils.js';

/**
 * Global middleware: Attaches response helpers using the operation from request
 * This reads from __contractOperation set by withMatchingContractOperation
 */
export const withResponseHelpers: RequestHandler<IRequest> = (request: IRequest) => {
  const operation = (request as ContractAugmentedRequest).__contractOperation;
  if (!operation) return;

  const helpers = createResponseHelpers(operation);
  defineProp(request, 'respond', helpers.respond);
};
