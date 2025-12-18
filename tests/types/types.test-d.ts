import { expectTypeOf, test } from 'vitest';
import type {
  EmptyObject,
  ExtractPathParams,
  ContractOperation,
  ContractOperationParameters,
  ContractOperationQuery,
  ContractOperationBody,
  ContractOperationHeaders,
  ContractOperationResponse,
  ContractOperationStatusCodes,
  ContractOperationResponseBody,
  ContractRequest,
  ContractOperationHandler,
  ResponseVariant,
} from '../../src/types.js';
import { StandardSchemaV1 } from '@standard-schema/spec';

test('EmptyObject should be assignable to Record<string, never>', () => {
  expectTypeOf<EmptyObject>().toEqualTypeOf<Record<string, never>>();
});

test('ExtractPathParams should extract single path parameter', () => {
  type Params = ExtractPathParams<'/users/:id'>;
  expectTypeOf<Params>().toEqualTypeOf<{ id: string }>();
});

test('ExtractPathParams should extract multiple path parameters', () => {
  type Params = ExtractPathParams<'/users/:userId/posts/:postId'>;
  expectTypeOf<Params>().toEqualTypeOf<{ userId: string; postId: string }>();
});

test('ExtractPathParams should return EmptyObject for paths without parameters', () => {
  type Params = ExtractPathParams<'/users'>;
  expectTypeOf<Params>().toEqualTypeOf<EmptyObject>();
});

test('ExtractPathParams should handle root path', () => {
  type Params = ExtractPathParams<'/'>;
  expectTypeOf<Params>().toEqualTypeOf<EmptyObject>();
});

test('ContractOperation should accept valid operation structure', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    // response
    { 200: { 'application/json': { body: StandardSchemaV1 } } },
    '/test'
  >;

  expectTypeOf<Op['method']>().toEqualTypeOf<
    'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
  >();
  expectTypeOf<Op['path']>().toEqualTypeOf<'/test'>();
});

test('ContractOperationParameters should extract parameters from path when pathParams is undefined', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    { 200: { 'application/json': { body: StandardSchemaV1 } } },
    '/users/:id'
  > & { method: 'GET' };
  type Params = ContractOperationParameters<Op>;
  expectTypeOf<Params>().toEqualTypeOf<{ id: string }>();
});

test('ContractOperationParameters should use pathParams schema when provided', () => {
  type Op = ContractOperation<
    StandardSchemaV1,
    undefined,
    undefined,
    undefined,
    { 200: { 'application/json': { body: StandardSchemaV1 } } },
    '/users/:id'
  > & { method: 'GET' };
  type Params = ContractOperationParameters<Op>;
  expectTypeOf<Params>().toEqualTypeOf<{ id: string }>();
});

test('ContractOperationQuery should fall back to raw query when query is undefined', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    { 200: { 'application/json': { body: StandardSchemaV1 } } }
  > & { method: 'GET' };
  type Query = ContractOperationQuery<Op>;
  expectTypeOf<Query>().toEqualTypeOf<Record<string, string | string[] | undefined>>();
});

test('ContractOperationQuery should extract query type from schema', () => {
  type Op = ContractOperation<
    undefined,
    StandardSchemaV1<any, any> &
      StandardSchemaV1.Types<{ page: string; limit: string }, { page: string; limit: string }>,
    undefined,
    undefined,
    { 200: { 'application/json': { body: StandardSchemaV1 } } }
  > & { method: 'GET' };
  type Query = ContractOperationQuery<Op>;
  expectTypeOf<Query>().toEqualTypeOf<{ page: string; limit: string }>();
});

test('ContractOperationBody should return undefined when request is undefined', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    { 200: { 'application/json': { body: StandardSchemaV1 } } }
  > & { method: 'GET' };
  type Body = ContractOperationBody<Op>;
  expectTypeOf<Body>().toEqualTypeOf<undefined>();
});

test('ContractOperationBody should extract body type from schema', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    { 'application/json': { body: StandardSchemaV1<unknown, unknown> } },
    undefined,
    { 200: { 'application/json': { body: StandardSchemaV1 } } }
  > & { method: 'POST' };
  type Body = ContractOperationBody<Op>;
  expectTypeOf<Body>().toEqualTypeOf<unknown>();
});

