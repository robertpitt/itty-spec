import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { IRequest, RequestHandler, ResponseHandler } from 'itty-router';

/**
 * Canonical "empty object" type for "no params"
 */
export type EmptyObject = Record<string, never>;

/**
 * Response schema structure with body and optional headers
 *
 * Note: `headers` being optional already expresses “no headers schema”.
 */
export type ResponseSchema<
  TBody extends StandardSchemaV1 = StandardSchemaV1,
  THeaders extends StandardSchemaV1 = StandardSchemaV1,
> = {
  body: TBody;
  headers?: THeaders;
};

/**
 * Response schemas mapped by status code.
 *
 * Validates that:
 * - If 200 is present, default is optional
 * - If 200 is not present, default is required (to encourage explicit status codes)
 */
export type ResponseSchemas<
  T extends Record<number, ResponseSchema> & Partial<Record<'default', ResponseSchema>>,
> = 200 extends keyof T
  ? T & Partial<Record<'default', ResponseSchema>>
  : T & Record<'default', ResponseSchema>;

/**
 * Contract operation definition
 *
 * TPath is generic to preserve literal path types (e.g., '/v1/applications/:id')
 * which is necessary for ExtractPathParams to work correctly.
 */
export type ContractOperation<
  TPathParams extends StandardSchemaV1 | undefined = StandardSchemaV1 | undefined,
  TQuery extends StandardSchemaV1 | undefined = StandardSchemaV1 | undefined,
  TRequest extends StandardSchemaV1 | undefined = StandardSchemaV1 | undefined,
  THeaders extends StandardSchemaV1 | undefined = StandardSchemaV1 | undefined,
  TResponses extends Record<number, ResponseSchema> & Partial<Record<'default', ResponseSchema>> =
    Record<number, ResponseSchema> & Partial<Record<'default', ResponseSchema>>,
  TPath extends string = string,
> = {
  operationId: string;
  description?: string;
  summary?: string;
  title?: string;
  tags?: string[];
  path: TPath;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  pathParams?: TPathParams;
  query?: TQuery;
  request?: TRequest;
  headers?: THeaders;
  responses: ResponseSchemas<TResponses>;
};

/**
 * Contract definition - a record of operation IDs to operations
 *
 * Uses a mapped type to preserve literal path types from the contract definition,
 * which is necessary for ExtractPathParams to work correctly.
 */
export type ContractDefinition = {
  [K in string]: ContractOperation<any, any, any, any, any, any>;
};

/**
 * Inferred contract type from a contract definition
 * For backward compatibility, Contract<T> is still the same as T
 * But createContract now returns ContractWithSpec<T>
 */
export type Contract<T extends ContractDefinition> = T;

/**
 * Helper type to merge intersection types into a single object type
 */
type MergeIntersection<T> = {
  [K in keyof T]: T[K];
};

/**
 * Extract path parameters from a path string
 * e.g., "/v1/users/:id" -> { id: string }
 *
 * This type recursively processes path segments to extract parameters:
 * 1. Handles paths starting with "/"
 * 2. Extracts parameters from segments starting with ":"
 * 3. Merges multiple parameters using intersection types
 *
 * Note: When TPath is a generic `string` type (not a literal), this will return {}
 * because template literal pattern matching only works with literal types.
 */
export type ExtractPathParams<TPath extends string> =
  // Handle paths starting with "/" - strip it and recurse
  TPath extends `/${infer Rest}`
    ? ExtractPathParams<Rest>
    : // Match segment ending with "/" followed by rest
      TPath extends `${infer Segment}/${infer Rest}`
      ? Segment extends `:${infer Param}`
        ? // Segment is a param (e.g., ":userId")
          MergeIntersection<{ [K in Param]: string } & ExtractPathParams<Rest>>
        : // Segment is not a param, recurse on rest
          ExtractPathParams<Rest>
      : // Match final segment (no trailing "/")
        TPath extends `:${infer Param}`
        ? { [K in Param]: string }
        : // No match - empty object (also handles generic string type)
          EmptyObject;

