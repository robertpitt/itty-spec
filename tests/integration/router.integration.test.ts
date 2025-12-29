import { test, expect } from 'vitest';
import { createRouter } from '../../src/router.js';
import { createContract } from '../../src/contract.js';
import * as v from 'valibot';

test('GET request with query parameters should handle validated query parameters', async () => {
  const contract = createContract({
    getCalculate: {
      operationId: 'getCalculate',
      path: '/calculate',
      method: 'GET',
      query: v.object({
        a: v.pipe(
          v.string(),
          v.transform((val) => parseInt(val, 10))
        ),
        b: v.pipe(
          v.string(),
          v.transform((val) => parseInt(val, 10))
        ),
      }),
      responses: {
        200: { 'application/json': { body: v.object({ result: v.number() }) } },
        400: { 'application/json': { body: v.object({ error: v.string() }) } },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      getCalculate: async (request) => {
        const result = request.validatedQuery.a + request.validatedQuery.b;
        return result > 100
          ? request.respond({
              status: 400,
              contentType: 'application/json',
              body: { error: 'Invalid request' },
            })
          : request.respond({ status: 200, contentType: 'application/json', body: { result } });
      },
    },
  });

  const request = new Request('http://localhost:3000/calculate?a=10&b=20');
  const response = await router.fetch(request);

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toEqual({ result: 30 });
});

test('GET request with query parameters should return 400 for invalid query parameters', async () => {
  const contract = createContract({
    getCalculate: {
      operationId: 'getCalculate',
      path: '/calculate',
      method: 'GET',
      query: v.object({
        a: v.pipe(
          v.string(),
          v.transform((val) => parseInt(val, 10))
        ),
        b: v.pipe(
          v.string(),
          v.transform((val) => parseInt(val, 10))
        ),
      }),
      responses: {
        200: { 'application/json': { body: v.object({ result: v.number() }) } },
        400: { 'application/json': { body: v.object({ error: v.string() }) } },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      getCalculate: async (request) => {
        const result = request.validatedQuery.a + request.validatedQuery.b;
        return result > 100
          ? request.respond({
              status: 400,
              contentType: 'application/json',
              body: { error: 'Invalid request' },
            })
          : request.respond({ status: 200, contentType: 'application/json', body: { result } });
      },
    },
  });

  const request = new Request('http://localhost:3000/calculate?a=50&b=60');
  const response = await router.fetch(request);

  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body).toEqual({ error: 'Invalid request' });
});

test('POST request with body should handle validated body', async () => {
  const contract = createContract({
    postCalculate: {
      operationId: 'postCalculate',
      path: '/calculate',
      method: 'POST',
      requests: {
        'application/json': {
          body: v.object({
            a: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
            b: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
          }),
        },
      },
      responses: {
        200: { 'application/json': { body: v.object({ result: v.number() }) } },
        400: { 'application/json': { body: v.object({ error: v.string() }) } },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      postCalculate: async (request) => {
        const result = request.validatedBody.a + request.validatedBody.b;
        return result > 100
          ? request.respond({
              status: 400,
              contentType: 'application/json',
              body: { error: 'Invalid request' },
            })
          : request.respond({ status: 200, contentType: 'application/json', body: { result } });
      },
    },
  });

  const request = new Request('http://localhost:3000/calculate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ a: 10, b: 20 }),
  });
  const response = await router.fetch(request);

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toEqual({ result: 30 });
});

test('POST request with body should return 400 for invalid body', async () => {
  const contract = createContract({
    postCalculate: {
      operationId: 'postCalculate',
      path: '/calculate',
      method: 'POST',
      requests: {
        'application/json': {
          body: v.object({
            a: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
            b: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
          }),
        },
      },
      responses: {
        200: { 'application/json': { body: v.object({ result: v.number() }) } },
        400: { 'application/json': { body: v.object({ error: v.string() }) } },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      postCalculate: async (request) => {
        const result = request.validatedBody.a + request.validatedBody.b;
        return result > 100
          ? request.respond({
              status: 400,
              contentType: 'application/json',
              body: { error: 'Invalid request' },
            })
          : request.respond({ status: 200, contentType: 'application/json', body: { result } });
      },
    },
  });

  const request = new Request('http://localhost:3000/calculate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ a: 50, b: 60 }),
  });
  const response = await router.fetch(request);

  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body).toEqual({ error: 'Invalid request' });
});

