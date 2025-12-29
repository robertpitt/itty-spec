import { test, expect } from 'vitest';
import { createRouter } from '../../src/router.js';
import { createContract } from '../../src/contract.js';
import type { ContractDefinition } from '../../src/types.js';
import * as v from 'valibot';

test('createContract should return contract definition as-is', () => {
  const definition: ContractDefinition = {
    getUsers: {
      operationId: 'getUsers',
      path: '/users',
      method: 'GET',
      responses: {
        200: { 'application/json': { body: v.object({ users: v.array(v.string()) }) } },
      },
    },
  };

  const contract = createContract(definition);

  expect(contract).toBe(definition);
  expect(contract.getUsers).toBe(definition.getUsers);
});

test('createContract should preserve type inference', () => {
  const contract = createContract({
    getUsers: {
      operationId: 'getUsers',
      path: '/users',
      method: 'GET',
      responses: {
        200: { 'application/json': { body: v.object({ users: v.array(v.string()) }) } },
      },
    },
  });

  expect(contract.getUsers.operationId).toBe('getUsers');
  expect(contract.getUsers.path).toBe('/users');
  expect(contract.getUsers.method).toBe('GET');
});

test('createContract should handle multiple operations', () => {
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
        200: { 'application/json': { body: v.object({ user: v.string() }) } },
        404: { 'application/json': { body: v.object({ error: v.string() }) } },
      },
    },
  });

  expect(contract.getUsers).toBeDefined();
  expect(contract.getUser).toBeDefined();
  expect(contract.getUser.path).toBe('/users/:id');
});

test('createRouter should create router with contract and handlers', () => {
  const contract = createContract({
    getUsers: {
      operationId: 'getUsers',
      path: '/users',
      method: 'GET',
      responses: {
        200: { 'application/json': { body: v.object({ users: v.array(v.string()) }) } },
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
          body: { users: [] },
        });
      },
    },
  });

  expect(router).toBeDefined();
  expect(typeof router.fetch).toBe('function');
});

test('createRouter should handle missing routes with default 404', async () => {
  const contract = createContract({
    getUsers: {
      operationId: 'getUsers',
      path: '/users',
      method: 'GET',
      responses: {
        200: { 'application/json': { body: v.object({ users: v.array(v.string()) }) } },
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
          body: { users: [] },
        });
      },
    },
  });

  const request = new Request('http://example.com/unknown');
  const response = await router.fetch(request);

  expect(response.status).toBe(404);
});

test('createRouter should use custom missing handler', async () => {
  const contract = createContract({
    getUsers: {
      operationId: 'getUsers',
      path: '/users',
      method: 'GET',
      responses: {
        200: { 'application/json': { body: v.object({ users: v.array(v.string()) }) } },
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
          body: { users: [] },
        });
      },
    },
    missing: async (request) => {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  const request = new Request('http://example.com/unknown');
  const response = await router.fetch(request);

  expect(response.status).toBe(404);
  const body = await response.json();
  expect(body).toEqual({ error: 'Not found' });
});

test('createRouter should handle base path', () => {
  const contract = createContract({
    getUsers: {
      operationId: 'getUsers',
      path: '/users',
      method: 'GET',
      responses: {
        200: { 'application/json': { body: v.object({ users: v.array(v.string()) }) } },
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
          body: { users: [] },
        });
      },
    },
    base: '/api/v1',
  });

  expect(router).toBeDefined();
});

test('createRouter should skip operations without handlers', () => {
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
        200: { 'application/json': { body: v.object({ user: v.string() }) } },
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
          body: { users: [] },
        });
      },
      // getUser handler is missing
    },
  });

  expect(router).toBeDefined();
  // Router should still be created even if some handlers are missing
});
