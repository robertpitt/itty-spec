import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { IRequest, RequestHandler, ResponseHandler } from 'itty-router';

// ============================================================================
// Type System Overview
// ============================================================================
//
// This file defines the type system for contract-based routing. The architecture
// follows a layered approach:
//
// 1. **Base Types**: Fundamental types (EmptyObject, RawQuery, etc.)
// 2. **Schema Maps**:
//    - RequestByContentType: content-type → request schema
//    - ResponseByContentType: content-type → response schema
//    - ResponseByStatusCode: status-code → ResponseByContentType
// 3. **Reusable Helpers**: Generic utilities for schema inference and extraction
// 4. **Operation Types**: ContractOperation definition and its parameter extractors
// 5. **Router Types**: Request/response types for handlers and middleware
//
// Key design principles:
// - Reusable helpers eliminate duplication (e.g., InferOptionalSchema, ExtractBodyFromResponseMap)
// - Optional schemas use consistent fallback patterns
// - Content-type maps enable multiple representations (JSON, HTML, XML, etc.)
// - Type inference preserves literal types for path parameter extraction

// ============================================================================
// Base Types
// ============================================================================

/**
 * Canonical "empty object" type for "no params"
 */
export type EmptyObject = Record<string, never>;

/**
 * Default query object type when no schema is provided
 */
type RawQuery = Record<string, string | string[] | undefined>;

/**
 * Response schema structure with body and optional headers
 *
 * Note: `headers` being optional already expresses "no headers schema".
 */
export type ResponseSchema<
  TBody extends StandardSchemaV1 = StandardSchemaV1,
  THeaders extends StandardSchemaV1 = StandardSchemaV1,
> = {
  body: TBody;
  headers?: THeaders;
};

/**
 * Response schemas mapped by content type.
 * Allows different schemas for different content types (e.g., JSON, HTML, XML).
 *
 * Example:
 * ```typescript
 * {
 *   'application/json': { body: z.object({ result: z.number() }) },
 *   'text/html': { body: z.string() }
 * }
 * ```
 */
export type ResponseByContentType = {
  [contentType: string]: ResponseSchema;
};

/**
 * Request schemas mapped by content type.
 * Allows different schemas for different content types (e.g., JSON, XML, form-data).
 *
 * Example:
 * ```typescript
 * {
 *   'application/json': { body: z.object({ name: z.string() }) },
 *   'application/xml': { body: z.string() }
 * }
 * ```
 */
export type RequestByContentType = {
  [contentType: string]: { body: StandardSchemaV1 };
};

/**
 * Request schemas type - only supports content-type map format.
 * This type ensures requests are always in the content-type map format.
 */
export type RequestSchemas<T extends RequestByContentType | undefined> = T extends undefined
  ? undefined
  : T;

/**
 * Response schemas mapped by status code.
 * Each status code maps to a ResponseByContentType (content-type → response schema).
 *
 * Example:
 * ```typescript
 * {
 *   200: {
 *     'application/json': { body: z.object({ result: z.number() }) },
 *     'text/html': { body: z.string() }
 *   },
 *   400: {
 *     'application/json': { body: z.object({ error: z.string() }) }
 *   }
 * }
 * ```
 *
 * Validates that:
 * - If 200 is present, default is optional
 * - If 200 is not present, default is required (to encourage explicit status codes)
 *
 * Uses Partial<Record<number, ...>> instead of Record<number, ...> to preserve
 * literal key types, allowing the `200 extends keyof T` check to work correctly.
 */
type ResponseByStatusCode = Partial<Record<number, ResponseByContentType>> & {
  default?: ResponseByContentType;
};

/**
 * Response schemas type with validation rules.
 * Ensures proper structure and default handling for response definitions.
 */
export type ResponseSchemas<T extends ResponseByStatusCode> = 200 extends keyof T
  ? T & Partial<Record<'default', ResponseByContentType>>
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
 * - `requests` must be a RequestByContentType map (content-type keyed object)
 */
export type ContractOperation<
  TPathParams extends StandardSchemaV1 | undefined = undefined,
  TQuery extends StandardSchemaV1 | undefined = undefined,
  TRequests extends RequestByContentType | undefined = undefined,
  THeaders extends StandardSchemaV1 | undefined = undefined,
  TResponses extends ResponseByStatusCode = ResponseByStatusCode,
  TPath extends string = string,
> = {
  operationId?: string;
  description?: string;
  summary?: string;
  title?: string;
  tags?: string[];
  path: TPath;
  method: HttpMethod;
  pathParams?: TPathParams;
  query?: TQuery;
  requests?: RequestSchemas<TRequests>;
  headers?: THeaders;
  responses: ResponseSchemas<TResponses>;
};

