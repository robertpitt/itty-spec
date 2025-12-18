import type {
  ContractOperation,
  ContractOperationResponseHelpers,
  ResponseVariant,
  ResponseSchema,
  ResponseByContentType,
  RespondOptions,
  ContractOperationStatusCodes,
  ExtractContentTypes,
} from './types';
import type { StandardSchemaV1 } from '@standard-schema/spec';

/**
 * Get response schema for a specific content type
 * Returns the schema for the content type, or null if not found
 */
export function getResponseSchemaForContentType(
  response: ResponseByContentType,
  contentType: string
): ResponseSchema | null {
  return response[contentType] || null;
}

/**
 * Create a response object with optional headers
 */
function createResponse(status: number, body: unknown, headers?: unknown) {
  const response: any = { status, body };
  if (headers) response.headers = headers;
  return response;
}

/**
 * Basic response helper for use in missing handlers
 * This helper doesn't validate against a contract schema since there's no operation context
 *
 * @returns An object with respond() method
 */
export function createBasicResponseHelpers() {
  return {
    respond: (options: {
      status: number;
      contentType: string;
      body?: unknown;
      headers?: HeadersInit;
    }): Response => {
      const { status, contentType, body, headers } = options;
      const responseHeaders = headers ? new Headers(headers) : new Headers();

      // Set content-type header if not already set
      if (!responseHeaders.has('content-type')) {
        if (contentType === 'text/html') {
          responseHeaders.set('content-type', 'text/html; charset=utf-8');
        } else {
          responseHeaders.set('content-type', contentType);
        }
      }

      return createResponse(status, body, responseHeaders);
    },
  };
}

/**
 * Create typed response helper for a contract operation
 * Provides a single respond() method that validates against the contract
 *
 * @param _operation - The contract operation (used for type inference, not runtime)
 * @returns Typed respond() method that matches the contract
 */
export function createResponseHelpers<TOperation extends ContractOperation>(
  _operation: TOperation
): ContractOperationResponseHelpers<TOperation> {
  return {
    respond<
      S extends ContractOperationStatusCodes<TOperation>,
      C extends ExtractContentTypes<TOperation, S> & string,
    >(options: RespondOptions<TOperation, S, C>): ResponseVariant<TOperation, S> {
      const { status, contentType, body, headers } = options;
      const responseHeaders = headers ? new Headers(headers as HeadersInit) : new Headers();

      // Set content-type header if not already set
      if (!responseHeaders.has('content-type')) {
        // Handle special case for HTML
        if (contentType === 'text/html') {
          responseHeaders.set('content-type', 'text/html; charset=utf-8');
        } else {
          responseHeaders.set('content-type', contentType);
        }
      }

      // Only include headers if they were provided or if content-type was set
      const finalHeaders =
        headers || responseHeaders.has('content-type') ? responseHeaders : undefined;

      return createResponse(status, body, finalHeaders) as ResponseVariant<TOperation, S>;
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
