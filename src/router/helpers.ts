import type { ContractOperation } from '../types.js';
import type {
  HandlerResponse,
  ValidStatusCodes,
  ResponseBodyForStatus,
  ResponseHeadersForStatus,
  TypedResponseHelpers,
} from './types.js';

/**
 * Create basic response helpers for missing handler (no operation context)
 * These helpers don't validate against a contract schema
 */
export function createBasicResponseHelpers() {
  return {
    json: (body: any, status: number, headers?: HeadersInit) => ({
      status,
      body,
      ...(headers && { headers }),
    }),
    noContent: (status: number) => ({
      status,
      body: undefined,
    }),
    error: (status: number, body: any, headers?: HeadersInit) => ({
      status,
      body,
      ...(headers && { headers }),
    }),
  };
}

/**
 * Create typed response helpers for a contract operation
 */
export function createResponseHelpers<TOperation extends ContractOperation>(
  _operation: TOperation
): TypedResponseHelpers<TOperation> {
  return {
    // Implementation that handles both overloads
    json(body: any, status?: any, headers?: any): HandlerResponse<TOperation> {
      // Default to 200 if status is not provided
      const finalStatus = status ?? 200;
      return {
        status: finalStatus,
        body,
        ...(headers && { headers }),
      } as HandlerResponse<TOperation>;
    },

    noContent<TStatus extends ValidStatusCodes<TOperation> & 204>(
      status: TStatus
    ): HandlerResponse<TOperation> {
      return { status, body: undefined as any } as HandlerResponse<TOperation>;
    },

    error<TStatus extends ValidStatusCodes<TOperation>>(
      status: TStatus,
      body: ResponseBodyForStatus<TOperation, TStatus>,
      headers?: ResponseHeadersForStatus<TOperation, TStatus>
    ): HandlerResponse<TOperation> {
      return {
        status,
        body,
        ...(headers && { headers }),
      } as HandlerResponse<TOperation>;
    },
  };
}
