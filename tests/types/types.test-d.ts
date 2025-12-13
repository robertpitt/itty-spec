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
} from '../../src/types.js';

test('EmptyObject should be assignable to Record<string, never>', () => {
  expectTypeOf<EmptyObject>().toMatchTypeOf<Record<string, never>>();
});

test('EmptyObject should not accept any properties', () => {
  const empty: EmptyObject = {};
  // @ts-expect-error - EmptyObject should not accept properties
  const invalid: EmptyObject = { key: 'value' };
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

test('ExtractPathParams should handle paths with trailing slashes', () => {
  type Params = ExtractPathParams<'/users/:id/'>;
  expectTypeOf<Params>().toEqualTypeOf<{ id: string }>();
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
    { 200: { body: { value: string } } },
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
    { 200: { body: { value: string } } },
    '/users/:id'
  >;
  type Params = ContractOperationParameters<Op>;
  expectTypeOf<Params>().toEqualTypeOf<{ id: string }>();
});

test('ContractOperationParameters should use pathParams schema when provided', () => {
  type Op = ContractOperation<
    { parse: (input: unknown) => { userId: number } },
    undefined,
    undefined,
    undefined,
    { 200: { body: { value: string } } },
    '/users/:id'
  >;
  type Params = ContractOperationParameters<Op>;
  expectTypeOf<Params>().toEqualTypeOf<{ userId: number }>();
});

test('ContractOperationQuery should return EmptyObject when query is undefined', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    { 200: { body: { value: string } } }
  >;
  type Query = ContractOperationQuery<Op>;
  expectTypeOf<Query>().toEqualTypeOf<EmptyObject>();
});

test('ContractOperationQuery should extract query type from schema', () => {
  type Op = ContractOperation<
    undefined,
    { parse: (input: unknown) => { page: number; limit: number } },
    undefined,
    undefined,
    { 200: { body: { value: string } } }
  >;
  type Query = ContractOperationQuery<Op>;
  expectTypeOf<Query>().toEqualTypeOf<{ page: number; limit: number }>();
});

test('ContractOperationBody should return never when request is undefined', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    { 200: { body: { value: string } } }
  >;
  type Body = ContractOperationBody<Op>;
  expectTypeOf<Body>().toEqualTypeOf<never>();
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

test('ContractOperationHeaders should return EmptyObject when headers is undefined', () => {
  type Op = ContractOperation<
    undefined,
    undefined,
    undefined,
    undefined,
    { 200: { body: { value: string } } }
  >;
  type Headers = ContractOperationHeaders<Op>;
  expectTypeOf<Headers>().toEqualTypeOf<EmptyObject>();
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
      200: { body: { success: boolean }; headers: { 'Content-Type': string } };
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
      200: { body: { success: boolean } };
      400: { body: { error: string } };
      404: { body: { error: string } };
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

test('ContractRequest should extend request with typed params, query, body, and headers', () => {
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
  expectTypeOf<Request['body']>().toEqualTypeOf<{ name: string }>();
  expectTypeOf<Request['headers']>().toEqualTypeOf<{ authorization: string }>();
});

test('ContractRequest should include response helper methods', () => {
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
    { 200: { body: { success: boolean } } }
  >;
  type Handler = ContractOperationHandler<Op>;
  expectTypeOf<Handler>().toBeFunction();
  expectTypeOf<Handler>().returns.toMatchTypeOf<Promise<ContractOperationResponse<Op>>>();
});