test('ContractOperationHeaders should return normalized headers when headers is undefined', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    { 200: { 'application/json': { body: StandardSchemaV1 } } }
  > & { method: 'GET' };
  type Headers = ContractOperationHeaders<Op>;
  expectTypeOf<Headers>().toEqualTypeOf<Record<string, string>>();
});

test('ContractOperationHeaders should extract headers type from schema', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    { 'application/json': { headers: StandardSchemaV1 } },
    { 200: { 'application/json': { body: StandardSchemaV1 } } }
  > & { method: 'GET' };
  type Headers = ContractOperationHeaders<Op>;
  expectTypeOf<Headers>().toEqualTypeOf<{ authorization: string }>();
});

test('ContractOperationResponse should create union of all response types', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    {
      200: { 'application/json': { body: { success: boolean } } };
      400: { 'application/json': { body: { error: string } } };
    }
  > & { method: 'GET' };
  type Response = ContractOperationResponse<Op>;
  expectTypeOf<Response>().toMatchTypeOf<
    | { status: 200; body: { success: boolean } }
    | { status: 400; 'application/json': { body: { error: string } } }
  >();
});

test('ContractOperationResponse should include headers when specified', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    {
      200: { 'application/json': { body: StandardSchemaV1; headers: StandardSchemaV1 } };
    }
  > & { method: 'GET' };
  type Response = ContractOperationResponse<Op>;
  expectTypeOf<Response>().toMatchTypeOf<{
    status: 200;
    body: { success: boolean };
    headers?: { 'content-type': string };
  }>();
});

test('ContractOperationStatusCodes should extract valid status codes', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    {
      200: { 'application/json': { body: StandardSchemaV1 } };
      400: { 'application/json': { body: StandardSchemaV1 } };
      404: { 'application/json': { body: StandardSchemaV1 } };
    }
  > & { method: 'GET' };
  type StatusCodes = ContractOperationStatusCodes<Op>;
  expectTypeOf<StatusCodes>().toEqualTypeOf<200 | 400 | 404>();
});

test('ContractOperationResponseBody should extract body type for specific status code', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    {
      200: { 'application/json': { body: { success: boolean } } };
      400: { 'application/json': { body: { error: string } } };
    }
  > & { method: 'GET' };
  type Body200 = ContractOperationResponseBody<Op, 200>;
  type Body400 = ContractOperationResponseBody<Op, 400>;
  expectTypeOf<Body200>().toEqualTypeOf<{ success: boolean }>();
  expectTypeOf<Body400>().toEqualTypeOf<{ error: string }>();
});

test('ContractRequest should extend request with typed params, validatedQuery, validatedBody, and validatedHeaders', () => {
  type Op = ContractOperation<
    undefined,
    { parse: (input: unknown) => { page: number } },
    { 'application/json': { body: { parse: (input: unknown) => { name: string } } } },
    { parse: (input: unknown) => { authorization: string } },
    { 200: { 'application/json': { body: { success: boolean } } } },
    '/users/:id'
  > & { method: 'GET' };
  type Request = ContractRequest<Op>;
  expectTypeOf<Request['params']>().toEqualTypeOf<{ id: string }>();
  expectTypeOf<Request['query']>().toEqualTypeOf<{ page: number }>();
  expectTypeOf<Request['validatedQuery']>().toEqualTypeOf<{ page: number }>();
  expectTypeOf<Request['validatedBody']>().toEqualTypeOf<{ name: string }>();
  expectTypeOf<Request['validatedHeaders']>().toEqualTypeOf<Headers>();
});

test('ContractRequest should include response helper methods', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    {
      200: { 'application/json': { body: StandardSchemaV1 } };
      400: { 'application/json': { body: StandardSchemaV1 } };
    }
  > & { method: 'GET' };
  type Request = ContractRequest<Op>;
  expectTypeOf<Request['respond']>().toBeFunction();
});

test('ContractOperationHandler should accept handler function with correct signature', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    { 200: { 'application/json': { body: StandardSchemaV1 } } }
  > & { method: 'GET' };
  type Handler = ContractOperationHandler<Op>;
  expectTypeOf<Handler>().toBeFunction();
  expectTypeOf<Handler>().returns.toMatchTypeOf<Promise<ContractOperationResponse<Op>>>();
});

