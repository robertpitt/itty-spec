import { test, expect, describe } from 'vitest';
import type { IRequest } from 'itty-router';
import {
  withContractOperation,
  withPathParams,
  withQueryParams,
  withHeaders,
  withBody,
  withResponseHelpers,
  withContractFormat,
  withContractErrorHandler,
} from '../../src/middleware.js';
import type { ContractOperation } from '../../src/types.js';
import { z } from 'zod/v4';

/**
 * Helper function to create a mock IRequest object that is compatible with itty-router's IRequest type.
 * Since IRequest extends Request, we need to merge custom properties onto a real Request object
 * to satisfy TypeScript's type checking.
 */
function createMockRequest(overrides: Partial<IRequest> = {}): IRequest {
  const url = overrides.url || 'http://example.com/test';
  const init: RequestInit = {};

  // Handle headers - can be Headers object, plain object, or array of tuples
  if (overrides.headers) {
    if (overrides.headers instanceof Headers) {
      init.headers = overrides.headers;
    } else if (Array.isArray(overrides.headers)) {
      init.headers = new Headers(overrides.headers as Record<string, string>);
    } else {
      // Plain object - convert to Headers
      init.headers = new Headers(overrides.headers as Record<string, string>);
    }
  }

  const request = new Request(url, init) as IRequest;

  // Attach other overrides as properties (for things like params, query, text method)
  if (overrides.params) {
    (request as any).params = overrides.params;
  }
  if (overrides.query) {
    (request as any).query = overrides.query;
  }
  if (overrides.text) {
    (request as any).text = overrides.text;
  }

  return request;
}

test('withContractOperation should attach contract operation to request', () => {
  const operation: ContractOperation = {
    operationId: 'test',
    path: '/test',
    method: 'GET',
    responses: { 200: { 'application/json': { body: z.object({ message: z.string() }) } } },
  };

  const request = createMockRequest({ url: 'http://example.com/test' });
  withContractOperation(operation)(request);
  expect((request as any).__contractOperation).toBe(operation);
});

describe('withPathParams', () => {
  test('withPathParams should use params from request when no schema provided', async () => {
    const operation: ContractOperation = {
      operationId: 'test',
      path: '/users/:id',
      method: 'GET',
      responses: { 200: { 'application/json': { body: z.object({ message: z.string() }) } } },
    };

    const request = new Request('http://example.com/users/123') as IRequest;
    withContractOperation(operation)(request);

    await withPathParams(request);

    expect((request as any).params).toEqual({ id: '123' });
  });

  test('withPathParams should handle empty params', async () => {
    const operation: ContractOperation = {
      operationId: 'test',
      path: '/test',
      method: 'GET',
      responses: { 200: { 'application/json': { body: z.object({ message: z.string() }) } } },
    };

    const request = createMockRequest({
      url: 'http://example.com/test',
      params: {},
    });
    withContractOperation(operation)(request);

    await withPathParams(request);

    expect((request as any).params).toEqual({});
  });
});

describe('withQueryParams', () => {
  test('withQueryParams should use query from request when no schema provided', async () => {
    const operation: ContractOperation = {
      operationId: 'test',
      path: '/test',
      method: 'GET',
      responses: { 200: { 'application/json': { body: z.object({ message: z.string() }) } } },
    };

    const request = createMockRequest({
      url: 'http://example.com/test?page=1&limit=10',
      query: { page: '1', limit: '10' },
    });
    withContractOperation(operation)(request);

    await withQueryParams(request);

    expect((request as any).validatedQuery).toEqual({ page: '1', limit: '10' });
  });

  test('withQueryParams should handle empty query', async () => {
    const operation: ContractOperation = {
      operationId: 'test',
      path: '/test',
      method: 'GET',
      responses: { 200: { 'application/json': { body: z.object({ message: z.string() }) } } },
    };

    const request = createMockRequest({
      url: 'http://example.com/test',
      query: {},
    });
    withContractOperation(operation)(request);

    await withQueryParams(request);

    expect((request as any).validatedQuery).toEqual({});
  });
});

