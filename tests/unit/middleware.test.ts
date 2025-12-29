import { test, expect, describe } from 'vitest';
import type { IRequest } from 'itty-router';
import {
  withMatchingContractOperation,
  withSpecValidation,
  withResponseHelpers,
  withContractFormat,
  withContractErrorHandler,
} from '../../src/middleware';
import type { ContractOperation } from '../../src/types.js';
import * as v from 'valibot';

/**
 * Helper function to create a mock IRequest object that is compatible with itty-router's IRequest type.
 * Since IRequest extends Request, we need to merge custom properties onto a real Request object
 * to satisfy TypeScript's type checking.
 */
function createMockRequest(
  overrides: Partial<Omit<IRequest, 'headers'> & { headers?: HeadersInit }> = {}
): IRequest {
  const url = overrides.url || 'http://example.com/test';
  const init: RequestInit = {
    method: overrides.method || 'GET',
  };

  // Handle headers - can be Headers object, plain object, or array of tuples
  if (overrides.headers) {
    if (overrides.headers instanceof Headers) {
      init.headers = overrides.headers;
    } else {
      // Plain object or array - convert to Headers
      init.headers = new Headers(overrides.headers);
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

test('withMatchingContractOperation should attach contract operation to request', () => {
  const operation: ContractOperation = {
    operationId: 'test',
    path: '/test',
    method: 'GET',
    responses: { 200: { 'application/json': { body: v.object({ message: v.string() }) } } },
  };

  const request = createMockRequest({ url: 'http://example.com/test' });
  withMatchingContractOperation({ test: operation })(request);
  expect((request as any).__contractOperation).toBe(operation);
});

describe('withSpecValidation - path params', () => {
  test('should use params from request when no schema provided', async () => {
    const operation: ContractOperation = {
      operationId: 'test',
      path: '/users/:id',
      method: 'GET',
      responses: { 200: { 'application/json': { body: v.object({ message: v.string() }) } } },
    };

    const request = new Request('http://example.com/users/123') as IRequest;
    withMatchingContractOperation({ test: operation })(request);

    await withSpecValidation(request);

    expect((request as any).validatedParams).toEqual({ id: '123' });
  });

  test('should handle empty params', async () => {
    const operation: ContractOperation = {
      operationId: 'test',
      path: '/test',
      method: 'GET',
      responses: { 200: { 'application/json': { body: v.object({ message: v.string() }) } } },
    };

    const request = createMockRequest({
      url: 'http://example.com/test',
      params: {},
    });
    withMatchingContractOperation({ test: operation })(request);

    await withSpecValidation(request);

    expect((request as any).params).toEqual({});
  });
});

describe('withSpecValidation - query params', () => {
  test('should use query from request when no schema provided', async () => {
    const operation: ContractOperation = {
      operationId: 'test',
      path: '/test',
      method: 'GET',
      responses: { 200: { 'application/json': { body: v.object({ message: v.string() }) } } },
    };

    const request = createMockRequest({
      url: 'http://example.com/test?page=1&limit=10',
      query: { page: '1', limit: '10' },
    });
    withMatchingContractOperation({ test: operation })(request);

    await withSpecValidation(request);

    expect((request as any).query).toEqual({ page: '1', limit: '10' });
    expect((request as any).validatedQuery).toEqual({});
  });

  test('should handle empty query', async () => {
    const operation: ContractOperation = {
      operationId: 'test',
      path: '/test',
      method: 'GET',
      responses: { 200: { 'application/json': { body: v.object({ message: v.string() }) } } },
    };

    const request = createMockRequest({
      url: 'http://example.com/test',
      query: {},
    });
    withMatchingContractOperation({ test: operation })(request);

    await withSpecValidation(request);

    expect((request as any).validatedQuery).toEqual({});
  });
});

describe('withSpecValidation - headers', () => {
  test('should normalize Headers object when no schema provided', async () => {
    const operation: ContractOperation = {
      operationId: 'test',
      path: '/test',
      method: 'GET',
      responses: { 200: { 'application/json': { body: v.object({ message: v.string() }) } } },
    };

    const headers = new Headers();
    headers.set('authorization', 'Bearer token');
    const request = createMockRequest({
      url: 'http://example.com/test',
      headers,
    });
    withMatchingContractOperation({ test: operation })(request);

    await withSpecValidation(request);

    expect(request.validatedHeaders).toBeUndefined();
    expect(request.headers.get('authorization')).toBe('Bearer token');
  });

  test('should validate headers against schema when provided', async () => {
    const operation: ContractOperation<any, any, any, any> = {
      operationId: 'test',
      path: '/test',
      method: 'GET',
      headers: v.object({
        authorization: v.string(),
      }),
      responses: { 200: { 'application/json': { body: v.object({ message: v.string() }) } } },
    };

    const headers = new Headers();
    headers.set('authorization', 'Bearer token');
    const request = createMockRequest({
      url: 'http://example.com/test',
      headers,
    });
    withMatchingContractOperation({ test: operation })(request);

    await withSpecValidation(request);

    expect(request.validatedHeaders).toBeInstanceOf(Headers);
    expect(request.validatedHeaders.get('authorization')).toBe('Bearer token');
  });

  test('should handle plain object headers', async () => {
    const operation: ContractOperation = {
      operationId: 'test',
      path: '/test',
      method: 'GET',
      responses: { 200: { 'application/json': { body: v.object({ message: v.string() }) } } },
    };

    const request = createMockRequest({
      url: 'http://example.com/test',
      headers: { authorization: 'Bearer token' },
    });
    withMatchingContractOperation({ test: operation })(request);

    await withSpecValidation(request);

    expect(request.validatedHeaders).toBeUndefined();
    expect(request.headers.get('authorization')).toBe('Bearer token');
  });

  test('should handle comma-separated Accept header with matching first value', async () => {
    const operation: ContractOperation<any, any, any, any> = {
      operationId: 'test',
      path: '/test',
      method: 'POST',
      headers: v.object({
        accept: v.picklist(['application/json', 'application/xml']),
      }),
      responses: { 200: { 'application/json': { body: v.object({ message: v.string() }) } } },
    };

    const headers = new Headers();
    headers.append('accept', 'application/json');
    headers.append('accept', 'text/html');
    headers.append('accept', 'application/xml');

    const request = createMockRequest({
      url: 'http://example.com/test',
      method: 'POST',
      headers,
    });
    withMatchingContractOperation({ test: operation })(request);

    await withSpecValidation(request);

    expect(request.validatedHeaders).toBeInstanceOf(Headers);
    expect(request.validatedHeaders.get('accept')).toBe('application/json');
  });

  test('should handle comma-separated Accept header with matching later value', async () => {
    const operation: ContractOperation<any, any, any, any> = {
      operationId: 'test',
      path: '/test',
      method: 'POST',
      headers: v.object({
        accept: v.picklist(['application/json', 'application/xml']),
      }),
      responses: { 200: { 'application/json': { body: v.object({ message: v.string() }) } } },
    };

    const headers = new Headers();
    // headers.set('accept', 'text/html, application/xml, text/plain');
    headers.append('accept', 'text/html');
    headers.append('accept', 'application/xml');
    headers.append('accept', 'text/plain');
    const request = createMockRequest({
      url: 'http://example.com/test',
      method: 'POST',
      headers,
    });
    withMatchingContractOperation({ test: operation })(request);

    await withSpecValidation(request);

    expect(request.validatedHeaders).toBeInstanceOf(Headers);
    expect(request.validatedHeaders.get('accept')).toBe('application/xml');
  });

  test('should fail validation when no comma-separated Accept values match', async () => {
    const operation: ContractOperation<any, any, any, any> = {
      operationId: 'test',
      path: '/test',
      method: 'POST',
      headers: v.object({
        accept: v.picklist(['application/json', 'application/xml']),
      }),
      responses: { 200: { 'application/json': { body: v.object({ message: v.string() }) } } },
    };

    const headers = new Headers();
    headers.set('accept', 'text/html, text/plain');
    const request = createMockRequest({
      url: 'http://example.com/test',
      method: 'POST',
      headers,
    });
    withMatchingContractOperation({ test: operation })(request);

    await expect(withSpecValidation(request)).rejects.toThrow('Validation failed');
  });
});

describe('withSpecValidation - body', () => {
  test('should parse JSON body when schema provided', async () => {
    const operation: ContractOperation<any, any, any, any> = {
      operationId: 'test',
      path: '/test',
      method: 'POST',
      requests: {
        'application/json': {
          body: v.object({ name: v.string(), email: v.string() }),
        },
      },
      responses: { 200: { 'application/json': { body: v.object({ message: v.string() }) } } },
    };

    const bodyText = JSON.stringify({ name: 'John', email: 'john@example.com' });
    const request = createMockRequest({
      url: 'http://example.com/test',
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      text: async () => bodyText,
    });
    withMatchingContractOperation({ test: operation })(request);

    await withSpecValidation(request);

    expect((request as any).validatedBody).toHaveProperty('name');
    expect((request as any).validatedBody).toHaveProperty('email');
  });

  test('should handle empty body when no schema provided', async () => {
    const operation: ContractOperation = {
      operationId: 'test',
      path: '/test',
      method: 'GET',
      responses: { 200: { 'application/json': { body: v.object({ message: v.string() }) } } },
    };

    const request = createMockRequest({
      url: 'http://example.com/test',
      text: async () => '',
    });
    withMatchingContractOperation({ test: operation })(request);
    await withSpecValidation(request);

    expect((request as any).validatedBody).toEqual({});
  });

  test('should handle already consumed body', async () => {
    const operation: ContractOperation<any, any, any, any> = {
      operationId: 'test',
      path: '/test',
      method: 'POST',
      requests: { 'application/json': {} },
      responses: { 200: { 'application/json': { body: v.object({ message: v.string() }) } } },
    };

    const request = createMockRequest({
      url: 'http://example.com/test',
      method: 'POST',
      text: async () => {
        throw new Error('Body already consumed');
      },
    });
    withMatchingContractOperation({ test: operation })(request);
    await withSpecValidation(request);

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
        200: { 'application/json': { body: v.object({ message: v.string() }) } },
        400: { 'application/json': { body: v.object({ error: v.string() }) } },
      },
    };

    const request = createMockRequest({ url: 'http://example.com/test' });
    withMatchingContractOperation({ test: operation })(request);
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

  test('withContractErrorHandler should handle non-validation errors', async () => {
    const errorHandler = withContractErrorHandler();
    const error = new Error('Something went wrong');

    const response = errorHandler(error, createMockRequest());
    const body = await response.json();

    expect(response).toBeInstanceOf(Response);
    expect(body).toMatchInlineSnapshot(`
      {
        "details": [
          {
            "message": "Something went wrong",
          },
        ],
        "error": "Something went wrong",
      }
    `);
  });
});

describe('400 Validation Error Responses', () => {
  describe('Path Parameter Validation Errors', () => {
    test('should throw validation error for invalid path parameter type', async () => {
      const operation: ContractOperation<any, any, any, any> = {
        operationId: 'getUser',
        path: '/users/:id',
        method: 'GET',
        pathParams: v.object({
          id: v.pipe(v.string(), v.uuid()),
        }),
        responses: { 200: { 'application/json': { body: v.object({ message: v.string() }) } } },
      };

      const request = new Request('http://example.com/users/not-a-uuid') as IRequest;
      withMatchingContractOperation({ getUser: operation })(request);

      await expect(withSpecValidation(request)).rejects.toThrow('Validation failed');
    });

    test('should throw validation error for path parameter failing numeric constraint', async () => {
      const operation: ContractOperation<any, any, any, any> = {
        operationId: 'getPost',
        path: '/posts/:id',
        method: 'GET',
        pathParams: v.object({
          id: v.pipe(
            v.string(),
            v.transform((val) => parseInt(val, 10)),
            v.number(),
            v.minValue(1)
          ),
        }),
        responses: { 200: { 'application/json': { body: v.object({ message: v.string() }) } } },
      };

      const request = new Request('http://example.com/posts/0') as IRequest;
      withMatchingContractOperation({ getPost: operation })(request);

      await expect(withSpecValidation(request)).rejects.toThrow('Validation failed');
    });

    test('should throw validation error for path parameter failing min length constraint', async () => {
      const operation: ContractOperation<any, any, any, any> = {
        operationId: 'getUser',
        path: '/users/:id',
        method: 'GET',
        pathParams: v.object({
          id: v.pipe(v.string(), v.minLength(3)),
        }),
        responses: { 200: { 'application/json': { body: v.object({ message: v.string() }) } } },
      };

      const request = new Request('http://example.com/users/ab') as IRequest;
      withMatchingContractOperation({ getUser: operation })(request);

      await expect(withSpecValidation(request)).rejects.toThrow('Validation failed');
    });
  });

  describe('Query Parameter Validation Errors', () => {
    test('should throw validation error for invalid query parameter type', async () => {
      const operation: ContractOperation<any, any, any, any> = {
        operationId: 'listItems',
        path: '/items',
        method: 'GET',
        query: v.object({
          page: v.pipe(
            v.string(),
            v.transform((val) => parseInt(val, 10)),
            v.number(),
            v.minValue(1)
          ),
        }),
        responses: {
          200: { 'application/json': { body: v.object({ items: v.array(v.string()) }) } },
        },
      };

      const request = createMockRequest({
        url: 'http://example.com/items?page=0',
        query: { page: '0' },
      });
      withMatchingContractOperation({ listItems: operation })(request);

      await expect(withSpecValidation(request)).rejects.toThrow('Validation failed');
    });

    test('should throw validation error for invalid enum value in query', async () => {
      const operation: ContractOperation<any, any, any, any> = {
        operationId: 'search',
        path: '/search',
        method: 'GET',
        query: v.object({
          sort: v.picklist(['asc', 'desc']),
        }),
        responses: {
          200: { 'application/json': { body: v.object({ results: v.array(v.string()) }) } },
        },
      };

      const request = createMockRequest({
        url: 'http://example.com/search?sort=invalid',
        query: { sort: 'invalid' },
      });
      withMatchingContractOperation({ search: operation })(request);

      await expect(withSpecValidation(request)).rejects.toThrow('Validation failed');
    });

    test('should throw validation error for missing required query parameter', async () => {
      const operation: ContractOperation<any, any, any, any> = {
        operationId: 'listItems',
        path: '/items',
        method: 'GET',
        query: v.object({
          page: v.pipe(v.string(), v.minLength(1)),
        }),
        responses: {
          200: { 'application/json': { body: v.object({ items: v.array(v.string()) }) } },
        },
      };

      const request = createMockRequest({
        url: 'http://example.com/items',
        query: {},
      });
      withMatchingContractOperation({ listItems: operation })(request);

      await expect(withSpecValidation(request)).rejects.toThrow('Validation failed');
    });

    test('should throw validation error for query parameter failing string constraint', async () => {
      const operation: ContractOperation<any, any, any, any> = {
        operationId: 'search',
        path: '/search',
        method: 'GET',
        query: v.object({
          q: v.pipe(v.string(), v.minLength(3)),
        }),
        responses: {
          200: { 'application/json': { body: v.object({ results: v.array(v.string()) }) } },
        },
      };

      const request = createMockRequest({
        url: 'http://example.com/search?q=ab',
        query: { q: 'ab' },
      });
      withMatchingContractOperation({ search: operation })(request);

      await expect(withSpecValidation(request)).rejects.toThrow('Validation failed');
    });
  });

  describe('Header Validation Errors', () => {
    test('should throw validation error for missing required header', async () => {
      const operation: ContractOperation<any, any, any, any> = {
        operationId: 'getProtected',
        path: '/protected',
        method: 'GET',
        headers: v.object({
          authorization: v.pipe(v.string(), v.minLength(1)),
        }),
        responses: { 200: { 'application/json': { body: v.object({ message: v.string() }) } } },
      };

      const request = createMockRequest({
        url: 'http://example.com/protected',
        headers: {},
      });
      withMatchingContractOperation({ getProtected: operation })(request);

      await expect(withSpecValidation(request)).rejects.toThrow('Validation failed');
    });

    test('should throw validation error for header failing regex pattern', async () => {
      const operation: ContractOperation<any, any, any, any> = {
        operationId: 'getProtected',
        path: '/protected',
        method: 'GET',
        headers: v.object({
          authorization: v.pipe(v.string(), v.regex(/^Bearer .+$/)),
        }),
        responses: { 200: { 'application/json': { body: v.object({ message: v.string() }) } } },
      };

      const request = createMockRequest({
        url: 'http://example.com/protected',
        headers: { authorization: 'token123' },
      });
      withMatchingContractOperation({ getProtected: operation })(request);

      await expect(withSpecValidation(request)).rejects.toThrow('Validation failed');
    });

    test('should throw validation error for header failing enum constraint', async () => {
      const operation: ContractOperation<any, any, any, any> = {
        operationId: 'getResource',
        path: '/resource',
        method: 'GET',
        headers: v.object({
          accept: v.picklist(['application/json', 'application/xml']),
        }),
        responses: { 200: { 'application/json': { body: v.object({ message: v.string() }) } } },
      };

      const request = createMockRequest({
        url: 'http://example.com/resource',
        headers: { accept: 'text/html' },
      });
      withMatchingContractOperation({ getResource: operation })(request);

      await expect(withSpecValidation(request)).rejects.toThrow('Validation failed');
    });

    test('should throw validation error for header failing string length constraint', async () => {
      const operation: ContractOperation<any, any, any, any> = {
        operationId: 'getResource',
        path: '/resource',
        method: 'GET',
        headers: v.object({
          'x-api-key': v.pipe(v.string(), v.minLength(10)),
        }),
        responses: { 200: { 'application/json': { body: v.object({ message: v.string() }) } } },
      };

      const request = createMockRequest({
        url: 'http://example.com/resource',
        headers: { 'x-api-key': 'short' },
      });
      withMatchingContractOperation({ getResource: operation })(request);

      await expect(withSpecValidation(request)).rejects.toThrow('Validation failed');
    });
  });

  describe('Body Validation Errors', () => {
    test('should throw 400 error for missing Content-Type header when body schema is defined', async () => {
      const operation: ContractOperation<any, any, any, any> = {
        operationId: 'createUser',
        path: '/users',
        method: 'POST',
        requests: {
          'application/json': {
            body: v.object({ name: v.string() }),
          },
        },
        responses: { 201: { 'application/json': { body: v.object({ id: v.string() }) } } },
      };

      const request = createMockRequest({
        url: 'http://example.com/users',
        method: 'POST',
        headers: {},
        text: async () => JSON.stringify({ name: 'John' }),
      });
      withMatchingContractOperation({ createUser: operation })(request);

      await expect(withSpecValidation(request)).rejects.toThrow();
      try {
        await withSpecValidation(request);
      } catch (err: any) {
        expect(err.status).toBe(400);
        // itty-router's error() may include message in different ways, check status is correct
        expect(err.status).toBeDefined();
      }
    });

    test('should throw 400 error for unsupported Content-Type', async () => {
      const operation: ContractOperation<any, any, any, any> = {
        operationId: 'createUser',
        path: '/users',
        method: 'POST',
        requests: {
          'application/json': {
            body: v.object({ name: v.string() }),
          },
        },
        responses: { 201: { 'application/json': { body: v.object({ id: v.string() }) } } },
      };

      const request = createMockRequest({
        url: 'http://example.com/users',
        method: 'POST',
        headers: { 'content-type': 'application/xml' },
        text: async () => '<name>John</name>',
      });
      withMatchingContractOperation({ createUser: operation })(request);

      await expect(withSpecValidation(request)).rejects.toThrow();
      try {
        await withSpecValidation(request);
      } catch (err: any) {
        expect(err.status).toBe(400);
      }
    });

    test('should throw validation error for invalid body schema - missing required field', async () => {
      const operation: ContractOperation<any, any, any, any> = {
        operationId: 'createUser',
        path: '/users',
        method: 'POST',
        requests: {
          'application/json': {
            body: v.object({
              name: v.pipe(v.string(), v.minLength(1)),
              email: v.pipe(v.string(), v.email()),
            }),
          },
        },
        responses: { 201: { 'application/json': { body: v.object({ id: v.string() }) } } },
      };

      const request = createMockRequest({
        url: 'http://example.com/users',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        text: async () => JSON.stringify({ name: 'John' }),
      });
      withMatchingContractOperation({ createUser: operation })(request);

      await expect(withSpecValidation(request)).rejects.toThrow('Validation failed');
    });

    test('should throw validation error for invalid body schema - invalid email format', async () => {
      const operation: ContractOperation<any, any, any, any> = {
        operationId: 'createUser',
        path: '/users',
        method: 'POST',
        requests: {
          'application/json': {
            body: v.object({
              name: v.string(),
              email: v.pipe(v.string(), v.email()),
            }),
          },
        },
        responses: { 201: { 'application/json': { body: v.object({ id: v.string() }) } } },
      };

      const request = createMockRequest({
        url: 'http://example.com/users',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        text: async () => JSON.stringify({ name: 'John', email: 'invalid-email' }),
      });
      withMatchingContractOperation({ createUser: operation })(request);

      await expect(withSpecValidation(request)).rejects.toThrow('Validation failed');
    });

    test('should throw validation error for invalid body schema - string length constraint', async () => {
      const operation: ContractOperation<any, any, any, any> = {
        operationId: 'createUser',
        path: '/users',
        method: 'POST',
        requests: {
          'application/json': {
            body: v.object({
              name: v.pipe(v.string(), v.minLength(3), v.maxLength(50)),
              password: v.pipe(v.string(), v.minLength(8)),
            }),
          },
        },
        responses: { 201: { 'application/json': { body: v.object({ id: v.string() }) } } },
      };

      const request = createMockRequest({
        url: 'http://example.com/users',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        text: async () => JSON.stringify({ name: 'Jo', password: '123' }),
      });
      withMatchingContractOperation({ createUser: operation })(request);

      await expect(withSpecValidation(request)).rejects.toThrow('Validation failed');
    });

    test('should throw validation error for invalid body schema - number range constraint', async () => {
      const operation: ContractOperation<any, any, any, any> = {
        operationId: 'createProduct',
        path: '/products',
        method: 'POST',
        requests: {
          'application/json': {
            body: v.object({
              name: v.string(),
              price: v.pipe(v.number(), v.minValue(0), v.maxValue(10000)),
            }),
          },
        },
        responses: { 201: { 'application/json': { body: v.object({ id: v.string() }) } } },
      };

      const request = createMockRequest({
        url: 'http://example.com/products',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        text: async () => JSON.stringify({ name: 'Product', price: -10 }),
      });
      withMatchingContractOperation({ createProduct: operation })(request);

      await expect(withSpecValidation(request)).rejects.toThrow('Validation failed');
    });

    test('should throw validation error for invalid JSON body format', async () => {
      const operation: ContractOperation<any, any, any, any> = {
        operationId: 'createUser',
        path: '/users',
        method: 'POST',
        requests: {
          'application/json': {
            body: v.object({
              name: v.string(),
            }),
          },
        },
        responses: { 201: { 'application/json': { body: v.object({ id: v.string() }) } } },
      };

      const request = createMockRequest({
        url: 'http://example.com/users',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        text: async () => 'invalid json{',
      });
      withMatchingContractOperation({ createUser: operation })(request);

      // Invalid JSON will be parsed as string, which will fail schema validation
      await expect(withSpecValidation(request)).rejects.toThrow();
    });
  });

  describe('Error Handler Response Format', () => {
    test('should return 400 status code for validation errors', async () => {
      const errorHandler = withContractErrorHandler();
      const validationError = new Error('Validation failed');
      (validationError as any).issues = [
        { path: ['name'], message: 'Required' },
        { path: ['email'], message: 'Invalid email format' },
      ];

      const response = errorHandler(validationError, createMockRequest());

      expect(response.status).toBe(400);
    });

    test('should return JSON response with error and details for validation errors', async () => {
      const errorHandler = withContractErrorHandler();
      const validationError = new Error('Validation failed');
      const issues = [
        { path: ['name'], message: 'Required' },
        { path: ['email'], message: 'Invalid email format' },
      ];
      (validationError as any).issues = issues;

      const response = errorHandler(validationError, createMockRequest());
      const body = await response.json();

      expect(body).toEqual({
        error: 'Validation failed',
        details: issues,
      });
    });

    test('should return correct Content-Type header for validation error response', async () => {
      const errorHandler = withContractErrorHandler();
      const validationError = new Error('Validation failed');
      (validationError as any).issues = [{ path: ['name'], message: 'Required' }];

      const response = errorHandler(validationError, createMockRequest());

      expect(response.headers.get('content-type')).toBe('application/json');
    });

    test('should handle validation errors with empty issues array', async () => {
      const errorHandler = withContractErrorHandler();
      const validationError = new Error('Validation failed');
      (validationError as any).issues = [];

      const response = errorHandler(validationError, createMockRequest());
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Validation failed');
      expect(body.details).toEqual([]);
    });

    test('should handle validation errors with complex nested path structures', async () => {
      const errorHandler = withContractErrorHandler();
      const validationError = new Error('Validation failed');
      (validationError as any).issues = [
        { path: ['user', 'profile', 'email'], message: 'Invalid email' },
        { path: ['items', 0, 'quantity'], message: 'Must be positive' },
      ];

      const response = errorHandler(validationError, createMockRequest());
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.details).toHaveLength(2);
      expect(body.details[0].path).toEqual(['user', 'profile', 'email']);
      expect(body.details[1].path).toEqual(['items', 0, 'quantity']);
    });

    test('should format non-validation errors with error and details array', async () => {
      const errorHandler = withContractErrorHandler();
      const genericError = new Error('Something went wrong');

      const response = errorHandler(genericError, createMockRequest());
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body).toEqual({
        error: 'Something went wrong',
        details: [{ message: 'Something went wrong' }],
      });
    });

    test('should format 400 errors with error and details array', async () => {
      const errorHandler = withContractErrorHandler();
      const errorWithStatus = Object.assign(new Error('Content-Type header is required'), {
        status: 400,
      });

      const response = errorHandler(errorWithStatus, createMockRequest());
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({
        error: 'Content-Type header is required',
        details: [{ message: 'Content-Type header is required' }],
      });
    });

    test('should format non-Error objects with error and details array', async () => {
      const errorHandler = withContractErrorHandler();
      const stringError = 'An error occurred';

      const response = errorHandler(stringError, createMockRequest());
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body).toEqual({
        error: 'Internal server error',
        details: [{ message: 'Internal server error' }],
      });
    });

    test('should ensure all error responses conform to { error: string, details: [...] }', async () => {
      const errorHandler = withContractErrorHandler();

      // Test validation error
      const validationError = new Error('Validation failed');
      (validationError as any).issues = [{ path: ['field'], message: 'Invalid' }];
      const validationResponse = errorHandler(validationError, createMockRequest());
      const validationBody = await validationResponse.json();
      expect(validationBody).toHaveProperty('error');
      expect(validationBody).toHaveProperty('details');
      expect(Array.isArray(validationBody.details)).toBe(true);

      // Test generic error
      const genericError = new Error('Generic error');
      const genericResponse = errorHandler(genericError, createMockRequest());
      const genericBody = await genericResponse.json();
      expect(genericBody).toHaveProperty('error');
      expect(genericBody).toHaveProperty('details');
      expect(Array.isArray(genericBody.details)).toBe(true);
    });
  });

  describe('Multiple Validation Errors', () => {
    test('should throw validation error with multiple issues for path, query, and body', async () => {
      const operation: ContractOperation<any, any, any, any> = {
        operationId: 'updateUser',
        path: '/users/:id',
        method: 'PUT',
        pathParams: v.object({
          id: v.pipe(v.string(), v.uuid()),
        }),
        query: v.object({
          version: v.pipe(
            v.string(),
            v.transform((val) => parseInt(val, 10)),
            v.number(),
            v.minValue(1)
          ),
        }),
        requests: {
          'application/json': {
            body: v.object({
              name: v.pipe(v.string(), v.minLength(3)),
              email: v.pipe(v.string(), v.email()),
            }),
          },
        },
        responses: { 200: { 'application/json': { body: v.object({ id: v.string() }) } } },
      };

      const request = createMockRequest({
        url: 'http://example.com/users/not-uuid?version=0',
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        query: { version: '0' },
        text: async () => JSON.stringify({ name: 'Jo', email: 'invalid' }),
      });
      withMatchingContractOperation({ updateUser: operation })(request);

      // Should throw validation error (may fail on first validation encountered)
      await expect(withSpecValidation(request)).rejects.toThrow();
    });

    test('error handler should include all validation issues in details array', async () => {
      const errorHandler = withContractErrorHandler();
      const validationError = new Error('Validation failed');
      const issues = [
        { path: ['name'], message: 'String must contain at least 3 character(s)' },
        { path: ['email'], message: 'Invalid email' },
        { path: ['age'], message: 'Number must be greater than or equal to 18' },
        { path: ['password'], message: 'String must contain at least 8 character(s)' },
      ];
      (validationError as any).issues = issues;

      const response = errorHandler(validationError, createMockRequest());
      const body = await response.json();

      expect(body.details).toHaveLength(4);
      expect(body.details).toEqual(issues);
    });
  });
});
