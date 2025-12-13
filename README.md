# itty-spec

> Type-safe API contracts for [itty-router](https://github.com/kwhitley/itty-router)

`itty-spec` provides a type-safe, contract-based approach to building APIs with itty-router. Define your API contracts using Zod schemas, and get automatic request/response validation with full TypeScript type inference.

## Features

- 🔒 **Type-safe contracts** - Define API contracts with Zod schemas and get full TypeScript inference
- ✅ **Automatic validation** - Request and response validation happens automatically
- 🎯 **Zero boilerplate** - Contracts define routes, validation, and types in one place
- 🚀 **Edge-compatible** - Built on itty-router, works everywhere (Cloudflare Workers, Node.js, Bun, etc.)
- 📝 **Rich schema support** - Path params, query params, headers, body, and typed responses
- 🛡️ **Type-safe handlers** - Handlers receive fully typed requests with validated data

## Installation

```bash
npm install itty-spec
# or
pnpm add itty-spec
```

## Quick Start

```typescript
import { createContract, contractRouter } from 'itty-spec';
import { z } from 'zod';

// Define your API contract
const contract = createContract({
  getUsers: {
    operationId: 'getUsers',
    path: '/users',
    method: 'GET',
    query: z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(10),
    }),
    responses: {
      200: { body: z.object({ users: z.array(z.string()), total: z.number() }) },
    },
  },
});

// Create a router with type-safe handlers
const router = contractRouter({
  contract,
  handlers: {
    getUsers: async (request) => {
      // request.query is fully typed and validated!
      const { page, limit } = request.query;
      
      // Return typed response
      return request.json({
        users: ['alice', 'bob'],
        total: 2,
      }, 200);
    },
  },
});

// Use with any fetch-compatible environment
export default {
  fetch: router.fetch,
};
```

## Usage Examples

### GET Endpoint with Query Parameters

```typescript
import { createContract, contractRouter } from 'itty-spec';
import { z } from 'zod';

const contract = createContract({
  getCalculate: {
    operationId: 'getCalculate',
    path: '/calculate',
    method: 'GET',
    query: z.object({
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
    getCalculate: async (request) => {
      const { a, b } = request.query;
      return request.json({ result: a + b }, 200);
    },
  },
});
```

### POST Endpoint with Body

```typescript
const contract = createContract({
  createUser: {
    operationId: 'createUser',
    path: '/users',
    method: 'POST',
    body: z.object({
      name: z.string().min(1),
      email: z.string().email(),
      age: z.number().min(18).optional(),
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
    createUser: async (request) => {
      // request.body is fully typed and validated!
      const { name, email } = request.body;
      
      // TypeScript ensures you return a valid response
      return request.json({ id: '123', name }, 201);
    },
  },
});
```

### Path Parameters

```typescript
const contract = createContract({
  getUser: {
    operationId: 'getUser',
    path: '/users/:id',
    method: 'GET',
    pathParams: z.object({
      id: z.string().uuid(),
    }),
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
      // request.params.id is typed as string and validated as UUID
      const { id } = request.params;
      
      return request.json({ id, name: 'Alice' }, 200);
    },
  },
});
```

### Multiple Response Status Codes

```typescript
const contract = createContract({
  updateUser: {
    operationId: 'updateUser',
    path: '/users/:id',
    method: 'PUT',
    pathParams: z.object({ id: z.string() }),
    body: z.object({ name: z.string().min(1) }),
    responses: {
      200: { body: z.object({ id: z.string(), name: z.string() }) },
      400: { body: z.object({ error: z.string() }) },
      404: { body: z.object({ error: z.string() }) },
    },
  },
});

const router = contractRouter({
  contract,
  handlers: {
    updateUser: async (request) => {
      const { id } = request.params;
      const { name } = request.body;
      
      // Use request.error() for error responses
      if (!userExists(id)) {
        return request.error(404, { error: 'User not found' });
      }
      
      // Use request.json() for success responses
      return request.json({ id, name }, 200);
    },
  },
});
```

### Headers and Custom Response Headers

```typescript
const contract = createContract({
  getData: {
    operationId: 'getData',
    path: '/data',
    method: 'GET',
    headers: z.object({
      'x-api-key': z.string(),
    }),
    responses: {
      200: {
        body: z.object({ data: z.string() }),
        headers: z.object({
          'x-request-id': z.string(),
        }),
      },
    },
  },
});

const router = contractRouter({
  contract,
  handlers: {
    getData: async (request) => {
      // request.headers is typed and validated
      const apiKey = request.headers['x-api-key'];
      
      return request.json(
        { data: 'secret' },
        200,
        { 'x-request-id': 'abc-123' }
      );
    },
  },
});
```

## API Reference

### `createContract<T>(definition: T): T`

Creates a contract from a contract definition. Validates the structure and returns a fully typed contract.

**Parameters:**
- `definition` - A contract definition object mapping operation IDs to operations

**Returns:** The same contract definition with full type inference

### `contractRouter<TContract>(options: ContractRouterOptions<TContract>): Router`

Creates a type-safe router from a contract definition.

**Parameters:**
- `options.contract` - The contract definition
- `options.handlers` - Object mapping operation IDs to handler functions
- `options.base` - (optional) Base path for all routes
- `options.missing` - (optional) Handler for missing routes (defaults to 404)
- `options.before` - (optional) Additional middleware to run before handlers
- `options.finally` - (optional) Additional middleware to run after handlers
- `options.format` - (optional) Custom response formatter

**Returns:** An itty-router instance with registered routes

### Handler Request Object

Handlers receive a typed request object with the following properties:

- `request.params` - Typed path parameters
- `request.query` - Typed and validated query parameters
- `request.body` - Typed and validated request body
- `request.headers` - Typed and validated headers
- `request.json(body, status?, headers?)` - Create a JSON response (validated against contract)
- `request.error(status, body, headers?)` - Create an error response (validated against contract)
- `request.noContent(status)` - Create a no-content response (204)

All properties are fully typed based on your contract definition.

### Types

- `ContractDefinition` - Type for contract definitions
- `ContractOperation` - Type for individual contract operations
- `Handler<TOperation>` - Type for handler functions
- `TypedContractRequest<TOperation>` - Type for the request object in handlers

## Development

### Prerequisites

- Node.js 18+
- npm or pnpm

### Setup

```bash
npm install
```

### Build

Build the library:

```bash
npm run build
```

This generates:
- `dist/index.js` - ESM bundle
- `dist/index.cjs` - CommonJS bundle
- `dist/index.d.ts` - TypeScript declarations
- Source maps for debugging

### Testing

```bash
npm test
```

### Formatting

```bash
npm run format
```

### Publishing

The `prepublishOnly` script automatically runs the build before publishing:

```bash
npm publish
```

## License

MIT