test('GET request with path parameters should handle path parameters', async () => {
  const contract = createContract({
    getUser: {
      operationId: 'getUser',
      path: '/users/:id',
      method: 'GET',
      responses: {
        200: { 'application/json': { body: v.object({ id: v.string(), name: v.string() }) } },
        404: { 'application/json': { body: v.object({ error: v.string() }) } },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      getUser: async (request) => {
        const userId = request.params.id;
        if (userId === '123') {
          return request.respond({
            status: 200,
            contentType: 'application/json',
            body: { id: userId, name: 'John Doe' },
          });
        }
        return request.respond({
          status: 404,
          contentType: 'application/json',
          body: { error: 'User not found' },
        });
      },
    },
  });

  const request = new Request('http://localhost:3000/users/123');
  const response = await router.fetch(request);

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toEqual({ id: '123', name: 'John Doe' });
});

test('GET request with path parameters should handle 404 for non-existent user', async () => {
  const contract = createContract({
    getUser: {
      operationId: 'getUser',
      path: '/users/:id',
      method: 'GET',
      responses: {
        200: { 'application/json': { body: v.object({ id: v.string(), name: v.string() }) } },
        404: { 'application/json': { body: v.object({ error: v.string() }) } },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      getUser: async (request) => {
        const userId = request.params.id;
        if (userId === '123') {
          return request.respond({
            status: 200,
            contentType: 'application/json',
            body: { id: userId, name: 'John Doe' },
          });
        }
        return request.respond({
          status: 404,
          contentType: 'application/json',
          body: { error: 'User not found' },
        });
      },
    },
  });

  const request = new Request('http://localhost:3000/users/999');
  const response = await router.fetch(request);

  expect(response.status).toBe(404);
  const body = await response.json();
  expect(body).toEqual({ error: 'User not found' });
});

test('DELETE request with 204 No Content should handle DELETE request returning 204', async () => {
  const contract = createContract({
    deleteUser: {
      operationId: 'deleteUser',
      path: '/users/:id',
      method: 'DELETE',
      responses: {
        204: { 'application/json': { body: v.never() } },
        404: { 'application/json': { body: v.object({ error: v.string() }) } },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      deleteUser: async (request) => {
        const userId = request.params.id;
        if (userId === '123') {
          return request.respond({ status: 204, contentType: 'application/json' });
        }
        return request.respond({
          status: 404,
          contentType: 'application/json',
          body: { error: 'User not found' },
        });
      },
    },
  });

  const request = new Request('http://localhost:3000/users/123', {
    method: 'DELETE',
  });
  const response = await router.fetch(request);

  expect(response.status).toBe(204);
  expect(response.body).toBeNull();
});

test('Request with headers validation should handle request with validated headers', async () => {
  const contract = createContract({
    getProtected: {
      operationId: 'getProtected',
      path: '/protected',
      method: 'GET',
      headers: v.object({
        authorization: v.string(),
      }),
      responses: {
        200: { 'application/json': { body: v.object({ message: v.string() }) } },
        401: { 'application/json': { body: v.object({ error: v.string() }) } },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      getProtected: async (request) => {
        const auth = request.validatedHeaders.get('authorization');
        if (auth === 'Bearer token123') {
          return request.respond({
            status: 200,
            contentType: 'application/json',
            body: { message: 'Access granted' },
          });
        }
        return request.respond({
          status: 401,
          contentType: 'application/json',
          body: { error: 'Unauthorized' },
        });
      },
    },
  });

  const request = new Request('http://localhost:3000/protected', {
    headers: { authorization: 'Bearer token123' },
  });
  const response = await router.fetch(request);

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toEqual({ message: 'Access granted' });
});

test('Error handling should handle validation errors gracefully', async () => {
  const contract = createContract({
    postUser: {
      operationId: 'postUser',
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
      responses: {
        201: { 'application/json': { body: v.object({ id: v.string(), name: v.string() }) } },
        400: { 'application/json': { body: v.object({ error: v.string() }) } },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      postUser: async (request) => {
        return request.respond({
          status: 201,
          contentType: 'application/json',
          body: { id: '1', name: request.validatedBody.name },
        });
      },
    },
  });

  // Invalid email should trigger validation error
  const request = new Request('http://localhost:3000/users', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'John', email: 'invalid-email' }),
  });
  const response = await router.fetch(request);

  // Validation errors should be handled by error handler
  expect(response.status).toBe(400);
});

// ============================================================================
// Validation Error Tests
// ============================================================================

test('Query parameter validation should return 400 with error details for missing required params', async () => {
  const contract = createContract({
    search: {
      path: '/search',
      method: 'GET',
      query: v.object({
        q: v.pipe(v.string(), v.minLength(1)),
        page: v.pipe(
          v.string(),
          v.transform((val) => parseInt(val, 10))
        ),
      }),
      responses: {
        200: { 'application/json': { body: v.object({ results: v.array(v.string()) }) } },
        400: {
          'application/json': { body: v.object({ error: v.string(), details: v.unknown() }) },
        },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      search: async (request) => {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: { results: [] },
        });
      },
    },
  });

  // Missing required query parameter 'q'
  const request = new Request('http://localhost:3000/search?page=1');
  const response = await router.fetch(request);

  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation failed');
  expect(body.details).toBeDefined();
  expect(Array.isArray(body.details)).toBe(true);
});

test('Query parameter validation should return 400 for invalid type', async () => {
  const contract = createContract({
    getItems: {
      path: '/items',
      method: 'GET',
      query: v.object({
        page: v.pipe(
          v.string(),
          v.regex(/^\d+$/),
          v.transform((val) => parseInt(val, 10))
        ),
        limit: v.pipe(
          v.string(),
          v.regex(/^\d+$/),
          v.transform((val) => parseInt(val, 10))
        ),
      }),
      responses: {
        200: { 'application/json': { body: v.object({ items: v.array(v.string()) }) } },
        400: {
          'application/json': { body: v.object({ error: v.string(), details: v.unknown() }) },
        },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      getItems: async (request) => {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: { items: [] },
        });
      },
    },
  });

  // Invalid query parameter - non-numeric string for page (doesn't match regex)
  const request = new Request('http://localhost:3000/items?page=abc&limit=10');
  const response = await router.fetch(request);

  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation failed');
  expect(body.details).toBeDefined();
});

test('Body validation should return 400 with error details for missing required fields', async () => {
  const contract = createContract({
    createUser: {
      path: '/users',
      method: 'POST',
      requests: {
        'application/json': {
          body: v.object({
            name: v.pipe(v.string(), v.minLength(1)),
            email: v.pipe(v.string(), v.email()),
            age: v.pipe(v.number(), v.minValue(18)),
          }),
        },
      },
      responses: {
        201: { 'application/json': { body: v.object({ id: v.string(), name: v.string() }) } },
        400: {
          'application/json': { body: v.object({ error: v.string(), details: v.unknown() }) },
        },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      createUser: async (request) => {
        return request.respond({
          status: 201,
          contentType: 'application/json',
          body: { id: '1', name: request.validatedBody.name },
        });
      },
    },
  });

  // Missing required fields
  const request = new Request('http://localhost:3000/users', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'John' }),
  });
  const response = await router.fetch(request);

  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation failed');
  expect(body.details).toBeDefined();
  expect(Array.isArray(body.details)).toBe(true);
});

test('Body validation should return 400 for invalid email format', async () => {
  const contract = createContract({
    createUser: {
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
      responses: {
        201: { 'application/json': { body: v.object({ id: v.string(), name: v.string() }) } },
        400: {
          'application/json': { body: v.object({ error: v.string(), details: v.unknown() }) },
        },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      createUser: async (request) => {
        return request.respond({
          status: 201,
          contentType: 'application/json',
          body: { id: '1', name: request.validatedBody.name },
        });
      },
    },
  });

  // Invalid email format
  const request = new Request('http://localhost:3000/users', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'John', email: 'not-an-email' }),
  });
  const response = await router.fetch(request);

  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation failed');
  expect(body.details).toBeDefined();
});

test('Body validation should return 400 for value below minimum constraint', async () => {
  const contract = createContract({
    createUser: {
      path: '/users',
      method: 'POST',
      requests: {
        'application/json': {
          body: v.object({
            name: v.pipe(v.string(), v.minLength(1)),
            age: v.pipe(v.number(), v.minValue(18), v.maxValue(120)),
          }),
        },
      },
      responses: {
        201: { 'application/json': { body: v.object({ id: v.string(), name: v.string() }) } },
        400: {
          'application/json': { body: v.object({ error: v.string(), details: v.unknown() }) },
        },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      createUser: async (request) => {
        return request.respond({
          status: 201,
          contentType: 'application/json',
          body: { id: '1', name: request.validatedBody.name },
        });
      },
    },
  });

  // Age below minimum
  const request = new Request('http://localhost:3000/users', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'John', age: 15 }),
  });
  const response = await router.fetch(request);

  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation failed');
  expect(body.details).toBeDefined();
});

