# API Reference

## createContract

Creates a contract object that defines your API operations.

```ts
import { createContract } from "itty-spec";

const contract = createContract({
  operationName: {
    path: "/path",
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    // ... operation definition
  },
});
```

## createRouter

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

## createOpenApiSpecification

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

For detailed API documentation, refer to the TypeScript definitions in the source code.