describe('withHeaders', () => {
  test('withHeaders should normalize Headers object when no schema provided', async () => {
    const operation: ContractOperation = {
      operationId: 'test',
      path: '/test',
      method: 'GET',
      responses: { 200: { 'application/json': { body: z.object({ message: z.string() }) } } },
    };

    const headers = new Headers();
    headers.set('authorization', 'Bearer token');
    const request = createMockRequest({
      url: 'http://example.com/test',
      headers,
    });
    withContractOperation(operation)(request);

    await withHeaders(request);

    expect((request as any).validatedHeaders).toHaveProperty('authorization');
    expect((request.validatedHeaders as Record<string, string>).authorization).toBe('Bearer token');
  });

  test('withHeaders should validate headers against schema when provided', async () => {
    const operation: ContractOperation = {
      operationId: 'test',
      path: '/test',
      method: 'GET',
      headers: z.object({
        authorization: z.string(),
      }),
      responses: { 200: { 'application/json': { body: z.object({ message: z.string() }) } } },
    };

    const headers = new Headers();
    headers.set('authorization', 'Bearer token');
    const request = createMockRequest({
      url: 'http://example.com/test',
      headers,
    });
    withContractOperation(operation)(request);

    await withHeaders(request);

    expect((request as any).validatedHeaders).toHaveProperty('authorization');
  });

  test('withHeaders should handle plain object headers', async () => {
    const operation: ContractOperation = {
      operationId: 'test',
      path: '/test',
      method: 'GET',
      responses: { 200: { 'application/json': { body: z.object({ message: z.string() }) } } },
    };

    const request = createMockRequest({
      url: 'http://example.com/test',
      headers: { authorization: 'Bearer token' },
    });
    withContractOperation(operation)(request);

    await withHeaders(request);

    expect(request.validatedHeaders).toHaveProperty('authorization');
  });

  test('withHeaders should handle comma-separated Accept header with matching first value', async () => {
    const operation: ContractOperation = {
      operationId: 'test',
      path: '/test',
      method: 'POST',
      headers: z.object({
        accept: z.enum(['application/json', 'application/xml']),
      }),
      responses: { 200: { 'application/json': { body: z.object({ message: z.string() }) } } },
    };

    const headers = new Headers();
    headers.set('accept', 'application/json, text/html, application/xml');
    const request = createMockRequest({
      url: 'http://example.com/test',
      headers,
    });
    withContractOperation(operation)(request);

    await withHeaders(request);

    expect((request as any).validatedHeaders).toHaveProperty('accept');
    expect((request.validatedHeaders as Record<string, string>).accept).toBe('application/json');
  });

  test('withHeaders should handle comma-separated Accept header with matching later value', async () => {
    const operation: ContractOperation = {
      operationId: 'test',
      path: '/test',
      method: 'POST',
      headers: z.object({
        accept: z.enum(['application/json', 'application/xml']),
      }),
      responses: { 200: { 'application/json': { body: z.object({ message: z.string() }) } } },
    };

    const headers = new Headers();
    headers.set('accept', 'text/html, application/xml, text/plain');
    const request = createMockRequest({
      url: 'http://example.com/test',
      headers,
    });
    withContractOperation(operation)(request);

    await withHeaders(request);

    expect((request as any).validatedHeaders).toHaveProperty('accept');
    expect((request.validatedHeaders as Record<string, string>).accept).toBe('application/xml');
  });

  test('withHeaders should fail validation when no comma-separated Accept values match', async () => {
    const operation: ContractOperation = {
      operationId: 'test',
      path: '/test',
      method: 'POST',
      headers: z.object({
        accept: z.enum(['application/json', 'application/xml']),
      }),
      responses: { 200: { 'application/json': { body: z.object({ message: z.string() }) } } },
    };

    const headers = new Headers();
    headers.set('accept', 'text/html, text/plain');
    const request = createMockRequest({
      url: 'http://example.com/test',
      headers,
    });
    withContractOperation(operation)(request);

    await expect(withHeaders(request)).rejects.toThrow('Validation failed');
  });
});

