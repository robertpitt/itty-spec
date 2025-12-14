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
    headers: z.object({
      'x-api-key': z.string(),
    }),
    query: z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(10),
    }),
    responses: {
      200: { body: ListUsersResponse },
    },
  },
  createUser: {
    path: '/users',
    method: 'POST',
    headers: z.object({
      'x-api-key': z.string(),
    }),
    body: CreateUserRequest,
    response: {
      200: { body: UserEntity },
      400: { body: z.object({ error: z.string() }) },
    }
  }
});
```

2. Next we can create a router that provides an implementation for the contract

```typescript
import { contractRouter } from 'itty-spec';
import { contract } from "./contract"

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
    createUser: async (request) => {
      // request.body is fully typed and validated!
      const { name, email } = request.body;

      // TypeScript ensures you return a valid response
      return request.json({ id: '123', name }, 201);
    },
  },
});

// Use with any fetch-compatible environment
export default {
  fetch: router.fetch,
};
```

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