/**
 * Normalize `{}` (no keys) into `EmptyObject` for consistency.
 * Handles intersection types by merging them first.
 */
type NormalizeEmpty<T> = keyof MergeIntersection<T> extends never
  ? EmptyObject
  : MergeIntersection<T>;

/**
 * Extract path params type from a contract operation
 * Uses explicit pathParams schema if provided, otherwise extracts from path string
 *
 * IMPORTANT: because `pathParams` is optional, we must check if it exists
 * before trying to infer its output type.
 */
export type ContractOperationParameters<O extends ContractOperation<any, any, any, any, any, any>> =
  NonNullable<O['pathParams']> extends never
    ? NormalizeEmpty<ExtractPathParams<O['path']>>
    : NonNullable<O['pathParams']> extends StandardSchemaV1
      ? StandardSchemaV1.InferOutput<NonNullable<O['pathParams']>>
      : NormalizeEmpty<ExtractPathParams<O['path']>>;

/**
 * Extract query params type from a contract operation
 *
 * IMPORTANT: because `query` is optional, we must check if it exists
 * before trying to infer its output type.
 */
export type ContractOperationQuery<O extends ContractOperation<any, any, any, any, any, any>> =
  NonNullable<O['query']> extends never
    ? EmptyObject
    : NonNullable<O['query']> extends StandardSchemaV1
      ? StandardSchemaV1.InferOutput<NonNullable<O['query']>>
      : EmptyObject;

/**
 * Extract body type from a contract operation
 *
 * IMPORTANT: because `request` is optional, we must check if it exists
 * before trying to infer its output type.
 */
export type ContractOperationBody<O extends ContractOperation<any, any, any, any, any, any>> =
  NonNullable<O['request']> extends never
    ? never
    : NonNullable<O['request']> extends StandardSchemaV1
      ? StandardSchemaV1.InferOutput<NonNullable<O['request']>>
      : never;

/**
 * Extract headers type from a contract operation
 *
 * IMPORTANT: because `headers` is optional, we must check if it exists
 * before trying to infer its output type.
 */
export type ContractOperationHeaders<O extends ContractOperation<any, any, any, any, any, any>> =
  NonNullable<O['headers']> extends never
    ? EmptyObject
    : NonNullable<O['headers']> extends StandardSchemaV1
      ? StandardSchemaV1.InferOutput<NonNullable<O['headers']>>
      : EmptyObject;

// ============================================================================
// Router Types
// ============================================================================

/**
 * Contract operation request type that extends IRequest with typed params, query, body, and headers
 * This aligns with itty-router's pattern where handlers receive a typed request
 */
export type ContractOperationRequest<O extends ContractOperation<any, any, any, any, any, any>> =
  IRequest & {
    params: ContractOperationParameters<O>;
    query: ContractOperationQuery<O>;
    body: ContractOperationBody<O>;
    headers: ContractOperationHeaders<O>;
  };

/**
 * Response type from a handler - must match one of the contract's response schemas
 */
export type ContractOperationResponse<O extends ContractOperation> = {
  [K in keyof O['responses']]: {
    status: K;
    body: O['responses'][K] extends ResponseSchema<infer TBody>
      ? StandardSchemaV1.InferOutput<TBody>
      : never;
    headers?: O['responses'][K] extends ResponseSchema<any, infer THeaders>
      ? THeaders extends StandardSchemaV1
        ? StandardSchemaV1.InferOutput<THeaders>
        : never
      : never;
  };
}[keyof O['responses']];

/**
 * Extract valid status codes from a contract operation
 */
export type ContractOperationStatusCodes<O extends ContractOperation> = keyof O['responses'] &
  number;

/**
 * Extract body type for a specific status code
 */
export type ContractOperationResponseBody<
  O extends ContractOperation,
  S extends ContractOperationStatusCodes<O>,
> =
  O['responses'][S] extends ResponseSchema<infer TBody>
    ? StandardSchemaV1.InferOutput<TBody>
    : never;

/**
 * Extract headers type for a specific status code
 */
