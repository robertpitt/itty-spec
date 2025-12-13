import type {
  ContractOperation,
  ContractOperationResponse,
  ContractOperationStatusCodes,
  ContractOperationResponseBody,
  ContractOperationResponseHeaders,
  ContractOperationResponseHelpers,
} from './types';

/**
 * Basic response helper methods for use in missing handlers
 * These helpers don't validate against a contract schema since there's no operation context
 *
 * @returns An object with json, noContent, and error helper methods
 */
export function createBasicResponseHelpers() {
  return {
    /**
     * Create a JSON response
     * @param body - Response body
     * @param status - HTTP status code
     * @param headers - Optional response headers
     */
    json: (body: unknown, status: number, headers?: HeadersInit) => ({
      status,
      body,
      ...(headers && { headers }),
    }),
    /**
     * Create a no-content response (typically 204)
     * @param status - HTTP status code (should be 204)
     */
    noContent: (status: number) => ({
      status,
      body: undefined,
    }),
    /**
     * Create an error response
     * @param status - HTTP status code
     * @param body - Error response body
     * @param headers - Optional response headers
     */
    error: (status: number, body: unknown, headers?: HeadersInit) => ({
      status,
      body,
      ...(headers && { headers }),
    }),
  };
}

/**
 * Create typed response helpers for a contract operation
 * These helpers provide type-safe response creation methods that validate against the contract
 *
 * @param _operation - The contract operation (used for type inference, not runtime)
 * @returns Typed response helper methods (json, error, noContent) that match the contract
 */
export function createResponseHelpers<TOperation extends ContractOperation>(
  _operation: TOperation
): ContractOperationResponseHelpers<TOperation> {
  return {
    /**
     * Create a JSON response with typed body and status code
     * Supports two overloads:
     * 1. When status is omitted, defaults to 200 (if 200 is a valid status code)
     * 2. When status is provided explicitly, validates against contract
     *
     * @param body - Response body (must match the contract schema for the status code)
     * @param status - HTTP status code (optional, defaults to 200)
     * @param headers - Optional response headers (must match contract schema if provided)
     * @returns A ContractOperationResponse object matching the contract
     */
    json(body: unknown, status?: number, headers?: unknown): ContractOperationResponse<TOperation> {
      // Default to 200 if status is not provided
      const finalStatus = status ?? 200;
      return {
        status: finalStatus,
        body,
        ...(headers && { headers }),
      } as ContractOperationResponse<TOperation>;
    },

    /**
     * Create a no-content response (204)
     * Validates that 204 is a valid status code in the contract
     *
     * @param status - HTTP status code (must be 204 and valid in contract)
     * @returns A ContractOperationResponse object with no body
     */
    noContent<S extends ContractOperationStatusCodes<TOperation> & 204>(
      status: S
    ): ContractOperationResponse<TOperation> {
      // Type assertion is safe because S is constrained to 204 and ContractOperationStatusCodes
      return {
        status,
        body: undefined,
      } as ContractOperationResponse<TOperation>;
    },

    /**
     * Create an error response with typed body and status code
     * Validates that the status code exists in the contract and body matches the schema
     *
     * @param status - HTTP status code (must be valid in contract)
     * @param body - Error response body (must match contract schema for this status)
     * @param headers - Optional response headers (must match contract schema if provided)
     * @returns A ContractOperationResponse object matching the contract
     */
    error<S extends ContractOperationStatusCodes<TOperation>>(
      status: S,
      body: ContractOperationResponseBody<TOperation, S>,
      headers?: ContractOperationResponseHeaders<TOperation, S>
    ): ContractOperationResponse<TOperation> {
      return {
        status,
        body,
        ...(headers && { headers }),
      } as ContractOperationResponse<TOperation>;
    },
  };
}
