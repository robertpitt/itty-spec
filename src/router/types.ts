import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { IRequest, RequestHandler, ResponseHandler } from 'itty-router';
import type {
  ContractDefinition,
  ContractOperation,
  ResponseSchema,
  ExtractPathParamsType,
  ExtractQueryType,
  ExtractBodyType,
  ExtractHeadersType,
} from '../types.js';

/**
 * Contract request type that extends IRequest with typed params, query, body, and headers
 * This aligns with itty-router's pattern where handlers receive a typed request
 */
export type ContractRequest<TOperation extends ContractOperation<any, any, any, any, any, any>> =
  IRequest & {
    params: ExtractPathParamsType<TOperation>;
    query: ExtractQueryType<TOperation>;
    body: ExtractBodyType<TOperation>;
    headers: ExtractHeadersType<TOperation>;
  };

/**
 * Response type from a handler - must match one of the contract's response schemas
 */
export type HandlerResponse<TOperation extends ContractOperation> = {
  [K in keyof TOperation['responses']]: {
    status: K;
    body: TOperation['responses'][K] extends ResponseSchema<infer TBody>
      ? StandardSchemaV1.InferOutput<TBody>
      : never;
    headers?: TOperation['responses'][K] extends ResponseSchema<any, infer THeaders>
      ? THeaders extends StandardSchemaV1
        ? StandardSchemaV1.InferOutput<THeaders>
        : never
      : never;
  };
}[keyof TOperation['responses']];

/**
 * Extract valid status codes from a contract operation
 */
export type ValidStatusCodes<TOperation extends ContractOperation> = keyof TOperation['responses'] &
  number;

/**
 * Extract body type for a specific status code
 */
export type ResponseBodyForStatus<
  TOperation extends ContractOperation,
  TStatus extends ValidStatusCodes<TOperation>,
> =
  TOperation['responses'][TStatus] extends ResponseSchema<infer TBody>
    ? StandardSchemaV1.InferOutput<TBody>
    : never;

/**
 * Extract headers type for a specific status code
 */
export type ResponseHeadersForStatus<
  TOperation extends ContractOperation,
  TStatus extends ValidStatusCodes<TOperation>,
> =
  TOperation['responses'][TStatus] extends ResponseSchema<any, infer THeaders>
    ? THeaders extends StandardSchemaV1
      ? StandardSchemaV1.InferOutput<THeaders>
      : never
    : never;

/**
 * Typed response helper methods attached to the request object
 */
export type TypedResponseHelpers<TOperation extends ContractOperation> = {
  /**
   * Create a JSON response with typed body and status code
   * Validates that the status code exists in the contract and body matches the schema
   * When status is omitted, defaults to 200 (if 200 is a valid status code)
   */
  // Overload: when status is omitted, default to 200 (only available if 200 is valid)
  json(
    body: 200 extends ValidStatusCodes<TOperation> ? ResponseBodyForStatus<TOperation, 200> : never,
    status?: 200,
    headers?: 200 extends ValidStatusCodes<TOperation>
      ? ResponseHeadersForStatus<TOperation, 200>
      : never
  ): HandlerResponse<TOperation>;
  // Overload: when status is provided explicitly
  json<TStatus extends ValidStatusCodes<TOperation>>(
    body: ResponseBodyForStatus<TOperation, TStatus>,
    status: TStatus,
    headers?: ResponseHeadersForStatus<TOperation, TStatus>
  ): HandlerResponse<TOperation>;

  /**
   * Create a no-content response (204)
   * Validates that 204 is a valid status code in the contract
   */
  noContent<TStatus extends ValidStatusCodes<TOperation> & 204>(
    status: TStatus
  ): HandlerResponse<TOperation>;

  /**
   * Create an error response with typed body and status code
   * Validates that the status code exists in the contract and body matches the schema
   */
  error<TStatus extends ValidStatusCodes<TOperation>>(
    status: TStatus,
    body: ResponseBodyForStatus<TOperation, TStatus>,
    headers?: ResponseHeadersForStatus<TOperation, TStatus>
  ): HandlerResponse<TOperation>;
};

/**
 * Typed contract request that extends ContractRequest with typed response helpers
 */
export type TypedContractRequest<TOperation extends ContractOperation> =
  ContractRequest<TOperation> & TypedResponseHelpers<TOperation>;

/**
 * Handler function type for a contract operation
 * Receives a typed request with response helpers
 */
export type Handler<TOperation extends ContractOperation> = (
  request: TypedContractRequest<TOperation>
) => Promise<HandlerResponse<TOperation>>;

/**
 * Router type - maps operation IDs to their handlers
 */
export type Router<TContract extends ContractDefinition> = {
  [K in keyof TContract]: {
    handler: Handler<TContract[K]>;
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
    [K in keyof TContract]?: Handler<TContract[K]>;
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