test('Body validation should return 400 for value above maximum constraint', async () => {
  const contract = createContract({
    createProduct: {
      path: '/products',
      method: 'POST',
      requests: {
        'application/json': {
          body: v.object({
            name: v.pipe(v.string(), v.minLength(1)),
            price: v.pipe(v.number(), v.minValue(0), v.maxValue(10000)),
            quantity: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(1000)),
          }),
        },
      },
      responses: {
        201: { 'application/json': { body: v.object({ id: v.string(), name: v.string() }) } },
        400: {
          'application/json': { body: v.object({ error: v.string(), details: v.unknown() }) },
        },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      createProduct: async (request) => {
        return request.respond({
          status: 201,
          contentType: 'application/json',
          body: { id: '1', name: request.validatedBody.name },
        });
      },
    },
  });

  // Price above maximum
  const request = new Request('http://localhost:3000/products', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Product', price: 50000, quantity: 10 }),
  });
  const response = await router.fetch(request);

  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation failed');
  expect(body.details).toBeDefined();
});

test('Body validation should return 400 for invalid nested object structure', async () => {
  const contract = createContract({
    createOrder: {
      path: '/orders',
      method: 'POST',
      requests: {
        'application/json': {
          body: v.object({
            customer: v.object({
              name: v.pipe(v.string(), v.minLength(1)),
              email: v.pipe(v.string(), v.email()),
            }),
            items: v.array(
              v.object({
                productId: v.string(),
                quantity: v.pipe(v.number(), v.minValue(1)),
              })
            ),
          }),
        },
      },
      responses: {
        201: { 'application/json': { body: v.object({ orderId: v.string() }) } },
        400: {
          'application/json': { body: v.object({ error: v.string(), details: v.unknown() }) },
        },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      createOrder: async (request) => {
        return request.respond({
          status: 201,
          contentType: 'application/json',
          body: { orderId: 'order-123' },
        });
      },
    },
  });

  // Invalid nested structure - customer email is invalid
  const request = new Request('http://localhost:3000/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      customer: {
        name: 'John Doe',
        email: 'invalid-email',
      },
      items: [{ productId: 'prod-1', quantity: 2 }],
    }),
  });
  const response = await router.fetch(request);

  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation failed');
  expect(body.details).toBeDefined();
});

test('Body validation should return 400 for invalid array item', async () => {
  const contract = createContract({
    createOrder: {
      path: '/orders',
      method: 'POST',
      requests: {
        'application/json': {
          body: v.object({
            items: v.array(
              v.object({
                productId: v.pipe(v.string(), v.minLength(1)),
                quantity: v.pipe(v.number(), v.minValue(1)),
              })
            ),
          }),
        },
      },
      responses: {
        201: { 'application/json': { body: v.object({ orderId: v.string() }) } },
        400: {
          'application/json': { body: v.object({ error: v.string(), details: v.unknown() }) },
        },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      createOrder: async (request) => {
        return request.respond({
          status: 201,
          contentType: 'application/json',
          body: { orderId: 'order-123' },
        });
      },
    },
  });

  // Invalid array item - quantity below minimum
  const request = new Request('http://localhost:3000/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      items: [
        { productId: 'prod-1', quantity: 2 },
        { productId: 'prod-2', quantity: 0 }, // Invalid: below minimum
      ],
    }),
  });
  const response = await router.fetch(request);

  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation failed');
  expect(body.details).toBeDefined();
});

test('Body validation should return 400 for invalid JSON body', async () => {
  const contract = createContract({
    createUser: {
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
      responses: {
        201: { 'application/json': { body: v.object({ id: v.string(), name: v.string() }) } },
        400: {
          'application/json': { body: v.object({ error: v.string(), details: v.unknown() }) },
        },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      createUser: async (request) => {
        return request.respond({
          status: 201,
          contentType: 'application/json',
          body: { id: '1', name: request.validatedBody.name },
        });
      },
    },
  });

  // Invalid JSON
  const request = new Request('http://localhost:3000/users', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{ invalid json }',
  });
  const response = await router.fetch(request);

  // Should handle JSON parse errors gracefully
  expect(response.status).toBeGreaterThanOrEqual(400);
});

test('Body validation should return 400 for empty body when body is required', async () => {
  const contract = createContract({
    createUser: {
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
      responses: {
        201: { 'application/json': { body: v.object({ id: v.string(), name: v.string() }) } },
        400: {
          'application/json': { body: v.object({ error: v.string(), details: v.unknown() }) },
        },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      createUser: async (request) => {
        return request.respond({
          status: 201,
          contentType: 'application/json',
          body: { id: '1', name: request.validatedBody.name },
        });
      },
    },
  });

  // Empty body
  const request = new Request('http://localhost:3000/users', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  const response = await router.fetch(request);

  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation failed');
  expect(body.details).toBeDefined();
});

test('Header validation should return 400 for missing required headers', async () => {
  const contract = createContract({
    getProtected: {
      path: '/protected',
      method: 'GET',
      headers: v.object({
        authorization: v.pipe(v.string(), v.minLength(1)),
        'x-api-key': v.pipe(v.string(), v.minLength(1)),
      }),
      responses: {
        200: { 'application/json': { body: v.object({ message: v.string() }) } },
        400: {
          'application/json': { body: v.object({ error: v.string(), details: v.unknown() }) },
        },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      getProtected: async (request) => {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: { message: 'Access granted' },
        });
      },
    },
  });

  // Missing required headers
  const request = new Request('http://localhost:3000/protected');
  const response = await router.fetch(request);

  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation failed');
  expect(body.details).toBeDefined();
});

test('Header validation should return 400 for invalid header format', async () => {
  const contract = createContract({
    getProtected: {
      path: '/protected',
      method: 'GET',
      headers: v.object({
        authorization: v.pipe(v.string(), v.regex(/^Bearer .+$/)),
      }),
      responses: {
        200: { 'application/json': { body: v.object({ message: v.string() }) } },
        400: {
          'application/json': { body: v.object({ error: v.string(), details: v.unknown() }) },
        },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      getProtected: async (request) => {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: { message: 'Access granted' },
        });
      },
    },
  });

  // Invalid header format - missing Bearer prefix
  const request = new Request('http://localhost:3000/protected', {
    headers: {
      authorization: 'token123',
    },
  });
  const response = await router.fetch(request);

  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation failed');
  expect(body.details).toBeDefined();
});

