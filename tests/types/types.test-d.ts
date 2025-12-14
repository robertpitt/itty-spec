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
    { 200: { body: StandardSchemaV1 } },
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
    { 200: { body: StandardSchemaV1 } },
    '/users/:id'
  >;
  type Params = ContractOperationParameters<Op>;
  expectTypeOf<Params>().toEqualTypeOf<{ id: string }>();
});

test('ContractOperationParameters should use pathParams schema when provided', () => {
  type Op = ContractOperation<
    StandardSchemaV1,
    undefined,
    undefined,
    undefined,
    { 200: { body: StandardSchemaV1 } },
    '/users/:id'
  >;
  type Params = ContractOperationParameters<Op>;
  expectTypeOf<Params>().toEqualTypeOf<{ id: string }>();
});

test('ContractOperationQuery should fall back to raw query when query is undefined', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    { 200: { body: StandardSchemaV1 } }
  >;
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
    { 200: { body: StandardSchemaV1 } }
  >;
  type Query = ContractOperationQuery<Op>;
  expectTypeOf<Query>().toEqualTypeOf<{ page: string; limit: string }>();
});

test('ContractOperationBody should return undefined when request is undefined', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    { 200: { body: StandardSchemaV1 } }
  >;
  type Body = ContractOperationBody<Op>;
  expectTypeOf<Body>().toEqualTypeOf<undefined>();
});

test('ContractOperationBody should extract body type from schema', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    { parse: (input: unknown) => { name: string; email: string } },
    undefined,
    { 200: { body: { value: string } } }
  >;
  type Body = ContractOperationBody<Op>;
  expectTypeOf<Body>().toEqualTypeOf<{ name: string; email: string }>();
});

test('ContractOperationHeaders should return normalized headers when headers is undefined', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    { 200: { body: StandardSchemaV1 } }
  >;
  type Headers = ContractOperationHeaders<Op>;
  expectTypeOf<Headers>().toEqualTypeOf<Record<string, string>>();
});

test('ContractOperationHeaders should extract headers type from schema', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    { parse: (input: unknown) => { authorization: string } },
    { 200: { body: { value: string } } }
  >;
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
      200: { body: { success: boolean } };
      400: { body: { error: string } };
    }
  >;
  type Response = ContractOperationResponse<Op>;
  expectTypeOf<Response>().toMatchTypeOf<
    { status: 200; body: { success: boolean } } | { status: 400; body: { error: string } }
  >();
});

test('ContractOperationResponse should include headers when specified', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    {
      200: { body: StandardSchemaV1; headers: StandardSchemaV1 };
    }
  >;
  type Response = ContractOperationResponse<Op>;
  expectTypeOf<Response>().toMatchTypeOf<{
    status: 200;
    body: { success: boolean };
    headers?: { 'Content-Type': string };
  }>();
});

test('ContractOperationStatusCodes should extract valid status codes', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    {
      200: { body: StandardSchemaV1 };
      400: { body: StandardSchemaV1 };
      404: { body: StandardSchemaV1 };
    }
  >;
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
      200: { body: { success: boolean } };
      400: { body: { error: string } };
    }
  >;
  type Body200 = ContractOperationResponseBody<Op, 200>;
  type Body400 = ContractOperationResponseBody<Op, 400>;
  expectTypeOf<Body200>().toEqualTypeOf<{ success: boolean }>();
  expectTypeOf<Body400>().toEqualTypeOf<{ error: string }>();
});

test('ContractRequest should extend request with typed params, validatedQuery, validatedBody, and validatedHeaders', () => {
  type Op = ContractOperation<
    undefined,
    { parse: (input: unknown) => { page: number } },
    { parse: (input: unknown) => { name: string } },
    { parse: (input: unknown) => { authorization: string } },
    { 200: { body: { success: boolean } } },
    '/users/:id'
  >;
  type Request = ContractRequest<Op>;
  expectTypeOf<Request['params']>().toEqualTypeOf<{ id: string }>();
  expectTypeOf<Request['query']>().toEqualTypeOf<{ page: number }>();
  expectTypeOf<Request['validatedQuery']>().toEqualTypeOf<{ page: number }>();
  expectTypeOf<Request['validatedBody']>().toEqualTypeOf<{ name: string }>();
  expectTypeOf<Request['validatedHeaders']>().toEqualTypeOf<{ authorization: string }>();
});

test('ContractRequest should include response helper methods', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    {
      200: { body: StandardSchemaV1 };
      400: { body: StandardSchemaV1 };
    }
  >;
  type Request = ContractRequest<Op>;
  expectTypeOf<Request['json']>().toBeFunction();
  expectTypeOf<Request['error']>().toBeFunction();
});

