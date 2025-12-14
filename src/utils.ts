import type {
  ContractOperation,
  ContractOperationStatusCodes,
  ContractOperationResponseBody,
  ContractOperationResponseHeaders,
  ContractOperationResponseHelpers,
  ResponseVariant,
} from './types';
import type { StandardSchemaV1 } from '@standard-schema/spec';

/**
 * Create a response object with optional headers
 */
function createResponse(status: number, body: unknown, headers?: unknown) {
  const response: any = { status, body };
  if (headers) response.headers = headers;
  return response;
}

/**
 * Basic response helper methods for use in missing handlers
 * These helpers don't validate against a contract schema since there's no operation context
 *
 * @returns An object with json, html, noContent, and error helper methods
 */
export function createBasicResponseHelpers() {
  return {
    json: (body: unknown, status: number, headers?: HeadersInit): Response =>
      createResponse(status, body, headers),
    html: (html: string, status: number = 200, headers?: HeadersInit): Response => {
      const responseHeaders = new Headers(headers);
      if (!responseHeaders.has('Content-Type')) {
        responseHeaders.set('Content-Type', 'text/html; charset=utf-8');
      }
      return createResponse(status, html, responseHeaders);
    },
    noContent: (status: number): Response => createResponse(status, undefined),
    error: (status: number, body: unknown, headers?: HeadersInit): Response =>
      createResponse(status, body, headers),
  };
}

/**
 * Create typed response helpers for a contract operation
 * These helpers provide type-safe response creation methods that validate against the contract
 *
 * @param _operation - The contract operation (used for type inference, not runtime)
 * @returns Typed response helper methods (json, html, error, noContent) that match the contract
 */
export function createResponseHelpers<TOperation extends ContractOperation>(
  _operation: TOperation
): ContractOperationResponseHelpers<TOperation> {
  return {
    json(body: unknown, status?: number, headers?: unknown): any {
      const finalStatus = (status ?? 200) as ContractOperationStatusCodes<TOperation>;
      return createResponse(finalStatus, body, headers) as ResponseVariant<
        TOperation,
        typeof finalStatus
      >;
    },
    html(html: string, status?: number, headers?: unknown): any {
      const finalStatus = (status ?? 200) as ContractOperationStatusCodes<TOperation>;
      const responseHeaders = headers ? new Headers(headers as HeadersInit) : new Headers();
      if (!responseHeaders.has('Content-Type')) {
        responseHeaders.set('Content-Type', 'text/html; charset=utf-8');
      }
      return createResponse(finalStatus, html, responseHeaders) as ResponseVariant<
        TOperation,
        typeof finalStatus
      >;
    },
    noContent<S extends ContractOperationStatusCodes<TOperation> & 204>(
      status: S
    ): ResponseVariant<TOperation, S> {
      return createResponse(status, undefined) as ResponseVariant<TOperation, S>;
    },
    error<S extends ContractOperationStatusCodes<TOperation>>(
      status: S,
      body: ContractOperationResponseBody<TOperation, S>,
      headers?: ContractOperationResponseHeaders<TOperation, S>
    ): ResponseVariant<TOperation, S> {
      return createResponse(status, body, headers) as ResponseVariant<TOperation, S>;
    },
  };
}

/**
 * Validate data against a Standard Schema and extract the value
 * Throws validation error if validation fails
 */
export async function validateSchema<T>(schema: StandardSchemaV1, data: unknown): Promise<T> {
  const result = await schema['~standard'].validate(data);
  if ('issues' in result && result.issues) {
    const error = new Error('Validation failed');
    (error as any).issues = result.issues;
    throw error;
  }
  return ('value' in result ? result.value : result) as T;
}

/**
 * Define a property on an object with standard configuration
 */
export function defineProp<T>(obj: any, key: string, value: T): void {
  Object.defineProperty(obj, key, { value, writable: true, enumerable: true, configurable: true });
}