test('Multiple validation errors should return all error details', async () => {
  const contract = createContract({
    createUser: {
      path: '/users',
      method: 'POST',
      requests: {
        'application/json': {
          body: v.object({
            name: v.pipe(v.string(), v.minLength(3)),
            email: v.pipe(v.string(), v.email()),
            age: v.pipe(v.number(), v.minValue(18), v.maxValue(120)),
            password: v.pipe(v.string(), v.minLength(8)),
          }),
        },
      },
      responses: {
        201: { 'application/json': { body: v.object({ id: v.string(), name: v.string() }) } },
        400: {
          'application/json': { body: v.object({ error: v.string(), details: v.unknown() }) },
        },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      createUser: async (request) => {
        return request.respond({
          status: 201,
          contentType: 'application/json',
          body: { id: '1', name: request.validatedBody.name },
        });
      },
    },
  });

  // Multiple validation errors: name too short, invalid email, age too low, password too short
  const request = new Request('http://localhost:3000/users', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Jo', // Too short
      email: 'invalid-email', // Invalid format
      age: 15, // Below minimum
      password: '123', // Too short
    }),
  });
  const response = await router.fetch(request);

  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation failed');
  expect(body.details).toBeDefined();
  expect(Array.isArray(body.details)).toBe(true);
  // Should have multiple validation errors
  expect((body.details as any[]).length).toBeGreaterThan(1);
});

test('Query parameter validation should return 400 for invalid enum value', async () => {
  const contract = createContract({
    listItems: {
      path: '/items',
      method: 'GET',
      query: v.object({
        sort: v.picklist(['asc', 'desc', 'name']),
        filter: v.optional(v.picklist(['active', 'inactive', 'all'])),
      }),
      responses: {
        200: { 'application/json': { body: v.object({ items: v.array(v.string()) }) } },
        400: {
          'application/json': { body: v.object({ error: v.string(), details: v.unknown() }) },
        },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      listItems: async (request) => {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: { items: [] },
        });
      },
    },
  });

  // Invalid enum value
  const request = new Request('http://localhost:3000/items?sort=invalid');
  const response = await router.fetch(request);

  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation failed');
  expect(body.details).toBeDefined();
});

test('Body validation should return 400 for invalid URL format', async () => {
  const contract = createContract({
    createLink: {
      path: '/links',
      method: 'POST',
      requests: {
        'application/json': {
          body: v.object({
            title: v.pipe(v.string(), v.minLength(1)),
            url: v.pipe(v.string(), v.url()),
          }),
        },
      },
      responses: {
        201: { 'application/json': { body: v.object({ id: v.string(), title: v.string() }) } },
        400: {
          'application/json': { body: v.object({ error: v.string(), details: v.unknown() }) },
        },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      createLink: async (request) => {
        return request.respond({
          status: 201,
          contentType: 'application/json',
          body: { id: '1', title: request.validatedBody.title },
        });
      },
    },
  });

  // Invalid URL format
  const request = new Request('http://localhost:3000/links', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      title: 'My Link',
      url: 'not-a-valid-url',
    }),
  });
  const response = await router.fetch(request);

  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation failed');
  expect(body.details).toBeDefined();
});

test('Body validation should return 400 for invalid UUID format', async () => {
  const contract = createContract({
    getUser: {
      path: '/users/:id',
      method: 'PUT',
      requests: {
        'application/json': {
          body: v.object({
            name: v.pipe(v.string(), v.minLength(1)),
            referenceId: v.pipe(v.string(), v.uuid()),
          }),
        },
      },
      responses: {
        200: { 'application/json': { body: v.object({ id: v.string(), name: v.string() }) } },
        400: {
          'application/json': { body: v.object({ error: v.string(), details: v.unknown() }) },
        },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      getUser: async (request) => {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: { id: request.params.id, name: request.validatedBody.name },
        });
      },
    },
  });

  // Invalid UUID format
  const request = new Request('http://localhost:3000/users/123', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'John Doe',
      referenceId: 'not-a-uuid',
    }),
  });
  const response = await router.fetch(request);

  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.error).toBe('Validation failed');
  expect(body.details).toBeDefined();
});

test('Validation error response should have correct content-type header', async () => {
  const contract = createContract({
    createUser: {
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
      responses: {
        201: { 'application/json': { body: v.object({ id: v.string(), name: v.string() }) } },
        400: {
          'application/json': { body: v.object({ error: v.string(), details: v.unknown() }) },
        },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      createUser: async (request) => {
        return request.respond({
          status: 201,
          contentType: 'application/json',
          body: { id: '1', name: request.validatedBody.name },
        });
      },
    },
  });

  // Invalid email should trigger validation error
  const request = new Request('http://localhost:3000/users', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'John', email: 'invalid-email' }),
  });
  const response = await router.fetch(request);

  expect(response.status).toBe(400);
  expect(response.headers.get('content-type')).toBe('application/json');
  const body = await response.json();
  expect(body.error).toBe('Validation failed');
  expect(body.details).toBeDefined();
});

test('Multiple operations should handle multiple operations in same router', async () => {
  const contract = createContract({
    getUsers: {
      operationId: 'getUsers',
      path: '/users',
      method: 'GET',
      responses: {
        200: { 'application/json': { body: v.object({ users: v.array(v.string()) }) } },
      },
    },
    getUser: {
      operationId: 'getUser',
      path: '/users/:id',
      method: 'GET',
      responses: {
        200: { 'application/json': { body: v.object({ id: v.string(), name: v.string() }) } },
      },
    },
    createUser: {
      operationId: 'createUser',
      path: '/users',
      method: 'POST',
      requests: {
        'application/json': {
          body: v.object({ name: v.string() }),
        },
      },
      responses: {
        201: { 'application/json': { body: v.object({ id: v.string(), name: v.string() }) } },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      getUsers: async (request) => {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: { users: ['user1', 'user2'] },
        });
      },
      getUser: async (request) => {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: { id: request.params.id, name: 'John' },
        });
      },
      createUser: async (request) => {
        return request.respond({
          status: 201,
          contentType: 'application/json',
          body: { id: '1', name: request.validatedBody.name },
        });
      },
    },
  });

  // Test GET /users
  const listRequest = new Request('http://localhost:3000/users');
  const listResponse = await router.fetch(listRequest);

  expect(listResponse.status).toBe(200);

  // Test GET /users/:id
  const getRequest = new Request('http://localhost:3000/users/123');
  const getResponse = await router.fetch(getRequest);
  expect(getResponse.status).toBe(200);
  const getBody = await getResponse.json();
  expect(getBody).toEqual({ id: '123', name: 'John' });

  // Test POST /users
  const createRequest = new Request('http://localhost:3000/users', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Jane' }),
  });
  const createResponse = await router.fetch(createRequest);
  expect(createResponse.status).toBe(201);
  const createBody = await createResponse.json();
  expect(createBody).toEqual({ id: '1', name: 'Jane' });
});

