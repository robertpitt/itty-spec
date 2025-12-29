# itty-spec

Contract-first, type-safe API definitions for itty-router.

`itty-spec` is a super lightweight dependency that builds on [itty-router](https://itty.dev/itty-router), [Standard Schema V1](https://github.com/standard-schema/spec), and [Standard Community](https://github.com/standard-community) packages. Designed for small workers, lambdas, and backend servers, it turns an API contract into:

- A ready-to-export `fetch` handler
- Automatic request parsing and validation (params, query, headers, body)
- Fully inferred TypeScript types in your route handlers with end-to-end type safety
- Typed, contract-checked responses (status code + content type + body)
- Optional OpenAPI 3.1 spec generation and serving from the same contract

If you like itty-router's "tiny router for Fetch" mental model, `itty-spec` keeps that model and adds a single source of truth: the contract. Perfect for Cloudflare Workers, AWS Lambda, Node.js servers, Bun, and Deno.

[**Docs**](https://robertpitt.github.io/itty-spec)

---

## What this project provides

- **Contract-first API design**: define routes, inputs, and outputs once.
- **Fully typed TypeScript experience**: complete type inference from contract to handler, with compile-time guarantees for request/response shapes.
- **Runtime validation**: invalid requests are rejected before your handler runs, using Standard Schema V1 compatible validators.
- **End-to-end TypeScript inference**: handlers receive typed, validated data (`validatedParams`, `validatedQuery`, `validatedBody`, `validatedHeaders`).
- **Typed response builder**: responses must match the contract (status/content-type/body) - TypeScript errors catch mismatches at compile time.
- **Fetch-first compatibility**: works in any environment that supports the Fetch API.
- **OpenAPI generation and serving**: generate and serve OpenAPI 3.1 specifications from the same contract using `@standard-community/standard-openapi`.

## What this project is not

- Not a full application framework (no controllers, DI container, ORM, etc.).
- Not a server runtime (you bring your own deployment: Workers, Node, Bun, Deno, etc.).
- Not a replacement for itty-router; it builds on it.

---

## Foundation

`itty-spec` is built on a lightweight foundation of battle-tested libraries:

- **[itty-router](https://itty.dev/itty-router)** (v5): The tiny router for Fetch that powers routing and request handling.
- **[Standard Schema V1](https://github.com/standard-schema/spec)** (`@standard-schema/spec`): Provides a common interface for schema validation, enabling compatibility with multiple schema libraries.
- **[Standard Community OpenAPI](https://github.com/standard-community/standard-openapi)** (`@standard-community/standard-openapi`): Converts Standard Schema V1 schemas to OpenAPI 3.1 format for documentation and tooling.

This architecture ensures minimal bundle size while providing maximum type safety and developer experience. The library is designed to work seamlessly in edge/serverless environments where every byte counts.

---

## Installation

```bash
npm install itty-spec
# or
pnpm add itty-spec
````

---

## Quick start

### 1) Define a contract

```ts
import { createContract } from "itty-spec";
import { z } from "zod";

const UserEntity = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(18).optional(),
});

const CreateUserRequest = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(18).optional(),
});

const ListUsersResponse = z.object({
  users: z.array(UserEntity),
  total: z.number(),
});

export const contract = createContract({
  getUsers: {
    path: "/users",
    method: "GET",
    headers: z.object({
      "x-api-key": z.string(),
    }),
    query: z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(10),
    }),
    responses: {
      200: {
        "application/json": { body: ListUsersResponse },
      },
    },
  },

  createUser: {
    path: "/users",
    method: "POST",
    headers: z.object({
      "x-api-key": z.string(),
    }),
    requests: {
      "application/json": {
        body: CreateUserRequest,
      },
    },
    responses: {
      200: {
        "application/json": { body: UserEntity },
      },
      400: {
        "application/json": { body: z.object({ error: z.string() }) },
      },
    },
  },
});
```

### 2) Implement the contract with a router

```ts
import { createRouter } from "itty-spec";
import { contract } from "./contract";

const router = createRouter({
  contract,
  handlers: {
    getUsers: async (request) => {
      const { page, limit } = request.validatedQuery;

      return request.respond({
        status: 200,
        contentType: "application/json",
        body: { users: [], total: 0 },
      });
    },

    createUser: async (request) => {
      const { name, email } = request.validatedBody;

      return request.respond({
        status: 200,
        contentType: "application/json",
        body: { id: "123", name, email },
      });
    },
  },
});

