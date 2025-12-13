import { test, expect } from 'vitest';
import { createContract, contractRouter } from '../../src/router.js';
import { z } from 'zod/v4';

test('Router Integration: GET request with query parameters should handle validated query parameters', async () => {
  const contract = createContract({
    getCalculate: {
      operationId: 'getCalculate',
      path: '/calculate',
      method: 'GET',
      query: z.object({
        a: z.string().transform((val) => parseInt(val, 10)),
        b: z.string().transform((val) => parseInt(val, 10)),
      }),
      responses: {
        200: { body: z.object({ result: z.number() }) },
        400: { body: z.object({ error: z.string() }) },
      },
    },
  });

  const router = contractRouter({
    contract,
    handlers: {
      getCalculate: async (request) => {
        const result = request.query.a + request.query.b;
        return result > 100
          ? request.error(400, { error: 'Invalid request' })
          : request.json({ result }, 200);
      },
    },
  });

  const request = new Request('http://localhost:3000/calculate?a=10&b=20');
  const response = await router.fetch(request);

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toEqual({ result: 30 });
});

test('Router Integration: GET request with query parameters should return 400 for invalid query parameters', async () => {
  const contract = createContract({
    getCalculate: {
      operationId: 'getCalculate',
      path: '/calculate',
      method: 'GET',
      query: z.object({
        a: z.string().transform((val) => parseInt(val, 10)),
        b: z.string().transform((val) => parseInt(val, 10)),
      }),
      responses: {
        200: { body: z.object({ result: z.number() }) },
        400: { body: z.object({ error: z.string() }) },
      },
    },
  });

  const router = contractRouter({
    contract,
    handlers: {
      getCalculate: async (request) => {
        const result = request.query.a + request.query.b;
        return result > 100
          ? request.error(400, { error: 'Invalid request' })
          : request.json({ result }, 200);
      },
    },
  });

  const request = new Request('http://localhost:3000/calculate?a=50&b=60');
  const response = await router.fetch(request);

  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body).toEqual({ error: 'Invalid request' });
});

test('Router Integration: POST request with body should handle validated body', async () => {
  const contract = createContract({
    postCalculate: {
      operationId: 'postCalculate',
      path: '/calculate',
      method: 'POST',
      request: z.object({
        a: z.number().min(0).max(100),
        b: z.number().min(0).max(100),
      }),
      responses: {
        200: { body: z.object({ result: z.number() }) },
        400: { body: z.object({ error: z.string() }) },
      },
    },
  });

  const router = contractRouter({
    contract,
    handlers: {
      postCalculate: async (request) => {
        const result = request.body.a + request.body.b;
        return result > 100
          ? request.error(400, { error: 'Invalid request' })
          : request.json({ result }, 200);
      },
    },
  });

  const request = new Request('http://localhost:3000/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ a: 10, b: 20 }),
  });
  const response = await router.fetch(request);

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toEqual({ result: 30 });
});

test('Router Integration: POST request with body should return 400 for invalid body', async () => {
  const contract = createContract({
    postCalculate: {
      operationId: 'postCalculate',
      path: '/calculate',
      method: 'POST',
      request: z.object({
        a: z.number().min(0).max(100),
        b: z.number().min(0).max(100),
      }),
      responses: {
        200: { body: z.object({ result: z.number() }) },
        400: { body: z.object({ error: z.string() }) },
      },
    },
  });

  const router = contractRouter({
    contract,
    handlers: {
      postCalculate: async (request) => {
        const result = request.body.a + request.body.b;
        return result > 100
          ? request.error(400, { error: 'Invalid request' })
          : request.json({ result }, 200);
      },
    },
  });

  const request = new Request('http://localhost:3000/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ a: 50, b: 60 }),
  });
  const response = await router.fetch(request);

  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body).toEqual({ error: 'Invalid request' });
});

test('Router Integration: GET request with path parameters should handle path parameters', async () => {
  const contract = createContract({
    getUser: {
      operationId: 'getUser',
      path: '/users/:id',
      method: 'GET',
      responses: {
        200: { body: z.object({ id: z.string(), name: z.string() }) },
        404: { body: z.object({ error: z.string() }) },
      },
    },
  });

  const router = contractRouter({
    contract,
    handlers: {
      getUser: async (request) => {
        const userId = request.params.id;
        if (userId === '123') {
          return request.json({ id: userId, name: 'John Doe' }, 200);
        }
        return request.error(404, { error: 'User not found' });
      },
    },
  });

  const request = new Request('http://localhost:3000/users/123');
  const response = await router.fetch(request);

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toEqual({ id: '123', name: 'John Doe' });
});