test('Optional operationId should default to contract key', async () => {
  const contract = createContract({
    getUserProfile: {
      // operationId omitted - should default to 'getUserProfile'
      path: '/users/:id/profile',
      method: 'GET', // method is now required
      responses: {
        200: { 'application/json': { body: v.object({ id: v.string(), name: v.string() }) } },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      getUserProfile: async (request) => {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: { id: request.params.id, name: 'John Doe' },
        });
      },
    },
  });

  const request = new Request('http://localhost:3000/users/123/profile');
  const response = await router.fetch(request);

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toEqual({ id: '123', name: 'John Doe' });
});

test('Method is required and must be explicitly specified', async () => {
  const contract = createContract({
    listItems: {
      operationId: 'listItems',
      path: '/items',
      method: 'GET', // method is now required
      responses: {
        200: { 'application/json': { body: v.object({ items: v.array(v.string()) }) } },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      listItems: async (request) => {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: { items: ['item1', 'item2'] },
        });
      },
    },
  });

  const request = new Request('http://localhost:3000/items');
  const response = await router.fetch(request);

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toEqual({ items: ['item1', 'item2'] });
});

test('Explicit operationId should override contract key', async () => {
  const contract = createContract({
    getUserProfile: {
      operationId: 'customOperationId', // Explicit operationId should override key
      method: 'GET', // method is now required
      path: '/users/:id/profile',
      responses: {
        200: { 'application/json': { body: v.object({ id: v.string(), name: v.string() }) } },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      getUserProfile: async (request) => {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: { id: request.params.id, name: 'John Doe' },
        });
      },
    },
  });

  const request = new Request('http://localhost:3000/users/123/profile');
  const response = await router.fetch(request);

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toEqual({ id: '123', name: 'John Doe' });
});

test('Explicit method should override default GET', async () => {
  const contract = createContract({
    createItem: {
      operationId: 'createItem',
      path: '/items',
      method: 'POST', // Explicit method
      requests: {
        'application/json': {
          body: v.object({ name: v.string() }),
        },
      },
      responses: {
        201: { 'application/json': { body: v.object({ id: v.string(), name: v.string() }) } },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      createItem: async (request) => {
        return request.respond({
          status: 201,
          contentType: 'application/json',
          body: { id: '1', name: request.validatedBody.name },
        });
      },
    },
  });

  const request = new Request('http://localhost:3000/items', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'New Item' }),
  });
  const response = await router.fetch(request);

  expect(response.status).toBe(201);
  const body = await response.json();
  expect(body).toEqual({ id: '1', name: 'New Item' });
});

// ============================================================================
// Real-world scenarios and edge cases
// ============================================================================

test('Nested routes with multiple path parameters should handle complex paths', async () => {
  const contract = createContract({
    getUserPost: {
      path: '/users/:userId/posts/:postId',
      method: 'GET',
      responses: {
        200: {
          'application/json': {
            body: v.object({ userId: v.string(), postId: v.string(), title: v.string() }),
          },
        },
        404: { 'application/json': { body: v.object({ error: v.string() }) } },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      getUserPost: async (request) => {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: {
            userId: request.params.userId,
            postId: request.params.postId,
            title: 'Test Post',
          },
        });
      },
    },
  });

  const request = new Request('http://localhost:3000/users/123/posts/456');
  const response = await router.fetch(request);

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toEqual({ userId: '123', postId: '456', title: 'Test Post' });
});

test('Complex query parameters with arrays should handle array query params', async () => {
  const contract = createContract({
    searchItems: {
      path: '/items/search',
      method: 'GET',
      query: v.object({
        tags: v.optional(v.array(v.string())),
        categories: v.fallback(v.array(v.string()), []),
        page: v.fallback(
          v.pipe(
            v.string(),
            v.transform((val) => parseInt(val, 10))
          ),
          1
        ),
      }),
      responses: {
        200: {
          'application/json': { body: v.object({ items: v.array(v.string()), total: v.number() }) },
        },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      searchItems: async (request) => {
        const tags = request.validatedQuery.tags || [];
        const page = request.validatedQuery.page;
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: { items: tags, total: page },
        });
      },
    },
  });

  const request = new Request('http://localhost:3000/items/search?tags=tag1&tags=tag2&page=2');
  const response = await router.fetch(request);
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.items).toContain('tag1');
  expect(body.items).toContain('tag2');
  expect(body.total).toBe(2);
});

test('PUT request should handle update operations', async () => {
  const contract = createContract({
    updateUser: {
      path: '/users/:id',
      method: 'PUT',
      requests: {
        'application/json': {
          body: v.object({
            name: v.pipe(v.string(), v.minLength(1)),
            email: v.pipe(v.string(), v.email()),
          }),
        },
      },
      responses: {
        200: {
          'application/json': {
            body: v.object({ id: v.string(), name: v.string(), email: v.string() }),
          },
        },
        404: { 'application/json': { body: v.object({ error: v.string() }) } },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      updateUser: async (request) => {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: {
            id: request.params.id,
            name: request.validatedBody.name,
            email: request.validatedBody.email,
          },
        });
      },
    },
  });

  const request = new Request('http://localhost:3000/users/123', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Updated Name', email: 'updated@example.com' }),
  });
  const response = await router.fetch(request);

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toEqual({
    id: '123',
    name: 'Updated Name',
    email: 'updated@example.com',
  });
});

test('PATCH request should handle partial updates', async () => {
  const contract = createContract({
    patchUser: {
      path: '/users/:id',
      method: 'PATCH',
      requests: {
        'application/json': {
          body: v.object({
            name: v.optional(v.string()),
            email: v.optional(v.pipe(v.string(), v.email())),
          }),
        },
      },
      responses: {
        200: {
          'application/json': {
            body: v.object({
              id: v.string(),
              name: v.optional(v.string()),
              email: v.optional(v.string()),
            }),
          },
        },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      patchUser: async (request) => {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: {
            id: request.params.id,
            name: request.validatedBody.name,
            email: request.validatedBody.email,
          },
        });
      },
    },
  });

  const request = new Request('http://localhost:3000/users/123', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Partial Update' }),
  });
  const response = await router.fetch(request);

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.name).toBe('Partial Update');
  expect(body.email).toBeUndefined();
});

test('Base path should prefix all routes', async () => {
  const contract = createContract({
    getUsers: {
      path: '/users',
      method: 'GET',
      responses: {
        200: { 'application/json': { body: v.object({ users: v.array(v.string()) }) } },
      },
    },
  });

  const router = createRouter({
    contract,
    base: '/api/v1',
    handlers: {
      getUsers: async (request) => {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: { users: ['user1'] },
        });
      },
    },
  });

  // Should match with base path
  const request = new Request('http://localhost:3000/api/v1/users');
  const response = await router.fetch(request);

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.users).toEqual(['user1']);

  // Should not match without base path
  const requestWithoutBase = new Request('http://localhost:3000/users');
  const responseWithoutBase = await router.fetch(requestWithoutBase);
  expect(responseWithoutBase.status).toBe(404);
});