export default {
  fetch: router.fetch,
};
```

---

## Target environments

`itty-spec` is designed to be lightweight and efficient, making it ideal for:

- **Cloudflare Workers**: Edge computing with minimal cold start times
- **AWS Lambda**: Serverless functions with size constraints
- **Node.js servers**: Traditional backend servers
- **Bun**: Fast JavaScript runtime
- **Deno**: Secure runtime for JavaScript and TypeScript
- **Any Fetch-compatible environment**: Works wherever the Fetch API is available

The library's minimal dependencies and small bundle size ensure fast startup times and low memory footprint, critical for edge and serverless deployments.

---

## Core concepts

### Contract

A contract is a plain object describing each operation:

* `method` and `path`
* optional schemas for `path params`, `query`, `headers`, and request bodies
* allowed `responses` keyed by status code and content type

The contract drives both runtime behavior (validation + routing) and compile-time types.

### Router

`createRouter({ contract, handlers })` binds your handlers to the contract and produces a Fetch handler (`router.fetch`).

Before a handler is called, `itty-spec` validates the incoming request according to the schemas you provided. Your handler receives a request object with typed, validated data (for example `request.validatedQuery` and `request.validatedBody`).

### Responses

Handlers return responses via `request.respond({ status, contentType, body })`.

The shape of that response is type-checked against the contract for the current operation, so returning the wrong status code, content type, or body shape becomes a TypeScript error.

---

## Schema support

`itty-spec` uses the [Standard Schema V1](https://github.com/standard-schema/spec) interface, which provides a common abstraction layer for schema validation. This means you can use any Standard Schema V1 compatible library:

* **Zod (v4)**: Fully supported with excellent TypeScript inference and OpenAPI generation. Recommended for the best developer experience.
* **Valibot**: Fully supported with OpenAPI generation via `@standard-community/standard-openapi`.
* **Other Standard Schema compatible libraries**: Can be used for validation; OpenAPI support depends on the library's Standard Schema V1 implementation.

The Standard Schema V1 interface ensures that your contracts remain portable across different schema libraries while maintaining type safety and runtime validation.

---

## OpenAPI 3.1 generation and serving (optional)

Generate an OpenAPI 3.1 specification directly from your contract and serve it as a documentation endpoint:

```ts
import { createOpenApiSpecification } from "itty-spec/openapi";
import { createRouter } from "itty-spec";
import { contract } from "./contract";
import { z } from "zod";

// Generate the OpenAPI spec
const openApiSpec = await createOpenApiSpecification(contract, {
  title: "My API",
  version: "1.0.0",
  description: "Example API built with itty-spec",
  servers: [{ url: "https://api.example.com", description: "Production" }],
});

// Serve it as a route in your router
const router = createRouter({
  contract: {
    ...contract,
    getSpec: {
      path: "/openapi.json",
      method: "GET",
      responses: {
        200: {
          "application/json": { body: z.any() },
        },
      },
    },
  },
  handlers: {
    ...yourHandlers,
    getSpec: async (request) => {
      return request.respond({
        status: 200,
        contentType: "application/json",
        body: openApiSpec,
      });
    },
  },
});
```

OpenAPI generation uses `@standard-community/standard-openapi` to convert Standard Schema V1 schemas to OpenAPI 3.1 format. This supports Zod v4 and Valibot schemas out of the box. You can then use tools like [Swagger UI](https://swagger.io/tools/swagger-ui/), [Redoc](https://github.com/Redocly/redoc), or [Elements](https://github.com/stoplightio/elements) to render interactive documentation from the served specification.

See the `examples/simple` and `examples/complex` directories for complete examples of serving OpenAPI documentation.


## Repository layout

* `src/` library source
* `examples/` usage examples
* `tests/` test suite

## References

- [itty-router](https://itty.dev/itty-router) - The tiny router for Fetch
- [Standard Schema V1](https://github.com/standard-schema/spec) - Common schema interface
- [Standard Community OpenAPI](https://github.com/standard-community/standard-openapi) - OpenAPI generation from Standard Schema

## License

MIT