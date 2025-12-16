# itty-spec

Contract-first, type-safe API definitions for itty-router.

`itty-spec` is a small layer on top of itty-router that turns an API contract into:

- A ready-to-export `fetch` handler
- Automatic request parsing and validation (params, query, headers, body)
- Fully inferred TypeScript types in your route handlers
- Typed, contract-checked responses (status code + content type + body)
- Optional OpenAPI 3.1 spec generation from the same contract (Zod v4 supported)

If you like itty-router’s “tiny router for Fetch” mental model, `itty-spec` keeps that model and adds a single source of truth: the contract.

---

## What this project provides

- **Contract-first API design**: define routes, inputs, and outputs once.
- **Runtime validation**: invalid requests are rejected before your handler runs.
- **End-to-end TypeScript inference**: handlers receive typed, validated data.
- **Typed response builder**: responses must match the contract (status/content-type/body).
- **Fetch-first compatibility**: works in any environment that supports the Fetch API.
- **OpenAPI generation (optional)**: generate an OpenAPI 3.1 document from the contract (currently Zod v4).

## What this project is not

- Not a full application framework (no controllers, DI container, ORM, etc.).
- Not a server runtime (you bring your own deployment: Workers, Node, Bun, Deno, etc.).
- Not a replacement for itty-router; it builds on it.

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

`itty-spec` is designed to work with schema libraries that implement the Standard Schema V1 interface. In practice:

* Zod (v4) is supported and is the best experience today (including OpenAPI generation).
* Other Standard Schema compatible libraries can be used for validation; OpenAPI support may vary.

---

## OpenAPI 3.1 generation (optional)

If you want a formal API spec (documentation, SDK generation, Postman/Insomnia import), generate an OpenAPI document directly from your contract:

```ts
import { createOpenApiSpecification } from "itty-spec/openapi";
import { contract } from "./contract";

const openApiSpec = createOpenApiSpecification(contract, {
  title: "My API",
  version: "1.0.0",
  description: "Example API built with itty-spec",
  servers: [{ url: "https://api.example.com", description: "Production" }],
});

console.log(JSON.stringify(openApiSpec, null, 2));
```

OpenAPI generation currently supports Zod v4 schemas via `toJSONSchema()`.


## Repository layout

* `src/` library source
* `examples/` usage examples
* `tests/` test suite

## References

- [itty-router](https://itty.dev/itty-router)

## License

MIT