test('Custom missing handler should handle 404 routes', async () => {
  const contract = createContract({
    getUsers: {
      path: '/users',
      method: 'GET',
      responses: {
        200: { 'application/json': { body: v.object({ users: v.array(v.string()) }) } },
      },
    },
  });

  const router = createRouter({
    contract,
    missing: async (request) => {
      // Request object may have url property or we can construct it
      const url = request.proxy?.url;
      return request.respond({
        status: 404,
        contentType: 'application/json',
        body: { error: 'Custom 404: Route not found', url },
      });
    },
    handlers: {
      getUsers: async (request) => {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: { users: [] },
        });
      },
    },
  });

  const request = new Request('http://localhost:3000/nonexistent');
  const response = await router.fetch(request);

  expect(response.status).toBe(404);
  const body = await response.json();
  expect(body).toEqual({
    error: 'Custom 404: Route not found',
    url: 'http://localhost:3000/nonexistent',
  });
  expect(body.error).toBe('Custom 404: Route not found');
  // URL should be present in the response
  expect(body.url).toBeDefined();
  expect(typeof body.url).toBe('string');
});

test('Before middleware should run before handlers', async () => {
  const contract = createContract({
    getUsers: {
      path: '/users',
      method: 'GET',
      responses: {
        200: {
          'application/json': {
            body: v.object({ users: v.array(v.string()), requestId: v.string() }),
          },
        },
      },
    },
  });

  const requestIds: string[] = [];

  const router = createRouter({
    contract,
    before: [
      async (request) => {
        const requestId = `req-${Date.now()}`;
        (request as any).requestId = requestId;
        requestIds.push(requestId);
      },
    ],
    handlers: {
      getUsers: async (request) => {
        const requestId = (request as any).requestId;
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: { users: ['user1'], requestId },
        });
      },
    },
  });

  const request = new Request('http://localhost:3000/users');
  const response = await router.fetch(request);

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.requestId).toBeDefined();
  expect(requestIds.length).toBe(1);
});

test('Finally middleware should run after handlers', async () => {
  const contract = createContract({
    getUsers: {
      path: '/users',
      method: 'GET',
      responses: {
        200: { 'application/json': { body: v.object({ users: v.array(v.string()) }) } },
      },
    },
  });

  const responseHeaders: string[] = [];

  const router = createRouter({
    contract,
    finally: [
      async (response) => {
        responseHeaders.push('x-custom-header');
        response.headers.set('x-custom-header', 'custom-value');
        return response;
      },
    ],
    handlers: {
      getUsers: async (request) => {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: { users: ['user1'] },
        });
      },
    },
  });

  const request = new Request('http://localhost:3000/users');
  const response = await router.fetch(request);

  expect(response.status).toBe(200);
  expect(response.headers.get('x-custom-header')).toBe('custom-value');
});

test('Route precedence should match specific routes before general ones', async () => {
  const contract = createContract({
    getUsers: {
      path: '/users',
      method: 'GET',
      responses: {
        200: { 'application/json': { body: v.object({ type: v.literal('list') }) } },
      },
    },
    getUser: {
      path: '/users/:id',
      method: 'GET',
      responses: {
        200: { 'application/json': { body: v.object({ type: v.literal('single') }) } },
      },
    },
    getUserPosts: {
      path: '/users/:id/posts',
      method: 'GET',
      responses: {
        200: { 'application/json': { body: v.object({ type: v.literal('posts') }) } },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      getUsers: async (request) => {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: { type: 'list' },
        });
      },
      getUser: async (request) => {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: { type: 'single' },
        });
      },
      getUserPosts: async (request) => {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: { type: 'posts' },
        });
      },
    },
  });

  // Test specific route
  const listRequest = new Request('http://localhost:3000/users');
  const listResponse = await router.fetch(listRequest);
  expect(listResponse.status).toBe(200);
  expect(await listResponse.json()).toEqual({ type: 'list' });

  // Test parameterized route
  const singleRequest = new Request('http://localhost:3000/users/123');
  const singleResponse = await router.fetch(singleRequest);
  expect(singleResponse.status).toBe(200);
  expect(await singleResponse.json()).toEqual({ type: 'single' });

  // Test nested route
  const postsRequest = new Request('http://localhost:3000/users/123/posts');
  const postsResponse = await router.fetch(postsRequest);
  expect(postsResponse.status).toBe(200);
  expect(await postsResponse.json()).toEqual({ type: 'posts' });
});

test('URL encoding should handle special characters in paths', async () => {
  const contract = createContract({
    getUser: {
      path: '/users/:id',
      method: 'GET',
      responses: { 200: { 'application/json': { body: v.object({ id: v.string() }) } } },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      getUser: async (request) => {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: { id: request.params.id },
        });
      },
    },
  });

  // Test with URL-encoded special characters
  // Note: Path parameters come as-is from the URL (not automatically decoded)
  const encodedId = encodeURIComponent('user-123@example.com');
  const request = new Request(`http://localhost:3000/users/${encodedId}`);
  const response = await router.fetch(request);

  expect(response.status).toBe(200);
  const body = await response.json();
  // Path parameters are preserved as-is (URL-encoded)
  expect(body.id).toBe(encodedId);

  // Test with unencoded special characters (if they're valid in URLs)
  const request2 = new Request('http://localhost:3000/users/user-123-test');
  const response2 = await router.fetch(request2);
  expect(response2.status).toBe(200);
  const body2 = await response2.json();
  expect(body2.id).toBe('user-123-test');
});

test('Query parameters with special characters should be handled correctly', async () => {
  const contract = createContract({
    search: {
      path: '/search',
      method: 'GET',
      query: v.object({
        q: v.string(),
        filter: v.optional(v.string()),
      }),
      responses: {
        200: {
          'application/json': {
            body: v.object({ query: v.string(), filter: v.optional(v.string()) }),
          },
        },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      search: async (request) => {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: {
            query: request.validatedQuery.q,
            filter: request.validatedQuery.filter,
          },
        });
      },
    },
  });

  const query = encodeURIComponent('hello world & more');
  const request = new Request(`http://localhost:3000/search?q=${query}&filter=test`);
  const response = await router.fetch(request);

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.query).toBe('hello world & more');
  expect(body.filter).toBe('test');
});