export type ContractOperationResponseHeaders<
  O extends ContractOperation,
  S extends ContractOperationStatusCodes<O>,
> =
  O['responses'][S] extends ResponseSchema<any, infer THeaders>
    ? THeaders extends StandardSchemaV1
      ? StandardSchemaV1.InferOutput<THeaders>
      : never
    : never;

/**
 * Typed response helper methods attached to the request object
 */
export type ContractOperationResponseHelpers<O extends ContractOperation> = {
  /**
   * Create a JSON response with typed body and status code
   * Validates that the status code exists in the contract and body matches the schema
   * When status is omitted, defaults to 200 (if 200 is a valid status code)
   */
  // Overload: when status is omitted, default to 200 (only available if 200 is valid)
  json(
    body: 200 extends ContractOperationStatusCodes<O>
      ? ContractOperationResponseBody<O, 200>
      : never,
    status?: 200,
    headers?: 200 extends ContractOperationStatusCodes<O>
      ? ContractOperationResponseHeaders<O, 200>
      : never
  ): ContractOperationResponse<O>;
  // Overload: when status is provided explicitly
  json<S extends ContractOperationStatusCodes<O>>(
    body: ContractOperationResponseBody<O, S>,
    status: S,
    headers?: ContractOperationResponseHeaders<O, S>
  ): ContractOperationResponse<O>;

  /**
   * Create a no-content response (204)
   * Validates that 204 is a valid status code in the contract
   */
  noContent<S extends ContractOperationStatusCodes<O> & 204>(
    status: S
  ): ContractOperationResponse<O>;

  /**
   * Create an error response with typed body and status code
   * Validates that the status code exists in the contract and body matches the schema
   */
  error<S extends ContractOperationStatusCodes<O>>(
    status: S,
    body: ContractOperationResponseBody<O, S>,
    headers?: ContractOperationResponseHeaders<O, S>
  ): ContractOperationResponse<O>;
};

/**
 * Contract request that extends ContractOperationRequest with typed response helpers
 * This is the primary request type that handlers receive
 */
export type ContractRequest<O extends ContractOperation> = ContractOperationRequest<O> &
  ContractOperationResponseHelpers<O>;

/**
 * Handler function type for a contract operation
 * Receives a typed request with response helpers
 */
export type ContractOperationHandler<O extends ContractOperation> = (
  request: ContractRequest<O>
) => Promise<ContractOperationResponse<O>>;

/**
 * Contract router type - maps operation IDs to their handlers
 * Note: Renamed from Router to avoid conflict with itty-router's Router function
 */
export type ContractRouterType<TContract extends ContractDefinition> = {
  [K in keyof TContract]: {
    handler: ContractOperationHandler<TContract[K]>;
  };
};

/**
 * Options for ContractRouter
 */
export type ContractRouterOptions<
  TContract extends ContractDefinition,
  RequestType extends IRequest = IRequest,
  Args extends any[] = any[],
> = {
  /** Contract definition */
  contract: TContract;
  /** Handlers mapped by operation ID */
  handlers: {
    [K in keyof TContract]?: ContractOperationHandler<TContract[K]>;
  };
  /** Response formatter (defaults to contract-aware JSON formatter) */
  format?: ResponseHandler;
  /** Handler for missing routes (defaults to 404 error). Receives request with basic response helpers (json, error, noContent). */
  missing?: (
    request: RequestType & {
      json: (body: any, status: number, headers?: HeadersInit) => any;
      error: (status: number, body: any, headers?: HeadersInit) => any;
      noContent: (status: number) => any;
    },
    ...args: Args
  ) => Response | Promise<Response>;
  /** Additional before middleware */
  before?: RequestHandler<RequestType, Args>[];
  /** Additional finally middleware */
  finally?: ResponseHandler[];
  /** Base path for all routes */
  base?: string;
};

/**
 * Internal type for request augmentation with contract operation metadata
 * Used by middleware to store operation context on the request object
 */
export type ContractAugmentedRequest<O extends ContractOperation = ContractOperation> = IRequest & {
  __contractOperation?: O;
};
