import type { StandardSchemaV1 } from '@standard-schema/spec';

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
> = 200 extends keyof T ? T : T & Record<'default', ResponseSchema>;

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
          { [K in Param]: string } & ExtractPathParams<Rest>
        : // Segment is not a param, recurse on rest
          ExtractPathParams<Rest>
      : // Match final segment (no trailing "/")
        TPath extends `:${infer Param}`
        ? { [K in Param]: string }
        : // No match - empty object (also handles generic string type)
          {};

/**
 * Normalize `{}` (no keys) into `EmptyObject` for consistency.
 */
type NormalizeEmpty<T> = keyof T extends never ? EmptyObject : T;

/**
 * Extract path params type from a contract operation
 * Uses explicit pathParams schema if provided, otherwise extracts from path string
 *
 * IMPORTANT: because `pathParams` is optional, we must strip `undefined`
 * (otherwise the schema branch never matches).
 */
export type ExtractPathParamsType<
  TOperation extends ContractOperation<any, any, any, any, any, any>,
> =
  NonNullable<TOperation['pathParams']> extends StandardSchemaV1
    ? StandardSchemaV1.InferOutput<NonNullable<TOperation['pathParams']>>
    : NormalizeEmpty<ExtractPathParams<TOperation['path']>>;

/**
 * Extract query params type from a contract operation
 *
 * IMPORTANT: because `query` is optional, we must strip `undefined`
 * (otherwise the schema branch never matches).
 */
export type ExtractQueryType<TOperation extends ContractOperation<any, any, any, any, any, any>> =
  NonNullable<TOperation['query']> extends StandardSchemaV1
    ? StandardSchemaV1.InferOutput<NonNullable<TOperation['query']>>
    : EmptyObject;

/**
 * Extract body type from a contract operation
 *
 * IMPORTANT: because `request` is optional, we must strip `undefined`
 * (otherwise the schema branch never matches).
 */
export type ExtractBodyType<TOperation extends ContractOperation<any, any, any, any, any, any>> =
  NonNullable<TOperation['request']> extends StandardSchemaV1
    ? StandardSchemaV1.InferOutput<NonNullable<TOperation['request']>>
    : never;

/**
 * Extract headers type from a contract operation
 *
 * IMPORTANT: because `headers` is optional, we must strip `undefined`
 * (otherwise the schema branch never matches).
 */
export type ExtractHeadersType<TOperation extends ContractOperation<any, any, any, any, any, any>> =
  NonNullable<TOperation['headers']> extends StandardSchemaV1
    ? StandardSchemaV1.InferOutput<NonNullable<TOperation['headers']>>
    : EmptyObject;