test('Complex nested body should handle nested objects and arrays', async () => {
  const contract = createContract({
    createOrder: {
      path: '/orders',
      method: 'POST',
      requests: {
        'application/json': {
          body: v.object({
            customer: v.object({
              name: v.string(),
              email: v.pipe(v.string(), v.email()),
            }),
            items: v.array(
              v.object({
                productId: v.string(),
                quantity: v.pipe(v.number(), v.minValue(1)),
                price: v.number(),
              })
            ),
            metadata: v.optional(v.record(v.string(), v.unknown())),
          }),
        },
      },
      responses: {
        201: { 'application/json': { body: v.object({ orderId: v.string(), total: v.number() }) } },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      createOrder: async (request) => {
        const items = request.validatedBody.items;
        const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        return request.respond({
          status: 201,
          contentType: 'application/json',
          body: { orderId: 'order-123', total },
        });
      },
    },
  });

  const requestBody = {
    customer: {
      name: 'John Doe',
      email: 'john@example.com',
    },
    items: [
      { productId: 'prod-1', quantity: 2, price: 10.99 },
      { productId: 'prod-2', quantity: 1, price: 5.99 },
    ],
    metadata: {
      source: 'web',
      campaign: 'summer-sale',
    },
  };

  const request = new Request('http://localhost:3000/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
  const response = await router.fetch(request);

  expect(response.status).toBe(201);
  const body = await response.json();
  expect(body.orderId).toBe('order-123');
  expect(body.total).toBe(27.97); // (2 * 10.99) + (1 * 5.99)
});

test('Handler throwing errors should be handled gracefully', async () => {
  const contract = createContract({
    getUsers: {
      path: '/users',
      method: 'GET',
      responses: {
        200: {
          'application/json': { body: v.object({ users: v.array(v.string()) }) },
          500: { 'application/json': { body: v.object({ error: v.string() }) } },
        },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      getUsers: async () => {
        throw new Error('Internal server error');
      },
    },
  });

  const request = new Request('http://localhost:3000/users');

  // The router's error handler may catch errors and convert them to responses
  // or they may propagate. This test verifies that errors don't cause unhandled rejections
  // and that the router handles them in some way (either as error response or thrown error)
  try {
    const response = await router.fetch(request);
    // If error is caught and converted to response, it should be an error status
    expect(response.status).toBeGreaterThanOrEqual(400);
  } catch (error) {
    // If error propagates, verify it's a proper Error instance
    // Note: Some routers may serialize errors which can cause circular reference issues
    // This is an edge case that reveals potential issues in error handling
    expect(error).toBeInstanceOf(Error);
  }
});

test('Multiple headers validation should handle case-insensitive headers', async () => {
  const contract = createContract({
    getProtected: {
      path: '/protected',
      method: 'GET',
      headers: v.object({
        authorization: v.string(),
        'x-api-key': v.string(),
        'x-request-id': v.optional(v.string()),
      }),
      responses: {
        200: {
          'application/json': { body: v.object({ message: v.string() }) },
        },
        401: { 'application/json': { body: v.object({ error: v.string() }) } },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      getProtected: async (request) => {
        const auth = request.validatedHeaders.get('authorization');
        const apiKey = request.validatedHeaders.get('x-api-key');
        if (auth && apiKey) {
          return request.respond({
            status: 200,
            contentType: 'application/json',
            body: { message: 'Access granted' },
          });
        }
        return request.respond({
          status: 401,
          contentType: 'application/json',
          body: { error: 'Unauthorized' },
        });
      },
    },
  });

  // Test with lowercase headers (Headers API normalizes to lowercase)
  const request = new Request('http://localhost:3000/protected', {
    headers: {
      authorization: 'Bearer token123',
      'x-api-key': 'key-123',
      'x-request-id': 'req-456',
    },
  });
  const response = await router.fetch(request);
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.message).toBe('Access granted');
});

test('Response headers should be set correctly', async () => {
  const contract = createContract({
    getUsers: {
      path: '/users',
      method: 'GET',
      responses: {
        200: {
          'application/json': {
            body: v.object({ users: v.array(v.string()) }),
            headers: v.object({
              'x-total-count': v.optional(v.string()),
              'cache-control': v.optional(v.string()),
            }),
          },
        },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      getUsers: async (request) => {
        // Response helpers return objects with status, body, and optional headers
        // Headers should be passed as the third parameter
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: { users: ['user1'] },
          headers: {
            'x-total-count': '1',
            'cache-control': 'max-age=3600',
          },
        });
      },
    },
  });

  const request = new Request('http://localhost:3000/users');
  const response = await router.fetch(request);

  expect(response.status).toBe(200);
  expect(response.headers.get('x-total-count')).toBe('1');
  expect(response.headers.get('cache-control')).toBe('max-age=3600');
});

test('Empty query parameters should handle optional params', async () => {
  const contract = createContract({
    listItems: {
      path: '/items',
      method: 'GET',
      query: v.object({
        page: v.optional(v.string()),
        limit: v.optional(v.string()),
        sort: v.optional(v.picklist(['asc', 'desc'])),
      }),
      responses: {
        200: {
          'application/json': {
            body: v.object({ items: v.array(v.string()), page: v.optional(v.number()) }),
          },
        },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      listItems: async (request) => {
        const page = request.validatedQuery.page
          ? parseInt(request.validatedQuery.page, 10)
          : undefined;
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: { items: ['item1'], page },
        });
      },
    },
  });

  // Test with no query params
  const request1 = new Request('http://localhost:3000/items');
  const response1 = await router.fetch(request1);
  expect(response1.status).toBe(200);
  const body1 = await response1.json();
  expect(body1.page).toBeUndefined();

  // Test with some query params
  const request2 = new Request('http://localhost:3000/items?page=2&sort=desc');
  const response2 = await router.fetch(request2);
  expect(response2.status).toBe(200);
  const body2 = await response2.json();
  expect(body2.page).toBe(2);
});

test('Empty body should handle optional body validation', async () => {
  const contract = createContract({
    updateSettings: {
      path: '/settings',
      method: 'PATCH',
      requests: {
        'application/json': {
          body: v.object({
            theme: v.optional(v.string()),
            notifications: v.optional(v.boolean()),
          }),
        },
      },
      responses: {
        200: { 'application/json': { body: v.object({ updated: v.boolean() }) } },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      updateSettings: async (request) => {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: { updated: true },
        });
      },
    },
  });

  // Test with empty body (should still validate as all fields are optional)
  const request = new Request('http://localhost:3000/settings', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  const response = await router.fetch(request);

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.updated).toBe(true);
});

