import { test, expect, describe } from 'vitest';
import { createContract } from '../../src/index.js';
import { createOpenApiSpecification } from '../../src/openapi/index.js';
import { z } from 'zod/v4';

describe('OpenAPI Specification Generation', () => {
  test('should generate basic OpenAPI spec with minimal contract', () => {
    const contract = createContract({
      getUsers: {
        path: '/users',
        responses: {
          200: { body: z.object({ users: z.array(z.string()) }) },
        },
      },
    });

    const spec = createOpenApiSpecification(contract, {
      title: 'Test API',
      version: '1.0.0',
    });

    expect(spec.openapi).toBe('3.1.1');
    expect(spec.info?.title).toBe('Test API');
    expect(spec.info?.version).toBe('1.0.0');
    expect(spec.paths).toBeDefined();
    expect(spec.components).toBeDefined();
  });

  test('should convert path format from :param to {param}', () => {
    const contract = createContract({
      getUser: {
        path: '/users/:id',
        responses: {
          200: { body: z.object({ id: z.string() }) },
        },
      },
    });

    const spec = createOpenApiSpecification(contract, {
      title: 'Test API',
      version: '1.0.0',
    });

    expect(spec.paths?.['/users/{id}']).toBeDefined();
    expect(spec.paths?.['/users/:id']).toBeUndefined();
  });

  test('should extract path parameters from path string', () => {
    const contract = createContract({
      getUser: {
        path: '/users/:id',
        responses: {
          200: { body: z.object({ id: z.string() }) },
        },
      },
    });

    const spec = createOpenApiSpecification(contract, {
      title: 'Test API',
      version: '1.0.0',
    });

    const operation = spec.paths?.['/users/{id}']?.get;
    expect(operation).toBeDefined();
    expect(operation?.parameters).toBeDefined();
    expect(operation?.parameters?.length).toBe(1);
    expect(operation?.parameters?.[0]).toMatchObject({
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
    });
  });

  test('should use pathParams schema when provided', () => {
    const contract = createContract({
      getUser: {
        path: '/users/:id',
        pathParams: z.object({
          id: z.string().uuid().describe('User UUID'),
        }),
        responses: {
          200: { body: z.object({ id: z.string() }) },
        },
      },
    });

    const spec = createOpenApiSpecification(contract, {
      title: 'Test API',
      version: '1.0.0',
    });

    const operation = spec.paths?.['/users/{id}']?.get;
    const param = operation?.parameters?.find((p) => p.name === 'id');
    expect(param).toBeDefined();
    expect(param?.schema).toBeDefined();
    // Should have format: uuid from zod schema
    expect(param?.schema?.format).toBe('uuid');
    expect(param?.description).toBe('User UUID');
  });

  test('should fallback to string for path params not in schema', () => {
    const contract = createContract({
      getUserPost: {
        path: '/users/:userId/posts/:postId',
        pathParams: z.object({
          userId: z.string().uuid(),
          // postId not in schema, should fallback to string
        }),
        responses: {
          200: { body: z.object({ userId: z.string(), postId: z.string() }) },
        },
      },
    });

    const spec = createOpenApiSpecification(contract, {
      title: 'Test API',
      version: '1.0.0',
    });

    const operation = spec.paths?.['/users/{userId}/posts/{postId}']?.get;
    expect(operation?.parameters?.length).toBe(2);

    const userIdParam = operation?.parameters?.find((p) => p.name === 'userId');
    expect(userIdParam?.schema?.format).toBe('uuid');

    const postIdParam = operation?.parameters?.find((p) => p.name === 'postId');
    expect(postIdParam?.schema).toEqual({ type: 'string' });
  });

  test('should extract query parameters from query schema', () => {
    const contract = createContract({
      getUsers: {
        path: '/users',
        query: z.object({
          page: z.number().int().min(1).describe('Page number'),
          limit: z.number().int().min(1).max(100).optional(),
          search: z.string().optional(),
        }),
        responses: {
          200: { body: z.object({ users: z.array(z.string()) }) },
        },
      },
    });

    const spec = createOpenApiSpecification(contract, {
      title: 'Test API',
      version: '1.0.0',
    });

    const operation = spec.paths?.['/users']?.get;
    expect(operation?.parameters).toBeDefined();
    expect(operation?.parameters?.length).toBe(3);

    const pageParam = operation?.parameters?.find((p) => p.name === 'page');
    expect(pageParam).toMatchObject({
      name: 'page',
      in: 'query',
      required: true,
      schema: { type: 'integer' },
      description: 'Page number',
    });

    const limitParam = operation?.parameters?.find((p) => p.name === 'limit');
    expect(limitParam).toMatchObject({
      name: 'limit',
      in: 'query',
      required: false,
    });

    const searchParam = operation?.parameters?.find((p) => p.name === 'search');
    expect(searchParam).toMatchObject({
      name: 'search',
      in: 'query',
      required: false,
    });
  });

  test('should extract request body from request schema', () => {
    const contract = createContract({
      createUser: {
        path: '/users',
        method: 'POST',
        request: z.object({
          name: z.string().min(1),
          email: z.string().email(),
          age: z.number().int().min(0).optional(),
        }),
        responses: {
          201: { body: z.object({ id: z.string(), name: z.string() }) },
        },
      },
    });

    const spec = createOpenApiSpecification(contract, {
      title: 'Test API',
      version: '1.0.0',
    });

    const operation = spec.paths?.['/users']?.post;
    expect(operation?.requestBody).toBeDefined();
    expect(operation?.requestBody?.content).toBeDefined();
    expect(operation?.requestBody?.content?.['application/json']).toBeDefined();
    expect(operation?.requestBody?.content?.['application/json']?.schema).toBeDefined();
    expect(operation?.requestBody?.content?.['application/json']?.schema?.$ref).toContain(
      '#/components/schemas/'
    );
  });

  test('should extract request headers from headers schema', () => {
    const contract = createContract({
      getUsers: {
        path: '/users',
        headers: z.object({
          'X-API-Key': z.string().describe('API key for authentication'),
          'X-Request-ID': z.string().uuid().optional(),
        }),
        responses: {
          200: { body: z.object({ users: z.array(z.string()) }) },
        },
      },
    });

    const spec = createOpenApiSpecification(contract, {
      title: 'Test API',
      version: '1.0.0',
    });

    const operation = spec.paths?.['/users']?.get;
    const headerParams = operation?.parameters?.filter((p) => p.in === 'header');
    expect(headerParams?.length).toBe(2);

    const apiKeyParam = headerParams?.find((p) => p.name === 'X-API-Key');
    expect(apiKeyParam).toMatchObject({
      name: 'X-API-Key',
      in: 'header',
      required: true,
      description: 'API key for authentication',
    });

    const requestIdParam = headerParams?.find((p) => p.name === 'X-Request-ID');
    expect(requestIdParam).toMatchObject({
      name: 'X-Request-ID',
      in: 'header',
      required: false,
    });
  });

  test('should extract response bodies and headers', () => {
    const contract = createContract({
      getUser: {
        path: '/users/:id',
        responses: {
          200: {
            'application/json': {
              body: z.object({
                id: z.string(),
                name: z.string(),
                email: z.string().email(),
              }),
              headers: z.object({
                'X-Request-ID': z.string().uuid(),
                'X-RateLimit-Remaining': z.number().int(),
              }),
            },
          },
          404: {
            'application/json': {
              body: z.object({ error: z.string() }),
            },
          },
        },
      },
    });

    const spec = createOpenApiSpecification(contract, {
      title: 'Test API',
      version: '1.0.0',
    });

    const operation = spec.paths?.['/users/{id}']?.get;
    expect(operation?.responses).toBeDefined();

    const response200 = operation?.responses?.['200'];
    expect(response200).toBeDefined();
    expect(response200?.content).toBeDefined();
    expect(response200?.content?.['application/json']?.schema?.$ref).toContain(
      '#/components/schemas/'
    );
    expect(response200?.headers).toBeDefined();
    expect(response200?.headers?.['X-Request-ID']).toBeDefined();
    expect(response200?.headers?.['X-RateLimit-Remaining']).toBeDefined();

    const response404 = operation?.responses?.['404'];
    expect(response404).toBeDefined();
    expect(response404?.content).toBeDefined();
  });

  test('should register schemas in components.schemas', () => {
    const contract = createContract({
      createUser: {
        path: '/users',
        method: 'POST',
        request: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
        responses: {
          201: { body: z.object({ id: z.string(), name: z.string() }) },
        },
      },
    });

    const spec = createOpenApiSpecification(contract, {
      title: 'Test API',
      version: '1.0.0',
    });

    expect(spec.components?.schemas).toBeDefined();
    expect(Object.keys(spec.components?.schemas || {})).not.toHaveLength(0);
  });

  test('should deduplicate schemas when reused', () => {
    const userSchema = z.object({
      id: z.string(),
      name: z.string(),
      email: z.string().email(),
    });

    const contract = createContract({
      getUser: {
        path: '/users/:id',
        responses: {
          200: { body: userSchema },
        },
      },
      updateUser: {
        path: '/users/:id',
        method: 'PUT',
        request: userSchema,
        responses: {
          200: { body: userSchema },
        },
      },
    });

    const spec = createOpenApiSpecification(contract, {
      title: 'Test API',
      version: '1.0.0',
    });

    // Should reuse the same schema reference
    const schemaKeys = Object.keys(spec.components?.schemas || {});
    // Should have fewer schemas than if we didn't deduplicate
    // (userSchema is used 3 times but should only be registered once)
    expect(schemaKeys.length).toBeLessThan(3);
  });

  test('should handle multiple operations on same path', () => {
    const contract = createContract({
      getUsers: {
        path: '/users',
        responses: {
          200: { body: z.object({ users: z.array(z.string()) }) },
        },
      },
      createUser: {
        path: '/users',
        method: 'POST',
        request: z.object({ name: z.string() }),
        responses: {
          201: { body: z.object({ id: z.string() }) },
        },
      },
    });

    const spec = createOpenApiSpecification(contract, {
      title: 'Test API',
      version: '1.0.0',
    });

    const pathItem = spec.paths?.['/users'];
    expect(pathItem?.get).toBeDefined();
    expect(pathItem?.post).toBeDefined();
  });

  test('should include operation metadata', () => {
    const contract = createContract({
      getUser: {
        operationId: 'getUserById',
        path: '/users/:id',
        summary: 'Get a user by ID',
        description: 'Retrieves a single user by their unique identifier',
        tags: ['users'],
        responses: {
          200: { body: z.object({ id: z.string() }) },
        },
      },
    });

    const spec = createOpenApiSpecification(contract, {
      title: 'Test API',
      version: '1.0.0',
    });

    const operation = spec.paths?.['/users/{id}']?.get;
    expect(operation?.operationId).toBe('getUserById');
    expect(operation?.summary).toBe('Get a user by ID');
    expect(operation?.description).toBe('Retrieves a single user by their unique identifier');
    expect(operation?.tags).toEqual(['users']);
  });

  test('should handle complex nested schemas', () => {
    const contract = createContract({
      createOrder: {
        path: '/orders',
        method: 'POST',
        request: z.object({
          items: z.array(
            z.object({
              productId: z.string(),
              quantity: z.number().int().min(1),
              price: z.number().positive(),
            })
          ),
          shippingAddress: z.object({
            street: z.string(),
            city: z.string(),
            zipCode: z.string(),
          }),
        }),
        responses: {
          201: {
            body: z.object({
              orderId: z.string(),
              total: z.number(),
              items: z.array(
                z.object({
                  productId: z.string(),
                  quantity: z.number(),
                })
              ),
            }),
          },
        },
      },
    });

    const spec = createOpenApiSpecification(contract, {
      title: 'Test API',
      version: '1.0.0',
    });

    expect(spec.components?.schemas).toBeDefined();
    const operation = spec.paths?.['/orders']?.post;
    expect(operation?.requestBody).toBeDefined();
    expect(operation?.responses?.['201']).toBeDefined();
  });

  test('should handle optional fields correctly', () => {
    const contract = createContract({
      updateUser: {
        path: '/users/:id',
        method: 'PATCH',
        request: z.object({
          name: z.string().optional(),
          email: z.string().email().optional(),
          age: z.number().int().optional(),
        }),
        responses: {
          200: { body: z.object({ id: z.string() }) },
        },
      },
    });

    const spec = createOpenApiSpecification(contract, {
      title: 'Test API',
      version: '1.0.0',
    });

    const operation = spec.paths?.['/users/{id}']?.patch;
    expect(operation?.requestBody).toBeDefined();
    // Schema should be registered
    expect(spec.components?.schemas).toBeDefined();
  });

  test('should support content-type-specific responses (new format)', () => {
    const contract = createContract({
      getData: {
        path: '/data',
        responses: {
          200: {
            'application/json': {
              body: z.object({ result: z.number() }),
            },
            'text/html': {
              body: z.string(),
            },
            'application/xml': {
              body: z.string(),
            },
          },
        },
      },
    });

    const spec = createOpenApiSpecification(contract, {
      title: 'Test API',
      version: '1.0.0',
    });

    const operation = spec.paths?.['/data']?.get;
    const response200 = operation?.responses?.['200'];
    expect(response200).toBeDefined();
    expect(response200?.content).toBeDefined();
    expect(response200?.content?.['application/json']).toBeDefined();
    expect(response200?.content?.['text/html']).toBeDefined();
    expect(response200?.content?.['application/xml']).toBeDefined();
    expect(response200?.content?.['application/json']?.schema?.$ref).toContain(
      '#/components/schemas/'
    );
  });

  test('should support different headers per content type', () => {
    const contract = createContract({
      getData: {
        path: '/data',
        responses: {
          200: {
            'application/json': {
              body: z.object({ result: z.number() }),
              headers: z.object({
                'Content-Length': z.string(),
                'X-Request-ID': z.string(),
              }),
            },
            'text/html': {
              body: z.string(),
              headers: z.object({
                'Content-Length': z.string(),
              }),
            },
          },
        },
      },
    });

    const spec = createOpenApiSpecification(contract, {
      title: 'Test API',
      version: '1.0.0',
    });

    const operation = spec.paths?.['/data']?.get;
    const response200 = operation?.responses?.['200'];
    expect(response200?.headers).toBeDefined();
    // Headers are merged, so both should be present
    expect(response200?.headers?.['Content-Length']).toBeDefined();
    expect(response200?.headers?.['X-Request-ID']).toBeDefined();
  });

  test('should register schemas for all content types', () => {
    const jsonSchema = z.object({ result: z.number() });
    const htmlSchema = z.string();
    const xmlSchema = z.string();

    const contract = createContract({
      getData: {
        path: '/data',
        responses: {
          200: {
            'application/json': { body: jsonSchema },
            'text/html': { body: htmlSchema },
            'application/xml': { body: xmlSchema },
          },
        },
      },
    });

    const spec = createOpenApiSpecification(contract, {
      title: 'Test API',
      version: '1.0.0',
    });

    // All schemas should be registered
    expect(spec.components?.schemas).toBeDefined();
    const schemaKeys = Object.keys(spec.components?.schemas || {});
    // Should have at least 3 schemas (one for each content type)
    expect(schemaKeys.length).toBeGreaterThanOrEqual(3);
  });

  test('should handle error responses with content-type maps', () => {
    const contract = createContract({
      getData: {
        path: '/data',
        responses: {
          200: {
            'application/json': { body: z.object({ result: z.number() }) },
          },
          400: {
            'application/json': { body: z.object({ error: z.string() }) },
          },
          500: {
            'application/json': { body: z.object({ error: z.string(), code: z.string() }) },
          },
        },
      },
    });

    const spec = createOpenApiSpecification(contract, {
      title: 'Test API',
      version: '1.0.0',
    });

    const operation = spec.paths?.['/data']?.get;
    expect(operation?.responses?.['400']?.content?.['application/json']).toBeDefined();
    expect(operation?.responses?.['500']?.content?.['application/json']).toBeDefined();
  });
});
