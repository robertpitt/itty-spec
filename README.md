# itty-spec

> **Type-safe API contracts for [itty-router](https://github.com/kwhitley/itty-router)** — Build robust APIs with contracts that define routes, validation, and types in one place.

`itty-spec` transforms how you build APIs by combining contract-driven development with full TypeScript type safety. Define your API once, and get automatic validation, type inference, and route registration—all without boilerplate.

## ✨ Why itty-spec?

Building APIs shouldn't mean juggling separate route definitions, validation logic, and type definitions. `itty-spec` brings them together in a single, elegant contract that improves your developer experience at every step.

### 🎯 Developer Experience Features

#### **🔒 End-to-End Type Safety**
- **Full TypeScript inference** — Your contracts automatically generate types for requests, responses, and handlers
- **Compile-time guarantees** — Catch API mismatches before runtime with TypeScript's type checker
- **IntelliSense support** — Autocomplete for all request properties (`params`, `query`, `body`, `headers`) based on your contract
- **Type-safe responses** — Response helpers (`json`, `error`, `noContent`) validate against your contract schemas

#### **⚡ Zero Boilerplate**
- **Single source of truth** — Define routes, validation, and types in one contract definition
- **Automatic route registration** — Routes are registered automatically from your contract—no manual route setup
- **Smart defaults** — Optional `operationId` (uses contract key), optional `method` (defaults to GET), and sensible defaults throughout
- **Path parameter extraction** — Automatically extracts and types path parameters from route strings (e.g., `/users/:id` → `{ id: string }`)

#### **🛡️ Automatic Validation**
- **Request validation** — Path params, query params, headers, and body are validated automatically before reaching your handler
- **Response validation** — Response helpers ensure your responses match your contract schemas
- **Early error detection** — Invalid requests fail fast with clear validation errors
- **Standard Schema support** — Built on [Standard Schema V1](https://github.com/standard-schema/spec), compatible with Zod, Valibot, and more

#### **🚀 Developer-Friendly API**
- **Typed request object** — Handlers receive a fully typed request with validated data ready to use
- **Response helpers** — `request.json()`, `request.error()`, and `request.noContent()` with contract-aware type checking
- **Default status codes** — `request.json()` defaults to 200 when omitted (if 200 is valid in your contract)
- **Multiple response types** — Support for multiple status codes with type-safe discriminated unions

#### **🔧 Flexible & Extensible**
- **Middleware support** — Add custom `before` and `finally` middleware for cross-cutting concerns
- **Custom formatters** — Override response formatting with your own formatter function
- **Base path support** — Prefix all routes with a base path for API versioning
- **Missing route handlers** — Customize 404 handling with typed response helpers
- **Edge-compatible** — Works everywhere itty-router works (Cloudflare Workers, Node.js, Bun, Deno, etc.)

#### **📝 Rich Schema Support**
- **Path parameters** — Validate path params with schemas or auto-extract from route patterns
- **Query parameters** — Full support for query string validation with defaults and transformations
- **Request body** — Validate request bodies with any Standard Schema-compatible validator
- **Headers** — Validate request and response headers with type safety
- **Response headers** — Type-safe response headers per status code

## 📦 Installation

```bash
npm install itty-spec
# or
pnpm add itty-spec
# or
yarn add itty-spec
```

## 🚀 Quick Start

```typescript
import { createContract, contractRouter } from 'itty-spec';
import { z } from 'zod';

// Define your API contract
const contract = createContract({
  getUsers: {
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

      // Return typed response (status defaults to 200)
      return request.json({
        users: ['alice', 'bob'],
        total: 2,
      });
    },
  },
});

// Use with any fetch-compatible environment
export default {
  fetch: router.fetch,
};
```

## 🎨 Key Features in Detail

### Type-Safe Request Access

All request properties are fully typed based on your contract:

```typescript
// Path params are typed and validated
request.params.id  // string (from /users/:id)

// Query params are typed, validated, and have defaults applied
request.query.page  // number (validated, default: 1)

// Body is typed and validated
request.body.email  // string (validated as email)

// Headers are typed and validated
request.headers['x-api-key']  // string (validated)
```

### Type-Safe Response Helpers

Response helpers ensure your responses match your contract:

```typescript
// Defaults to 200 if omitted (when 200 is valid)
request.json({ users: [] })

// Explicit status code with type checking
request.json({ id: '123' }, 201)

// Error responses with contract validation
request.error(404, { error: 'Not found' })

// No-content responses
request.noContent(204)
```

### Automatic Path Parameter Extraction

Path parameters are automatically extracted and typed from your route patterns:

```typescript
const contract = createContract({
  getUser: {
    path: '/users/:id/posts/:postId',  // Auto-extracts { id: string, postId: string }
    // ... rest of contract
  },
});
```

### Multiple Response Types

Support multiple status codes with type-safe discriminated unions:

```typescript
responses: {
  200: { body: z.object({ user: z.object({ id: z.string() }) }) },
  404: { body: z.object({ error: z.string() }) },
  500: { body: z.object({ error: z.string() }) },
}
```

### Middleware Support

Add custom middleware for authentication, logging, and more:

```typescript
const router = contractRouter({
  contract,
  handlers: { /* ... */ },
  before: [
    async (request) => {
      // Custom middleware before handlers
      console.log('Request:', request.url);
    },
  ],
  finally: [
    async (response) => {
      // Custom middleware after handlers
      console.log('Response:', response.status);
      return response;
    },
  ],
});
```

## 📚 API Reference

### `createContract<T>(definition: T): T`

Creates a contract from a contract definition. Provides full type inference and validates the structure.

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

## 🛠️ Development

### Prerequisites

- Node.js 18+
- npm, pnpm, or yarn

### Setup

```bash
npm install
```

### Build

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

## 📄 License

MIT