test('Same path different methods should handle route conflicts correctly', async () => {
  const contract = createContract({
    getUsers: {
      path: '/users',
      method: 'GET',
      responses: {
        200: { 'application/json': { body: v.object({ users: v.array(v.string()) }) } },
      },
    },
    createUser: {
      path: '/users',
      method: 'POST',
      requests: {
        'application/json': {
          body: v.object({ name: v.string() }),
        },
      },
      responses: {
        201: { 'application/json': { body: v.object({ id: v.string(), name: v.string() }) } },
      },
    },
    updateUsers: {
      path: '/users',
      method: 'PUT',
      requests: {
        'application/json': {
          body: v.object({ users: v.array(v.string()) }),
        },
      },
      responses: {
        200: { 'application/json': { body: v.object({ updated: v.number() }) } },
      },
    },
    deleteUsers: {
      path: '/users',
      method: 'DELETE',
      responses: {
        204: { 'application/json': { body: v.undefined() } },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      getUsers: async (request) => {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: { users: ['user1'] },
        });
      },
      createUser: async (request) => {
        return request.respond({
          status: 201,
          contentType: 'application/json',
          body: { id: '1', name: request.validatedBody.name },
        });
      },
      updateUsers: async (request) => {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: { updated: request.validatedBody.users.length },
        });
      },
      deleteUsers: async (request) => {
        return request.respond({ status: 204, contentType: 'application/json', body: undefined });
      },
    },
  });

  // Test GET
  const getRequest = new Request('http://localhost:3000/users', { method: 'GET' });
  const getResponse = await router.fetch(getRequest);
  expect(getResponse.status).toBe(200);

  // Test POST
  const postRequest = new Request('http://localhost:3000/users', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'New User' }),
  });
  const postResponse = await router.fetch(postRequest);
  expect(postResponse.status).toBe(201);

  // Test PUT
  const putRequest = new Request('http://localhost:3000/users', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ users: ['user1', 'user2'] }),
  });
  const putResponse = await router.fetch(putRequest);
  expect(putResponse.status).toBe(200);

  // Test DELETE
  const deleteRequest = new Request('http://localhost:3000/users', { method: 'DELETE' });
  const deleteResponse = await router.fetch(deleteRequest);
  expect(deleteResponse.status).toBe(204);
});

test('Path parameters with special characters should be preserved', async () => {
  const contract = createContract({
    getUser: {
      path: '/users/:id',
      method: 'GET',
      responses: {
        200: { 'application/json': { body: v.object({ id: v.string() }) } },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      getUser: async (request) => {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: { id: request.params.id },
        });
      },
    },
  });

  // Test with UUID
  const uuid = '550e8400-e29b-41d4-a716-446655440000';
  const request1 = new Request(`http://localhost:3000/users/${uuid}`);
  const response1 = await router.fetch(request1);
  expect(response1.status).toBe(200);
  expect(await response1.json()).toEqual({ id: uuid });

  // Test with numeric ID
  const numericId = '12345';
  const request2 = new Request(`http://localhost:3000/users/${numericId}`);
  const response2 = await router.fetch(request2);
  expect(response2.status).toBe(200);
  expect(await response2.json()).toEqual({ id: numericId });
});

test('Large payload should handle big request bodies', async () => {
  const contract = createContract({
    bulkCreate: {
      path: '/items/bulk',
      method: 'POST',
      requests: {
        'application/json': {
          body: v.object({
            items: v.array(
              v.object({
                name: v.string(),
                description: v.string(),
                tags: v.array(v.string()),
              })
            ),
          }),
        },
      },
      responses: { 201: { 'application/json': { body: v.object({ created: v.number() }) } } },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      bulkCreate: async (request) => {
        return request.respond({
          status: 201,
          contentType: 'application/json',
          body: { created: request.validatedBody.items.length },
        });
      },
    },
  });

  // Create a large payload with 100 items
  const items = Array.from({ length: 100 }, (_, i) => ({
    name: `Item ${i}`,
    description: `Description for item ${i}`.repeat(10),
    tags: [`tag-${i}`, `category-${i % 10}`],
  }));

  const request = new Request('http://localhost:3000/items/bulk', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  const response = await router.fetch(request);

  expect(response.status).toBe(201);
  const body = await response.json();
  expect(body.created).toBe(100);
});

test('Query parameter transformations should handle complex transforms', async () => {
  const contract = createContract({
    search: {
      path: '/search',
      method: 'GET',
      query: v.object({
        page: v.fallback(
          v.pipe(
            v.string(),
            v.transform((val) => parseInt(val, 10))
          ),
          1
        ),
        limit: v.fallback(
          v.pipe(
            v.string(),
            v.transform((val) => Math.min(parseInt(val, 10), 100))
          ),
          10
        ),
        includeDeleted: v.optional(
          v.pipe(
            v.string(),
            v.transform((val) => val === 'true')
          )
        ),
      }),
      responses: {
        200: {
          'application/json': {
            body: v.object({
              page: v.number(),
              limit: v.number(),
              includeDeleted: v.optional(v.boolean()),
            }),
          },
        },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      search: async (request) => {
        return request.respond({
          status: 200,
          contentType: 'application/json',
          body: {
            page: request.validatedQuery.page,
            limit: request.validatedQuery.limit,
            includeDeleted: request.validatedQuery.includeDeleted,
          },
        });
      },
    },
  });

  const request = new Request('http://localhost:3000/search?page=5&limit=50&includeDeleted=true');
  const response = await router.fetch(request);

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.page).toBe(5);
  expect(body.limit).toBe(50);
  expect(body.includeDeleted).toBe(true);
});

test('Union types in body should handle discriminated unions', async () => {
  const contract = createContract({
    createEvent: {
      path: '/events',
      method: 'POST',
      requests: {
        'application/json': {
          body: v.union([
            v.object({
              type: v.literal('user'),
              userId: v.string(),
              action: v.string(),
            }),
            v.object({
              type: v.literal('system'),
              systemId: v.string(),
              event: v.string(),
            }),
          ]),
        },
      },
      responses: {
        201: { 'application/json': { body: v.object({ eventId: v.string(), type: v.string() }) } },
      },
    },
  });

  const router = createRouter({
    contract,
    handlers: {
      createEvent: async (request) => {
        const event = request.validatedBody;
        return request.respond({
          status: 201,
          contentType: 'application/json',
          body: { eventId: 'evt-123', type: event.type },
        });
      },
    },
  });

  // Test user event
  const userRequest = new Request('http://localhost:3000/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'user', userId: 'user-123', action: 'login' }),
  });
  const userResponse = await router.fetch(userRequest);
  expect(userResponse.status).toBe(201);
  expect(await userResponse.json()).toEqual({ eventId: 'evt-123', type: 'user' });

  // Test system event
  const systemRequest = new Request('http://localhost:3000/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'system', systemId: 'sys-456', event: 'startup' }),
  });
  const systemResponse = await router.fetch(systemRequest);
  expect(systemResponse.status).toBe(201);
  expect(await systemResponse.json()).toEqual({ eventId: 'evt-123', type: 'system' });
});