/**
 * Type constraint for any contract operation.
 * Used as a constraint in helper types to accept any valid operation.
 */
type AnyContractOperation = ContractOperation<any, any, any, any, any, any>;

/**
 * Valid keys for ContractOperation - explicitly listed to catch typos like 'request' vs 'requests'
 */
type ContractOperationKeys =
  | 'operationId'
  | 'description'
  | 'summary'
  | 'title'
  | 'tags'
  | 'path'
  | 'method'
  | 'pathParams'
  | 'query'
  | 'requests'
  | 'headers'
  | 'responses';

/**
 * Helper type that validates an operation has only valid keys.
 * If the operation has extra keys (like 'request' instead of 'requests'),
 * those keys are mapped to 'never', which will cause a type error.
 *
 * This works by intersecting the input type with a type that maps all
 * invalid keys to 'never'. TypeScript will error when trying to assign
 * an object with invalid keys because those keys would need to be 'never'.
 */
type ValidateOperation<T extends AnyContractOperation> = T & {
  [K in Exclude<keyof T, ContractOperationKeys>]: never;
};

/**
 * Contract definition - a record of operation IDs to operations
 *
 * Uses a mapped type to preserve literal path types from the contract definition,
 * which is necessary for ExtractPathParams to work correctly.
 *
 * This type validates that each operation has only valid keys, rejecting extra
 * properties like 'request' (should be 'requests') or any other invalid keys.
 * This ensures type safety and catches typos at compile time.
 */
export type ContractDefinition<
  T extends Record<string, AnyContractOperation> = Record<string, AnyContractOperation>,
