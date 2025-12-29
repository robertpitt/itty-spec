import { test, expect, describe } from 'vitest';
import { createContract } from '../../src/index.js';
import { createOpenApiSpecification } from '../../src/openapi/index.js';
import type { OpenAPIV3_1 } from 'openapi-types';
import * as v from 'valibot';

describe('OpenAPI Specification Generation', () => {
  test('should generate basic OpenAPI spec with minimal contract', async () => {
    const contract = createContract({
      getUsers: {
        path: '/users',
        method: 'GET',
        responses: {
          200: { body: v.object({ users: v.array(v.string()) }) },
        },
      },
    });

    const spec = await createOpenApiSpecification(contract, {
      title: 'Test API',
      version: '1.0.0',
    });

    expect(spec.openapi).toBe('3.1.1');
    expect(spec.info?.title).toBe('Test API');
    expect(spec.info?.version).toBe('1.0.0');
    expect(spec.paths).toBeDefined();
    expect(spec.components).toBeDefined();
  });

  test('should convert path format from :param to {param}', async () => {
    const contract = createContract({
      getUser: {
        path: '/users/:id',
        method: 'GET',
        responses: {
          200: { body: v.object({ id: v.string() }) },
        },
      },
    });

    const spec = await createOpenApiSpecification(contract, {
      title: 'Test API',
      version: '1.0.0',
    });

    expect(spec.paths?.['/users/{id}']).toBeDefined();
    expect(spec.paths?.['/users/:id']).toBeUndefined();
  });

  test('should extract path parameters from path string', async () => {
    const contract = createContract({
      getUser: {
        path: '/users/:id',
        method: 'GET',
        responses: {
          200: { body: v.object({ id: v.string() }) },
        },
      },
    });

    const spec = await createOpenApiSpecification(contract, {
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

  test('should use pathParams schema when provided', async () => {
    const contract = createContract({
      getUser: {
        path: '/users/:id',
        method: 'GET',
        pathParams: v.object({
          id: v.pipe(v.string(), v.uuid(), v.description('User UUID')),
        }),
        responses: {
          200: { body: v.object({ id: v.string() }) },
        },
      },
    });

    const spec = await createOpenApiSpecification(contract, {
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

  test('should fallback to string for path params not in schema', async () => {
    const contract = createContract({
      getUserPost: {
        path: '/users/:userId/posts/:postId',
        method: 'GET',
        pathParams: v.object({
          userId: v.pipe(v.string(), v.uuid()),
          // postId not in schema, should fallback to string
        }),
        responses: {
          200: { body: v.object({ userId: v.string(), postId: v.string() }) },
        },
      },
    });

    const spec = await createOpenApiSpecification(contract, {
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

  test('should extract query parameters from query schema', async () => {
    const contract = createContract({
      getUsers: {
        path: '/users',
        method: 'GET',
        query: v.object({
          page: v.pipe(v.number(), v.integer(), v.minValue(1), v.description('Page number')),
          limit: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100))),
          search: v.optional(v.string()),
        }),
        responses: {
          200: { body: v.object({ users: v.array(v.string()) }) },
        },
      },
    });

    const spec = await createOpenApiSpecification(contract, {
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

  test('should extract request body from request schema', async () => {
    const contract = createContract({
      createUser: {
        path: '/users',
        method: 'POST',
        requests: {
          'application/json': {
            body: v.object({
              name: v.pipe(v.string(), v.minLength(1)),
              email: v.pipe(v.string(), v.email()),
              age: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
            }),
          },
        },
        responses: {
          201: { body: v.object({ id: v.string(), name: v.string() }) },
        },
      },
    });

    const spec = await createOpenApiSpecification(contract, {
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

  test('should extract request headers from headers schema', async () => {
    const contract = createContract({
      getUsers: {
        path: '/users',
        method: 'GET',
        headers: v.object({
          'X-API-Key': v.pipe(v.string(), v.description('API key for authentication')),
          'X-Request-ID': v.optional(v.pipe(v.string(), v.uuid())),
        }),
        responses: {
          200: { body: v.object({ users: v.array(v.string()) }) },
        },
      },
    });

    const spec = await createOpenApiSpecification(contract, {
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

  test('should extract response bodies and headers', async () => {
    const contract = createContract({
      getUser: {
        path: '/users/:id',
        method: 'GET',
        responses: {
          200: {
            'application/json': {
              body: v.object({
                id: v.string(),
                name: v.string(),
                email: v.pipe(v.string(), v.email()),
              }),
              headers: v.object({
                'X-Request-ID': v.pipe(v.string(), v.uuid()),
                'X-RateLimit-Remaining': v.pipe(v.number(), v.integer()),
              }),
            },
          },
          404: {
            'application/json': {
              body: v.object({ error: v.string() }),
            },
          },
        },
      },
    });

    const spec = await createOpenApiSpecification(contract, {
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

  test('should register schemas in components.schemas', async () => {
    const contract = createContract({
      createUser: {
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
        responses: {
          201: { body: v.object({ id: v.string(), name: v.string() }) },
        },
      },
    });

    const spec = await createOpenApiSpecification(contract, {
      title: 'Test API',
      version: '1.0.0',
    });

    expect(spec.components?.schemas).toBeDefined();
    expect(Object.keys(spec.components?.schemas || {})).not.toHaveLength(0);
  });

  test('should deduplicate schemas when reused', async () => {
    const userSchema = v.object({
      id: v.string(),
      name: v.string(),
      email: v.pipe(v.string(), v.email()),
    });

    const contract = createContract({
      getUser: {
        path: '/users/:id',
        method: 'GET',
        responses: {
          200: { body: userSchema },
        },
      },
      updateUser: {
        path: '/users/:id',
        method: 'PUT',
        requests: {
          'application/json': {
            body: userSchema,
          },
        },
        responses: {
          200: { body: userSchema },
        },
      },
    });

    const spec = await createOpenApiSpecification(contract, {
      title: 'Test API',
      version: '1.0.0',
    });

    // Should reuse the same schema reference
    const schemaKeys = Object.keys(spec.components?.schemas || {});
    // Should have fewer schemas than if we didn't deduplicate
    // (userSchema is used 3 times but should only be registered once)
    expect(schemaKeys.length).toBeLessThan(3);
  });

  test('should handle multiple operations on same path', async () => {
    const contract = createContract({
      getUsers: {
        path: '/users',
        method: 'GET',
        responses: {
          200: { body: v.object({ users: v.array(v.string()) }) },
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
          201: { body: v.object({ id: v.string() }) },
        },
      },
    });

    const spec = await createOpenApiSpecification(contract, {
      title: 'Test API',
      version: '1.0.0',
    });

    const pathItem = spec.paths?.['/users'];
    expect(pathItem?.get).toBeDefined();
    expect(pathItem?.post).toBeDefined();
  });

  test('should include operation metadata', async () => {
    const contract = createContract({
      getUser: {
        operationId: 'getUserById',
        path: '/users/:id',
        method: 'GET',
        summary: 'Get a user by ID',
        description: 'Retrieves a single user by their unique identifier',
        tags: ['users'],
        responses: {
          200: { body: v.object({ id: v.string() }) },
        },
      },
    });

    const spec = await createOpenApiSpecification(contract, {
      title: 'Test API',
      version: '1.0.0',
    });

    const operation = spec.paths?.['/users/{id}']?.get;
    expect(operation?.operationId).toBe('getUserById');
    expect(operation?.summary).toBe('Get a user by ID');
    expect(operation?.description).toBe('Retrieves a single user by their unique identifier');
    expect(operation?.tags).toEqual(['users']);
  });

  test('should handle complex nested schemas', async () => {
    const contract = createContract({
      createOrder: {
        path: '/orders',
        method: 'POST',
        requests: {
          'application/json': {
            body: v.object({
              items: v.array(
                v.object({
                  productId: v.string(),
                  quantity: v.pipe(v.number(), v.integer(), v.minValue(1)),
                  price: v.pipe(v.number(), v.minValue(1)),
                })
              ),
              shippingAddress: v.object({
                street: v.string(),
                city: v.string(),
                zipCode: v.string(),
              }),
            }),
          },
        },
        responses: {
          201: {
            body: v.object({
              orderId: v.string(),
              total: v.number(),
              items: v.array(
                v.object({
                  productId: v.string(),
                  quantity: v.number(),
                })
              ),
            }),
          },
        },
      },
    });

    const spec = await createOpenApiSpecification(contract, {
      title: 'Test API',
      version: '1.0.0',
    });

    expect(spec.components?.schemas).toBeDefined();
    const operation = spec.paths?.['/orders']?.post;
    expect(operation?.requestBody).toBeDefined();
    expect(operation?.responses?.['201']).toBeDefined();
  });

  test('should handle optional fields correctly', async () => {
    const contract = createContract({
      updateUser: {
        path: '/users/:id',
        method: 'PATCH',
        requests: {
          'application/json': {
            body: v.object({
              name: v.optional(v.string()),
              email: v.optional(v.pipe(v.string(), v.email())),
              age: v.optional(v.pipe(v.number(), v.integer())),
            }),
          },
        },
        responses: {
          200: { body: v.object({ id: v.string() }) },
        },
      },
    });

    const spec = await createOpenApiSpecification(contract, {
      title: 'Test API',
      version: '1.0.0',
    });

    const operation = spec.paths?.['/users/{id}']?.patch;
    expect(operation?.requestBody).toBeDefined();
    // Schema should be registered
    expect(spec.components?.schemas).toBeDefined();
  });

  test('should support content-type-specific responses (new format)', async () => {
    const contract = createContract({
      getData: {
        path: '/data',
        method: 'GET',
        responses: {
          200: {
            'application/json': {
              body: v.object({ result: v.number() }),
            },
            'text/html': {
              body: v.string(),
            },
            'application/xml': {
              body: v.string(),
            },
          },
        },
      },
    });

    const spec = await createOpenApiSpecification(contract, {
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

  test('should support different headers per content type', async () => {
    const contract = createContract({
      getData: {
        path: '/data',
        method: 'GET',
        responses: {
          200: {
            'application/json': {
              body: v.object({ result: v.number() }),
              headers: v.object({
                'Content-Length': v.string(),
                'X-Request-ID': v.string(),
              }),
            },
            'text/html': {
              body: v.string(),
              headers: v.object({
                'Content-Length': v.string(),
              }),
            },
          },
        },
      },
    });

    const spec = await createOpenApiSpecification(contract, {
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

  test('should register schemas for all content types', async () => {
    const jsonSchema = v.object({ result: v.number() });
    const htmlSchema = v.string();
    const xmlSchema = v.string();

    const contract = createContract({
      getData: {
        path: '/data',
        method: 'GET',
        responses: {
          200: {
            'application/json': { body: jsonSchema },
            'text/html': { body: htmlSchema },
            'application/xml': { body: xmlSchema },
          },
        },
      },
    });

    const spec = await createOpenApiSpecification(contract, {
      title: 'Test API',
      version: '1.0.0',
    });

    // All schemas should be registered
    expect(spec.components?.schemas).toBeDefined();
    const schemaKeys = Object.keys(spec.components?.schemas || {});
    // Should have at least 3 schemas (one for each content type)
    expect(schemaKeys.length).toBeGreaterThanOrEqual(3);
  });

  test('should handle error responses with content-type maps', async () => {
    const contract = createContract({
      getData: {
        path: '/data',
        method: 'GET',
        responses: {
          200: {
            'application/json': { body: v.object({ result: v.number() }) },
          },
          400: {
            'application/json': { body: v.object({ error: v.string() }) },
          },
          500: {
            'application/json': { body: v.object({ error: v.string(), code: v.string() }) },
          },
        },
      },
    });

    const spec = await createOpenApiSpecification(contract, {
      title: 'Test API',
      version: '1.0.0',
    });

    const operation = spec.paths?.['/data']?.get;
    expect(operation?.responses?.['400']?.content?.['application/json']).toBeDefined();
    expect(operation?.responses?.['500']?.content?.['application/json']).toBeDefined();
  });

  test('should not include pattern when standard OpenAPI format is present', async () => {
    const contract = createContract({
      createUser: {
        path: '/users',
        method: 'POST',
        requests: {
          'application/json': {
            body: v.object({
              email: v.pipe(v.string(), v.email()),
              uri: v.pipe(v.string(), v.url()),
              uuid: v.pipe(v.string(), v.uuid()),
              date: v.pipe(v.string(), v.isoDate()),
            }),
          },
        },
        responses: {
          201: { body: v.object({ id: v.string() }) },
        },
      },
    });

    const spec = await createOpenApiSpecification(contract, {
      title: 'Test API',
      version: '1.0.0',
    });

    // Get the schema reference
    const operation = spec.paths?.['/users']?.post;
    const schemaRef = operation?.requestBody?.content?.['application/json']?.schema?.$ref;
    expect(schemaRef).toBeDefined();

    // Extract schema ID from reference
    const schemaId = schemaRef?.replace('#/components/schemas/', '');
    expect(schemaId).toBeDefined();

    // Get the actual schema
    const schema = spec.components?.schemas?.[schemaId!];
    expect(schema).toBeDefined();
    expect(schema?.properties).toBeDefined();

    // Check that email field has format but no pattern
    const emailSchema = schema?.properties?.email as OpenAPIV3_1.SchemaObject;
    expect(emailSchema?.format).toBe('email');
    expect(emailSchema?.pattern).toBeUndefined();

    // Check that uri field has format but no pattern
    const uriSchema = schema?.properties?.uri as OpenAPIV3_1.SchemaObject;
    expect(uriSchema?.format).toBe('uri');
    expect(uriSchema?.pattern).toBeUndefined();

    // Check that uuid field has format but no pattern
    const uuidSchema = schema?.properties?.uuid as OpenAPIV3_1.SchemaObject;
    expect(uuidSchema?.format).toBe('uuid');
    expect(uuidSchema?.pattern).toBeUndefined();
  });

  test('should include pattern when format is not a standard OpenAPI format', async () => {
    const contract = createContract({
      createUser: {
        path: '/users',
        method: 'POST',
        requests: {
          'application/json': {
            body: v.object({
              // Custom regex pattern without standard format
              customField: v.pipe(v.string(), v.regex(/^[A-Z]{3}-\d{4}$/)),
            }),
          },
        },
        responses: {
          201: { body: v.object({ id: v.string() }) },
        },
      },
    });

    const spec = await createOpenApiSpecification(contract, {
      title: 'Test API',
      version: '1.0.0',
    });

    // Get the schema reference
    const operation = spec.paths?.['/users']?.post;
    const schemaRef = operation?.requestBody?.content?.['application/json']?.schema?.$ref;
    expect(schemaRef).toBeDefined();

    // Extract schema ID from reference
    const schemaId = schemaRef?.replace('#/components/schemas/', '');
    expect(schemaId).toBeDefined();

    // Get the actual schema
    const schema = spec.components?.schemas?.[schemaId!];
    expect(schema).toBeDefined();
    expect(schema?.properties).toBeDefined();

    // Check that customField has pattern (since it doesn't have a standard format)
    const customFieldSchema = schema?.properties?.customField as OpenAPIV3_1.SchemaObject;
    expect(customFieldSchema?.pattern).toBeDefined();
  });
});