test('Router Integration: GET request with path parameters should handle 404 for non-existent user', async () => {
  const contract = createContract({
    getUser: {
      operationId: 'getUser',
      path: '/users/:id',
      method: 'GET',
      responses: {
        200: { body: z.object({ id: z.string(), name: z.string() }) },
        404: { body: z.object({ error: z.string() }) },
      },
    },
  });

  const router = contractRouter({
    contract,
    handlers: {
      getUser: async (request) => {
        const userId = request.params.id;
        if (userId === '123') {
          return request.json({ id: userId, name: 'John Doe' }, 200);
        }
        return request.error(404, { error: 'User not found' });
      },
    },
  });

  const request = new Request('http://localhost:3000/users/999');
  const response = await router.fetch(request);

  expect(response.status).toBe(404);
  const body = await response.json();
  expect(body).toEqual({ error: 'User not found' });
});

test('Router Integration: DELETE request with 204 No Content should handle DELETE request returning 204', async () => {
  const contract = createContract({
    deleteUser: {
      operationId: 'deleteUser',
      path: '/users/:id',
      method: 'DELETE',
      responses: {
        204: { body: z.never() },
        404: { body: z.object({ error: z.string() }) },
      },
    },
  });

  const router = contractRouter({
    contract,
    handlers: {
      deleteUser: async (request) => {
        const userId = request.params.id;
        if (userId === '123') {
          return request.noContent(204);
        }
        return request.error(404, { error: 'User not found' });
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

test('Router Integration: Request with headers validation should handle request with validated headers', async () => {
  const contract = createContract({
    getProtected: {
      operationId: 'getProtected',
      path: '/protected',
      method: 'GET',
      headers: z.object({
        authorization: z.string(),
      }),
      responses: {
        200: { body: z.object({ message: z.string() }) },
        401: { body: z.object({ error: z.string() }) },
      },
    },
  });

  const router = contractRouter({
    contract,
    handlers: {
      getProtected: async (request) => {
        const auth = request.headers.authorization;
        if (auth === 'Bearer token123') {
          return request.json({ message: 'Access granted' }, 200);
        }
        return request.error(401, { error: 'Unauthorized' });
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

test('Router Integration: Error handling should handle validation errors gracefully', async () => {
  const contract = createContract({
    postUser: {
      operationId: 'postUser',
      path: '/users',
      method: 'POST',
      request: z.object({
        name: z.string().min(1),
        email: z.string().email(),
      }),
      responses: {
        201: { body: z.object({ id: z.string(), name: z.string() }) },
        400: { body: z.object({ error: z.string() }) },
      },
    },
  });

  const router = contractRouter({
    contract,
    handlers: {
      postUser: async (request) => {
        return request.json({ id: '1', name: request.body.name }, 201);
      },
    },
  });

  // Invalid email should trigger validation error
  const request = new Request('http://localhost:3000/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'John', email: 'invalid-email' }),
  });
  const response = await router.fetch(request);

  // Validation errors should be handled by error handler
  expect(response.status).toBe(400);
});

test('Router Integration: Multiple operations should handle multiple operations in same router', async () => {
  const contract = createContract({
    getUsers: {
      operationId: 'getUsers',
      path: '/users',
      method: 'GET',
      responses: {
        200: { body: z.object({ users: z.array(z.string()) }) },
      },
    },
    getUser: {
      operationId: 'getUser',
      path: '/users/:id',
      method: 'GET',
      responses: {
        200: { body: z.object({ id: z.string(), name: z.string() }) },
      },
    },
    createUser: {
      operationId: 'createUser',
      path: '/users',
      method: 'POST',
      request: z.object({ name: z.string() }),
      responses: {
        201: { body: z.object({ id: z.string(), name: z.string() }) },
      },
    },
  });

  const router = contractRouter({
    contract,
    handlers: {
      getUsers: async (request) => {
        return request.json({ users: ['user1', 'user2'] }, 200);
      },
      getUser: async (request) => {
        return request.json({ id: request.params.id, name: 'John' }, 200);
      },
      createUser: async (request) => {
        return request.json({ id: '1', name: request.body.name }, 201);
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Jane' }),
  });
  const createResponse = await router.fetch(createRequest);
  expect(createResponse.status).toBe(201);
  const createBody = await createResponse.json();
  expect(createBody).toEqual({ id: '1', name: 'Jane' });
});
