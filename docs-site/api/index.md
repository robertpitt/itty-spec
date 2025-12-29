# API Reference

Complete API reference for `itty-spec`. All functions, types, and utilities are documented here.

## Core Functions

### [createContract](/api/create-contract)

Creates a contract object that defines your API operations.

```ts
import { createContract } from "itty-spec";

const contract = createContract({
  operationName: {
    path: "/path",
    method: "GET",
    responses: { /* ... */ },
  },
});
```

### [createRouter](/api/create-router)

Creates a router with handlers bound to a contract.

```ts
import { createRouter } from "itty-spec";

const router = createRouter({
  contract,
  handlers: {
    operationName: async (request) => {
      // Handler implementation
    },
  },
});
```

### [createOpenApiSpecification](/api/create-openapi-specification)

Generates an OpenAPI 3.1 specification from a contract.

```ts
import { createOpenApiSpecification } from "itty-spec/openapi";

const spec = await createOpenApiSpecification(contract, {
  title: "API Title",
  version: "1.0.0",
  description: "API Description",
  servers: [{ url: "https://api.example.com" }],
});
```

## Type Reference

### [Types](/api/types)

Complete reference for all TypeScript types used in `itty-spec`:

- Contract types
- Request types
- Response types
- Helper types

### [Middleware API](/api/middleware-api)

Reference for built-in middleware and custom middleware patterns.

## Quick Links

- [Contracts Guide](/guide/contracts) - Learn about contract definitions
- [Router Configuration](/guide/router-configuration) - Configure your router
- [Type Safety](/guide/type-safety) - Understand type inference
- [Examples](/examples/) - Working examples

For detailed type definitions, see the TypeScript source code.

