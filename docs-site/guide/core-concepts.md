# Core Concepts

## Contract

A contract is a plain object describing each operation:

* `method` and `path`
* optional schemas for `path params`, `query`, `headers`, and request bodies
* allowed `responses` keyed by status code and content type

The contract drives both runtime behavior (validation + routing) and compile-time types.

## Router

`createRouter({ contract, handlers })` binds your handlers to the contract and produces a Fetch handler (`router.fetch`).

Before a handler is called, `itty-spec` validates the incoming request according to the schemas you provided. Your handler receives a request object with typed, validated data (for example `request.validatedQuery` and `request.validatedBody`).

## Responses

Handlers return responses via `request.respond({ status, contentType, body })`.

The shape of that response is type-checked against the contract for the current operation, so returning the wrong status code, content type, or body shape becomes a TypeScript error.

## Schema Support

`itty-spec` uses the [Standard Schema V1](https://github.com/standard-schema/spec) interface, which provides a common abstraction layer for schema validation. This means you can use any Standard Schema V1 compatible library:

* **Zod (v4)**: Fully supported with excellent TypeScript inference and OpenAPI generation. Recommended for the best developer experience.
* **Valibot**: Fully supported with OpenAPI generation via `@standard-community/standard-openapi`.
* **Other Standard Schema compatible libraries**: Can be used for validation; OpenAPI support depends on the library's Standard Schema V1 implementation.

The Standard Schema V1 interface ensures that your contracts remain portable across different schema libraries while maintaining type safety and runtime validation.

## OpenAPI 3.1 Generation and Serving (Optional)

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

