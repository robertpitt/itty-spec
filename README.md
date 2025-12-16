# itty-spec

> Type-safe API contracts for [itty-router](https://github.com/kwhitley/itty-router)

`itty-spec` provides a type-safe, "contract first" based approach to building APIs with itty-router. Define your API contracts using standard schemas, and get automatic request/response validation with full TypeScript type inference.

## Features

- 🔒 **Type-safe contracts** - Define API contracts with Zod/Valibot/etc and get full TypeScript inference
- ✅ **Automatic validation** - Request and response validation happens automatically
- 🎯 **Zero boilerplate** - Contracts define routes, validation, and types in one place
- 🚀 **Edge-compatible** - Built on itty-router, works everywhere (Cloudflare Workers, Node.js, Bun, etc.)
- 📝 **Rich schema support** - Path params, query params, headers, body, and typed responses
- 🛡️ **Type-safe handlers** - Handlers receive fully typed requests with validated data
- 📚 **OpenAPI generation** - Automatically convert contracts to OpenAPI 3.1 specifications (Zod supported)

## Installation

```bash
npm install itty-spec
# or
pnpm add itty-spec
```

## Quick Start

1. First we define a contract that describes your api endpoints (example with zod)

```typescript
import { createContract } from 'itty-spec';
import { z } from 'zod';

const UserEntity = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(18).optional(),
})

const CreateUserRequest = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(18).optional(),
})

const ListUsersResponse = z.object({
  users: z.array(UserEntity),
  total: z.number()
})

// Define your API contract
const contract = createContract({
  getUsers: {
    path: '/users',
    method: 'GET',
    headers: z.object({
      'x-api-key': z.string(),
    }),
    query: z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(10),
    }),
    responses: {
      200: {
        'application/json': { body: ListUsersResponse },
      },
    },
  },
  createUser: {
    path: '/users',
    method: 'POST',
    headers: z.object({
      'x-api-key': z.string(),
    }),
    requests: {
      'application/json': {
        body: CreateUserRequest,
      },
    },
    responses: {
      200: {
        'application/json': { body: UserEntity },
      },
      400: {
        'application/json': { body: z.object({ error: z.string() }) },
      },
    },
  },
});
```

2. Next we can create a router that provides an implementation for the contract

```typescript
import { createRouter  } from 'itty-spec';
import { contract } from "./contract"

// Create a router with type-safe handlers
const router = createRouter({
  contract,
  handlers: {
    getUsers: async (request) => {
      // request.validatedQuery is fully typed and validated!
      const { page, limit } = request.validatedQuery;

      // Return typed response using request.respond()
      return request.respond({
        status: 200,
        contentType: 'application/json',
        body: { users: [], total: 0 },
      });
    },
    createUser: async (request) => {
      // request.validatedBody is fully typed and validated!
      const { name, email } = request.validatedBody;

      // TypeScript ensures you return a valid response
      return request.respond({
        status: 200,
        contentType: 'application/json',
        body: { id: '123', name, email },
      });
    },
  },
});

// Use with any fetch-compatible environment
export default {
  fetch: router.fetch,
};
```

## OpenAPI Specification Generation

`itty-spec` can automatically generate OpenAPI 3.1 specifications from your contracts. This is perfect for:
- API documentation
- Client SDK generation
- API testing tools
- Sharing API contracts with frontend teams

### Basic Usage

```typescript
import { createOpenApiSpecification } from 'itty-spec/openapi';
import { contract } from './contract';

// Generate OpenAPI specification from your contract
const openApiSpec = createOpenApiSpecification(contract, {
  title: 'My API',
  version: '1.0.0',
  description: 'A comprehensive API for managing resources',
  servers: [
    { url: 'https://api.example.com', description: 'Production' },
    { url: 'https://staging-api.example.com', description: 'Staging' },
  ],
});

// Use the spec for documentation, client generation, etc.
console.log(JSON.stringify(openApiSpec, null, 2));
```

### Serving Documentation

You can serve interactive API documentation using the generated OpenAPI spec:

```typescript
import { createOpenApiSpecification } from 'itty-spec/openapi';
import { createRouter } from 'itty-spec';

const openApiSpec = createOpenApiSpecification(contract, {
  title: 'My API',
  version: '1.0.0',
});

const router = createRouter({
  contract,
  handlers: {
    // Serve interactive documentation (using Stoplight Elements)
    getDocs: async (request) => {
      const html = `
<!doctype html>
<html>
  <head>
    <title>API Documentation</title>
    <script src="https://unpkg.com/@stoplight/elements/web-components.min.js"></script>
    <link rel="stylesheet" href="https://unpkg.com/@stoplight/elements/styles.min.css">
  </head>
  <body>
    <elements-api apiDescriptionDocument='${JSON.stringify(openApiSpec)}' router="hash" layout="sidebar" />
  </body>
</html>`;
      return request.respond({
        status: 200,
        contentType: 'text/html',
        body: html,
      });
    },
  },
});
```

### Schema Support

Currently, OpenAPI generation supports:
- ✅ **Zod** - Full support for Zod v4 schemas with `toJSONSchema()` method

Support for additional schema libraries (Valibot, ArkType, etc.) is planned for future releases.

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

### Testing

```bash
npm test
```

### Formatting

```bash
npm run format
```

## License

MIT