test('ContractOperationParameters should infer EmptyObject when pathParams schema is omitted', () => {
  type Op = ContractOperation<
    undefined, // pathParams omitted
    undefined,
    undefined,
    undefined,
    { 200: { 'application/json': { body: StandardSchemaV1 } } },
    '/users/:id'
  > & { method: 'GET' };
  type Params = ContractOperationParameters<Op>;
  // Should extract from path since no schema provided
  expectTypeOf<Params>().toEqualTypeOf<{ id: string }>();
});

test('ContractOperationQuery should infer raw query when query schema is omitted', () => {
  type Op = ContractOperation<
    undefined,
    undefined, // query omitted
    undefined,
    undefined,
    { 200: { 'application/json': { body: StandardSchemaV1 } } }
  > & { method: 'GET' };
  type Query = ContractOperationQuery<Op>;
  expectTypeOf<Query>().toEqualTypeOf<Record<string, string | string[] | undefined>>();
});

test('ContractOperationBody should infer undefined when request schema is omitted', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined, // request omitted
    undefined,
    { 200: { 'application/json': { body: StandardSchemaV1 } } }
  > & { method: 'GET' };
  type Body = ContractOperationBody<Op>;
  expectTypeOf<Body>().toEqualTypeOf<undefined>();
});

test('ContractOperationHeaders should infer normalized headers when headers schema is omitted', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined, // headers omitted
    { 200: { 'application/json': { body: StandardSchemaV1 } } }
  > & { method: 'GET' };
  type Headers = ContractOperationHeaders<Op>;
  expectTypeOf<Headers>().toEqualTypeOf<Record<string, string>>();
});

test('ResponseVariant should extract specific response variant by status code', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    {
      200: { 'application/json': { body: StandardSchemaV1 } };
      400: { 'application/json': { body: StandardSchemaV1 } };
      404: { 'application/json': { body: StandardSchemaV1 } };
    }
  > & { method: 'GET' };
  type Response200 = ResponseVariant<Op, 200>;
  type Response400 = ResponseVariant<Op, 400>;

  expectTypeOf<Response200>().toEqualTypeOf<{ status: 200; body: { success: boolean } }>();
  expectTypeOf<Response400>().toEqualTypeOf<{ status: 400; body: { error: string } }>();
});

test('Response helper respond should return discriminated variant', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    {
      200: { 'application/json': { body: StandardSchemaV1 } };
      201: { 'application/json': { body: StandardSchemaV1 } };
    }
  > & { method: 'GET' };
  type Request = ContractRequest<Op>;

  // respond with status 200 should return ResponseVariant<Op, 200>
  type Respond200Return = ReturnType<Request['respond']>;
  // Note: This tests that the return type is narrowed, not the full union
  expectTypeOf<Respond200Return>().toMatchTypeOf<{ status: 200; body: { success: boolean } }>();
});

test('ContractOperation should allow optional operationId', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    { 200: { 'application/json': { body: StandardSchemaV1 } } },
    '/test'
  >;
  // operationId should be optional
  const op: Op = {
    path: '/test',
    method: 'GET',
    responses: { 200: { 'application/json': { body: StandardSchemaV1 } } },
  };
  expectTypeOf(op.operationId).toEqualTypeOf<string | undefined>();
});

test('ContractOperation should require method', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    { 200: { 'application/json': { body: StandardSchemaV1 } } },
    '/test'
  >;
  // method should be required
  const op: Op = {
    path: '/test',
    method: 'GET',
    responses: { 200: { 'application/json': { body: StandardSchemaV1 } } },
  };
  expectTypeOf(op.method).toEqualTypeOf<
    'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
  >();
});

test('ContractRequest should expose predictable types when no schemas are provided', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    { 200: { 'application/json': { body: StandardSchemaV1 } } },
    '/users'
  > & { method: 'GET' };
  type Request = ContractRequest<Op>;

  // Query falls back to itty's raw query shape, body is undefined, headers are Headers object
  expectTypeOf<Request['query']>().toEqualTypeOf<Record<string, string | string[] | undefined>>();
  expectTypeOf<Request['validatedBody']>().toEqualTypeOf<undefined>();
  expectTypeOf<Request['validatedHeaders']>().toEqualTypeOf<Headers>();
});

test('ContractOperation should accept explicit method', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    { 200: { 'application/json': { body: StandardSchemaV1 } } },
    '/test'
  >;
  const op: Op = {
    path: '/test',
    method: 'POST',
    responses: { 200: { 'application/json': { body: StandardSchemaV1 } } },
  };
  expectTypeOf(op.method).toEqualTypeOf<'POST'>();
});