describe('withBody', () => {
  test('withBody should parse JSON body when schema provided', async () => {
    const operation: ContractOperation = {
      operationId: 'test',
      path: '/test',
      method: 'POST',
      requests: {
        'application/json': {
          body: z.object({ name: z.string(), email: z.string() }),
        },
      },
      responses: { 200: { 'application/json': { body: z.object({ message: z.string() }) } } },
    };

    const bodyText = JSON.stringify({ name: 'John', email: 'john@example.com' });
    const request = createMockRequest({
      url: 'http://example.com/test',
      headers: { 'content-type': 'application/json' },
      text: async () => bodyText,
    });
    withContractOperation(operation)(request);

    await withBody(request);

    expect((request as any).validatedBody).toHaveProperty('name');
    expect((request as any).validatedBody).toHaveProperty('email');
  });

  test('withBody should handle empty body when no schema provided', async () => {
    const operation: ContractOperation = {
      operationId: 'test',
      path: '/test',
      method: 'GET',
      responses: { 200: { 'application/json': { body: z.object({ message: z.string() }) } } },
    };

    const request = createMockRequest({
      url: 'http://example.com/test',
      text: async () => '',
    });
    withContractOperation(operation)(request);
    await withBody(request);

    expect((request as any).validatedBody).toEqual({});
  });

  test('withBody should handle already consumed body', async () => {
    const operation: ContractOperation<any, any, any, any> = {
      operationId: 'test',
      path: '/test',
      method: 'POST',
      requests: { 'application/json': {} },
      responses: { 200: { 'application/json': { body: z.object({ message: z.string() }) } } },
    };

    const request = createMockRequest({
      url: 'http://example.com/test',
      text: async () => {
        throw new Error('Body already consumed');
      },
    });
    withContractOperation(operation)(request);
    await withBody(request);

    // Should handle error gracefully by setting empty body
    expect((request as any).validatedBody).toEqual({});
  });
});

describe('withResponseHelpers', () => {
  test('withResponseHelpers should attach response helpers to request', () => {
    const operation: ContractOperation = {
      operationId: 'test',
      path: '/test',
      method: 'GET',
      responses: {
        200: { 'application/json': { body: z.object({ message: z.string() }) } },
        400: { 'application/json': { body: z.object({ error: z.string() }) } },
      },
    };

    const request = createMockRequest({ url: 'http://example.com/test' });
    withContractOperation(operation)(request);
    withResponseHelpers(request);

    expect((request as any).respond).toBeDefined();
  });
});

describe('withContractFormat', () => {
  test('withContractFormat should format contract response object', () => {
    const formatter = withContractFormat();
    const contractResponse = {
      status: 200,
      body: { message: 'test' },
    };
    const result = formatter(contractResponse, createMockRequest());

    expect(result).toBeInstanceOf(Response);
    expect(result.status).toBe(200);
  });

  test('withContractFormat should handle 204 No Content response', () => {
    const formatter = withContractFormat();
    const contractResponse = {
      status: 204,
      body: undefined,
    };
    const result = formatter(contractResponse, createMockRequest());

    expect(result).toBeInstanceOf(Response);
    expect(result.status).toBe(204);
    expect(result.body).toBeNull();
  });

  test('withContractFormat should set content-type header for JSON responses', () => {
    const formatter = withContractFormat();
    const contractResponse = {
      status: 200,
      body: { message: 'test' },
    };
    const result = formatter(contractResponse, createMockRequest());

    expect(result.headers.get('content-type')).toBe('application/json');
  });

  test('withContractFormat should preserve custom headers', () => {
    const formatter = withContractFormat();
    const contractResponse = {
      status: 200,
      body: { message: 'test' },
      headers: { 'x-custom-header': 'value' },
    };
    const result = formatter(contractResponse, createMockRequest());

    expect(result.headers.get('x-custom-header')).toBe('value');
  });

  test('withContractFormat should use custom formatter as fallback', async () => {
    const customFormatter = () => new Response('custom', { status: 201 });
    const formatter = withContractFormat(customFormatter);
    const result = formatter('not a contract response', createMockRequest());

    expect(result.status).toBe(201);
    expect(await result.text()).toBe('custom');
  });
});

describe('withContractErrorHandler', () => {
  test('withContractErrorHandler should handle validation errors', () => {
    const errorHandler = withContractErrorHandler();
    const validationError = new Error('Validation failed');
    (validationError as any).issues = [{ path: ['name'], message: 'Required' }];

    const response = errorHandler(validationError, createMockRequest());

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(400);
  });

  test('withContractErrorHandler should handle non-validation errors', () => {
    const errorHandler = withContractErrorHandler();
    const error = new Error('Something went wrong');

    const response = errorHandler(error, createMockRequest());

    expect(response).toBeInstanceOf(Response);
  });
});