> = {
  [K in keyof T]: ValidateOperation<T[K]>;
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

// ============================================================================
// Reusable Schema Inference Helpers
// ============================================================================

/**
 * Infer output type from an optional schema, falling back to a default type.
 * Handles the common pattern of checking for undefined before inferring schema output.
 */
type InferOptionalSchema<
  TSchema extends StandardSchemaV1 | undefined,
  TDefault,
> = TSchema extends undefined
  ? TDefault
  : TSchema extends StandardSchemaV1
    ? StandardSchemaV1.InferOutput<TSchema>
    : TDefault;

/**
 * Extract body type from a response content-type map.
 * Returns a union of all body types across all content types.
 */
type ExtractBodyFromResponseMap<T extends ResponseByContentType> = {
  [K in keyof T]: T[K] extends ResponseSchema<infer TBody>
    ? StandardSchemaV1.InferOutput<TBody>
    : never;
}[keyof T];

/**
 * Extract headers type from a response content-type map.
 * Returns a union of all header types across all content types.
 */
type ExtractHeadersFromResponseMap<T extends ResponseByContentType> = {
  [K in keyof T]: T[K] extends ResponseSchema<any, infer THeaders>
    ? THeaders extends StandardSchemaV1
      ? StandardSchemaV1.InferOutput<THeaders>
      : never
    : never;
}[keyof T];

/**
 * Extract body type from a single ResponseSchema.
 */
type ExtractBodyFromResponseSchema<T extends ResponseSchema> = StandardSchemaV1.InferOutput<
  T['body']
>;

/**
 * Extract headers type from a single ResponseSchema.
 */
type ExtractHeadersFromResponseSchema<T extends ResponseSchema> =
  T['headers'] extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<T['headers']> : never;

// ============================================================================
// Contract Operation Parameter Extractors
// ============================================================================

/**
 * Extract path params type from a contract operation.
 * Uses explicit pathParams schema if provided, otherwise extracts from path string.
 */
export type ContractOperationParameters<O extends AnyContractOperation> = InferOptionalSchema<
  O['pathParams'],
  NormalizeEmpty<ExtractPathParams<O['path']>>
>;

/**
 * Extract query params type from a contract operation.
 * Falls back to RawQuery when no schema is provided.
 */
export type ContractOperationQuery<O extends AnyContractOperation> = InferOptionalSchema<
  O['query'],
  RawQuery
>;

/**
 * Extract body type from a contract operation.
 * Only supports content-type map format.
 * Returns undefined when no request schema is provided.
 */
export type ContractOperationBody<O extends AnyContractOperation> = O['requests'] extends undefined
  ? undefined
  : O['requests'] extends RequestByContentType
    ? {
        [K in keyof O['requests']]: O['requests'][K] extends { body: infer TBody }
          ? TBody extends StandardSchemaV1
            ? StandardSchemaV1.InferOutput<TBody>
            : never
          : never;
      }[keyof O['requests']]
    : undefined;

/**
 * Extract headers type from a contract operation.
 * Always returns Headers to align with the Web API Request standard (https://developer.mozilla.org/en-US/docs/Web/API/Request).
 * Note: Schema validation still occurs at runtime, but the type is always Headers.
 */
export type ContractOperationHeaders<_O extends AnyContractOperation> = Headers;

// ============================================================================
// Router Types
// ============================================================================

/**
 * Contract operation request type that extends IRequest with typed params, query, body, and headers.
 * This aligns with itty-router's pattern where handlers receive a typed request.
 *
 * Note: We use `validatedBody`, `validatedHeaders`, and `validatedQuery` to avoid shadowing
 * IRequest's native `body` (ReadableStream) and `headers` (Headers object) properties.
 * The `params` property is kept as-is since it's standard in itty-router.
 */
export type ContractOperationRequest<O extends AnyContractOperation> = IRequest & {
  params: ContractOperationParameters<O>;
  query: ContractOperationQuery<O>;
  validatedQuery: ContractOperationQuery<O>;
  validatedBody: ContractOperationBody<O>;
  validatedHeaders: ContractOperationHeaders<O>;
};

/**
 * Extract body type from a response (content-type map).
 * Uses the reusable ExtractBodyFromResponseMap helper.
 */
type ExtractResponseBody<T> = T extends ResponseByContentType
  ? ExtractBodyFromResponseMap<T>
  : never;

/**
 * Extract headers type from a response (content-type map).
 * Uses the reusable ExtractHeadersFromResponseMap helper.
 */
type ExtractResponseHeaders<T> = T extends ResponseByContentType
  ? ExtractHeadersFromResponseMap<T>
  : never;

/**
 * Response type from a handler - must match one of the contract's response schemas
 */
export type ContractOperationResponse<O extends ContractOperation> = {
  [K in keyof O['responses']]: {
    status: K;
    body: ExtractResponseBody<O['responses'][K]>;
    headers?: ExtractResponseHeaders<O['responses'][K]>;
  };
}[keyof O['responses']];

/**
 * Extract valid status codes from a contract operation
 */
export type ContractOperationStatusCodes<O extends ContractOperation> = keyof O['responses'] &
  number;

/**
 * Extract body type for a specific status code and content type.
 * Uses the reusable ExtractBodyFromResponseSchema helper.
 */
export type ContractOperationResponseBody<
  O extends ContractOperation,
  S extends ContractOperationStatusCodes<O>,
  C extends string = 'application/json',
> = O['responses'][S] extends ResponseByContentType
  ? C extends keyof O['responses'][S]
    ? O['responses'][S][C] extends ResponseSchema
      ? ExtractBodyFromResponseSchema<O['responses'][S][C]>
      : never
    : never
  : never;

/**
 * Extract headers type for a specific status code and content type.
 * Uses the reusable ExtractHeadersFromResponseSchema helper.
 */
export type ContractOperationResponseHeaders<
  O extends ContractOperation,
  S extends ContractOperationStatusCodes<O>,
  C extends string = 'application/json',
> = O['responses'][S] extends ResponseByContentType
  ? C extends keyof O['responses'][S]
    ? O['responses'][S][C] extends ResponseSchema
      ? ExtractHeadersFromResponseSchema<O['responses'][S][C]>
      : never
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
 * Extract all valid content types for a given status code
 */
type ExtractContentTypes<
  O extends ContractOperation,
  S extends ContractOperationStatusCodes<O>,
> = O['responses'][S] extends ResponseByContentType ? keyof O['responses'][S] & string : never;

/**
 * Response options for the respond() method
 */
export type RespondOptions<
  O extends ContractOperation,
  S extends ContractOperationStatusCodes<O>,
  C extends ExtractContentTypes<O, S> & string,
> = {
  status: S;
  contentType: C;
  body: ContractOperationResponseBody<O, S, C>;
  headers?: ContractOperationResponseHeaders<O, S, C>;
};

/**
 * Typed response helper method attached to the request object
 */
export type ContractOperationResponseHelpers<O extends ContractOperation> = {
  /**
   * Create a response with typed body, status code, and content type
   * Validates that the status code and content type exist in the contract
   * and body/headers match the schemas
   */
  respond<S extends ContractOperationStatusCodes<O>, C extends ExtractContentTypes<O, S>>(
    options: RespondOptions<O, S, C>
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
  /** Handler for missing routes (defaults to 404 error). Receives request with basic response helper (respond). */
  missing?: (
    request: RequestType & {
      respond: (options: {
        status: number;
        contentType: string;
        body?: unknown;
        headers?: HeadersInit;
      }) => Response;
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
