import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { IRequest, RequestHandler, ResponseHandler } from 'itty-router';

/**
 * Canonical "empty object" type for "no params"
 */
export type EmptyObject = Record<string, never>;

/**
 * Default query object type when no schema is provided
 */
type RawQuery = Record<string, string | string[] | undefined>;

/**
 * Default headers object type when no schema is provided
 */
type NormalizedHeaders = Record<string, string>;

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
 *
 * Uses Partial<Record<number, ...>> instead of Record<number, ...> to preserve
 * literal key types, allowing the `200 extends keyof T` check to work correctly.
 */
type ResponseMap = Partial<Record<number, ResponseSchema>> & {
  default?: ResponseSchema;
};

export type ResponseSchemas<T extends ResponseMap> = 200 extends keyof T
  ? T & Partial<Record<'default', ResponseSchema>>
  : T & Required<Pick<T, 'default'>>;

/**
 * HTTP method types
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Contract operation definition
 *
 * TPath is generic to preserve literal path types (e.g., '/v1/applications/:id')
 * which is necessary for ExtractPathParams to work correctly.
 *
 * - `operationId` is optional - if omitted, the contract key will be used as the default
 * - `method` is optional - if omitted, defaults to 'GET'
 */
export type ContractOperation<
  TPathParams extends StandardSchemaV1 | undefined = undefined,
  TQuery extends StandardSchemaV1 | undefined = undefined,
  TRequest extends StandardSchemaV1 | undefined = undefined,
  THeaders extends StandardSchemaV1 | undefined = undefined,
  TResponses extends ResponseMap = ResponseMap,
  TPath extends string = string,
> = {
  operationId?: string;
  description?: string;
  summary?: string;
  title?: string;
  tags?: string[];
  path: TPath;
  method?: HttpMethod;
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
  // Handle empty string - return EmptyObject
  TPath extends ''
    ? EmptyObject
    : // Handle paths starting with "/" - strip it and recurse
      TPath extends `/${infer Rest}`
      ? ExtractPathParams<Rest>
      : // Match segment ending with "/" followed by rest
        TPath extends `${infer Segment}/${infer Rest}`
        ? Segment extends `:${infer Param}`
          ? // Segment is a param (e.g., ":userId")
            MergeIntersection<{ [K in Param]: string } & ExtractPathParams<Rest>>
          : // Segment is not a param, recurse on rest
            ExtractPathParams<Rest>
        : // Handle trailing slash on final segment - strip it and recurse
          TPath extends `${infer Rest}/`
          ? ExtractPathParams<Rest>
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
 * With the updated defaults, omitted properties are `undefined`, so we check for `undefined` explicitly.
 */
export type ContractOperationParameters<O extends ContractOperation<any, any, any, any, any, any>> =
  O['pathParams'] extends undefined
    ? NormalizeEmpty<ExtractPathParams<O['path']>>
    : O['pathParams'] extends StandardSchemaV1
      ? StandardSchemaV1.InferOutput<O['pathParams']>
      : NormalizeEmpty<ExtractPathParams<O['path']>>;

/**
 * Extract query params type from a contract operation
 *
 * IMPORTANT: because `query` is optional, we must check if it exists
 * before trying to infer its output type.
 * With the updated defaults, omitted properties are `undefined`, so we check for `undefined` explicitly.
 */
export type ContractOperationQuery<O extends ContractOperation<any, any, any, any, any, any>> =
  O['query'] extends undefined
    ? RawQuery
    : O['query'] extends StandardSchemaV1
      ? StandardSchemaV1.InferOutput<O['query']>
      : RawQuery;

/**
 * Extract body type from a contract operation
 *
 * IMPORTANT: because `request` is optional, we must check if it exists
 * before trying to infer its output type.
 * With the updated defaults, omitted properties are `undefined`, so we check for `undefined` explicitly.
 */
export type ContractOperationBody<O extends ContractOperation<any, any, any, any, any, any>> =
  O['request'] extends undefined
    ? undefined
    : O['request'] extends StandardSchemaV1
      ? StandardSchemaV1.InferOutput<O['request']>
      : undefined;

/**
 * Extract headers type from a contract operation
 *
 * IMPORTANT: because `headers` is optional, we must check if it exists
 * before trying to infer its output type.
 * With the updated defaults, omitted properties are `undefined`, so we check for `undefined` explicitly.
 */
export type ContractOperationHeaders<O extends ContractOperation<any, any, any, any, any, any>> =
  O['headers'] extends undefined
    ? NormalizedHeaders
    : O['headers'] extends StandardSchemaV1
      ? StandardSchemaV1.InferOutput<O['headers']>
      : NormalizedHeaders;

// ============================================================================
// Router Types
// ============================================================================

/**
 * Contract operation request type that extends IRequest with typed params, query, body, and headers
 * This aligns with itty-router's pattern where handlers receive a typed request
 *
 * Note: We use `validatedBody`, `validatedHeaders`, and `validatedQuery` to avoid shadowing
 * IRequest's native `body` (ReadableStream) and `headers` (Headers object) properties.
 * The `params` property is kept as-is since it's standard in itty-router.
 */
export type ContractOperationRequest<O extends ContractOperation<any, any, any, any, any, any>> =
  IRequest & {
    params: ContractOperationParameters<O>;
    query: ContractOperationQuery<O>;
    validatedQuery: ContractOperationQuery<O>;
    validatedBody: ContractOperationBody<O>;
    validatedHeaders: ContractOperationHeaders<O>;
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
 * Extract a specific response variant from the union by status code
 * This allows response helpers to return discriminated variants instead of the full union
 */
export type ResponseVariant<
  O extends ContractOperation,
  S extends ContractOperationStatusCodes<O>,
> = Extract<ContractOperationResponse<O>, { status: S }>;

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
  ): ResponseVariant<O, 200>;
  // Overload: when status is provided explicitly
  json<S extends ContractOperationStatusCodes<O>>(
    body: ContractOperationResponseBody<O, S>,
    status: S,
    headers?: ContractOperationResponseHeaders<O, S>
  ): ResponseVariant<O, S>;

  html(html: string, status?: number, headers?: unknown): ResponseVariant<O, 200>;
  html<S extends ContractOperationStatusCodes<O>>(
    html: string,
    status: S,
    headers?: ContractOperationResponseHeaders<O, S>
  ): ResponseVariant<O, S>;

  /**
   * Create a no-content response (204)
   * Validates that 204 is a valid status code in the contract
   */
  noContent<S extends ContractOperationStatusCodes<O> & 204>(status: S): ResponseVariant<O, S>;

  /**
   * Create an error response with typed body and status code
   * Validates that the status code exists in the contract and body matches the schema
   */
  error<S extends ContractOperationStatusCodes<O>>(
    status: S,
    body: ContractOperationResponseBody<O, S>,
    headers?: ContractOperationResponseHeaders<O, S>
  ): ResponseVariant<O, S>;
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
  request: ContractRequest<O>,
  ...args: any[]
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
