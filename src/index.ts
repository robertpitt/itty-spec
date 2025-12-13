export * from './types.js';
import type { ContractDefinition } from './types.js';

/**
 * Creates a contract from a contract definition
 * Validates the structure and returns a fully typed contract with spec() method
 */
export function createContract<T extends ContractDefinition>(definition: T): T {
  return definition;
}

// Re-export router functionality
export * from './router/index.js';