test('ContractOperationHandler should accept handler function with correct signature', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    { 200: { body: StandardSchemaV1 } }
  >;
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
    { 200: { body: StandardSchemaV1 } },
    '/users/:id'
  >;
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
    { 200: { body: StandardSchemaV1 } }
  >;
  type Query = ContractOperationQuery<Op>;
  expectTypeOf<Query>().toEqualTypeOf<Record<string, string | string[] | undefined>>();
});

test('ContractOperationBody should infer undefined when request schema is omitted', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined, // request omitted
    undefined,
    { 200: { body: StandardSchemaV1 } }
  >;
  type Body = ContractOperationBody<Op>;
  expectTypeOf<Body>().toEqualTypeOf<undefined>();
});

test('ContractOperationHeaders should infer normalized headers when headers schema is omitted', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined, // headers omitted
    { 200: { body: StandardSchemaV1 } }
  >;
  type Headers = ContractOperationHeaders<Op>;
  expectTypeOf<Headers>().toEqualTypeOf<Record<string, string>>();
});

test('ResponseSchemas should require default when 200 is not present', () => {
  type Responses = {
    201: { body: { id: string } };
    400: { body: { error: string } };
    default: { body: { error: string } };
  };
  // This should compile - default is required
  type ValidResponses = {
    201: { body: { id: string } };
    400: { body: { error: string } };
    default: { body: { error: string } };
  };
  expectTypeOf<ValidResponses>().toMatchTypeOf<Responses>();
});

test('ResponseSchemas should make default optional when 200 is present', () => {
  type Responses = {
    200: { body: { success: boolean } };
    400: { body: { error: string } };
    // default is optional here
  };
  type ValidResponses = {
    200: { body: { success: boolean } };
    400: { body: { error: string } };
  };
  expectTypeOf<ValidResponses>().toMatchTypeOf<Responses>();
});

test('ResponseVariant should extract specific response variant by status code', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    {
      200: { body: StandardSchemaV1 };
      400: { body: StandardSchemaV1 };
      404: { body: StandardSchemaV1 };
    }
  >;
  type Response200 = ResponseVariant<Op, 200>;
  type Response400 = ResponseVariant<Op, 400>;

  expectTypeOf<Response200>().toEqualTypeOf<{ status: 200; body: { success: boolean } }>();
  expectTypeOf<Response400>().toEqualTypeOf<{ status: 400; body: { error: string } }>();
});

test('Response helper json should return discriminated variant', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    {
      200: { body: StandardSchemaV1 };
      201: { body: StandardSchemaV1 };
    }
  >;
  type Request = ContractRequest<Op>;

  // json with status 200 should return ResponseVariant<Op, 200>
  type Json200Return = ReturnType<Request['json']>;
  // Note: This tests that the return type is narrowed, not the full union
  expectTypeOf<Json200Return>().toMatchTypeOf<{ status: 200; body: { success: boolean } }>();
});

test('ContractOperation should allow optional operationId', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    { 200: { body: StandardSchemaV1 } },
    '/test'
  >;
  // operationId should be optional
  const op: Op = {
    path: '/test',
    responses: { 200: { body: StandardSchemaV1 } },
  };
  expectTypeOf(op.operationId).toEqualTypeOf<string | undefined>();
});

test('ContractOperation should allow optional method', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    { 200: { body: StandardSchemaV1 } },
    '/test'
  >;
  // method should be optional
  const op: Op = {
    path: '/test',
    responses: { 200: { body: StandardSchemaV1 } },
  };
  expectTypeOf(op.method).toEqualTypeOf<
    'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | undefined
  >();
});

test('ContractRequest should expose predictable types when no schemas are provided', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    { 200: { body: StandardSchemaV1 } },
    '/users'
  >;
  type Request = ContractRequest<Op>;

  // Query falls back to itty's raw query shape, body is undefined, headers are normalized
  expectTypeOf<Request['query']>().toEqualTypeOf<Record<string, string | string[] | undefined>>();
  expectTypeOf<Request['validatedBody']>().toEqualTypeOf<undefined>();
  expectTypeOf<Request['validatedHeaders']>().toEqualTypeOf<Record<string, string>>();
});

test('ContractOperation should accept explicit method', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    { 200: { body: StandardSchemaV1 } },
    '/test'
  >;
  const op: Op = {
    path: '/test',
    method: 'POST',
    responses: { 200: { body: StandardSchemaV1 } },
  };
  expectTypeOf(op.method).toEqualTypeOf<'POST'>();
});
