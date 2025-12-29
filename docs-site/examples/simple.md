# Simple Example

A basic example demonstrating the core features of `itty-spec`.

## Overview

This example shows:
- Defining a contract with multiple operations
- Creating handlers with typed request data
- Handling multiple content types
- Generating and serving OpenAPI documentation

## Project Structure

```
simple/
├── contract.ts    # Contract definition
├── index.ts       # Router and server setup
└── utils.ts       # Utility functions
```

## Contract Definition

The contract defines two operations: `getCalculate` (GET) and `postCalculate` (POST).

```ts
import { createContract } from "itty-spec";
import { z } from "zod";

export const contract = createContract({
  getCalculate: {
    path: "/calculate",
    method: "GET",
    query: z.object({
      a: z.string().transform(Number).pipe(z.number().min(0).max(100)),
      b: z.string().transform(Number).pipe(z.number().min(0).max(100)),
    }),
    headers: z.object({
      "Content-Type": z.union([
        z.literal("application/json"),
        z.literal("text/html"),
        z.literal("application/xml"),
      ]),
    }),
    responses: {
      200: {
        "application/json": { body: CalculateResponse },
        "text/html": { body: z.string() },
        "application/xml": { body: z.string() },
      },
      400: {
        "application/json": { body: CalculateError },
        "text/html": { body: z.string() },
        "application/xml": { body: z.string() },
      },
    },
  },
  postCalculate: {
    path: "/calculate",
    method: "POST",
    requests: {
      "application/json": { body: CalculatePostRequest },
    },
    responses: {
      200: { "application/json": { body: CalculateResponse } },
      400: { "application/json": { body: CalculateError } },
    },
  },
});
```

## Key Features

### 1. Type Inference

Path parameters, query parameters, and body are automatically typed:

```ts
const handler = async (request) => {
  // TypeScript knows the exact types!
  const { a, b } = request.validatedQuery; // { a: number; b: number }
  const result = a + b;
  // ...
};
```

### 2. Content Negotiation

The handler checks the `Content-Type` header to return the appropriate format:

```ts
const handler = async (request) => {
  const contentType = request.validatedHeaders.get("content-type");
  
  if (contentType === "text/html") {
    return request.respond({
      status: 200,
      contentType: "text/html",
      body: formatCalculateResponseHTML(result),
    });
  }
  
  if (contentType === "application/xml") {
    return request.respond({
      status: 200,
      contentType: "application/xml",
      body: formatCalculateResponseXML(result),
    });
  }
  
  // Default to JSON
  return request.respond({
    status: 200,
    contentType: "application/json",
    body: { result },
  });
};
```

### 3. Validation

Invalid requests are automatically rejected:

```ts
// Request: GET /calculate?a=150&b=50
// Response: 400 Bad Request
// {
//   "error": "Validation failed",
//   "details": [
//     {
//       "path": ["a"],
//       "message": "Number must be less than or equal to 100"
//     }
//   ]
// }
```

### 4. OpenAPI Integration

The example generates and serves an OpenAPI specification:

```ts
const openApiSpec = await createOpenApiSpecification(contract, {
  title: "Simple API",
  version: "1.0.0",
  description: "A simple calculation API",
});

// Serve as a route
const router = createRouter({
  contract: {
    ...contract,
    getSpec: {
      path: "/openapi.json",
      method: "GET",
      responses: {
        200: { "application/json": { body: z.any() } },
      },
    },
  },
  handlers: {
    ...handlers,
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

## Running the Example

```bash
cd examples/simple
npm install
npm run dev
```

The server will start on `http://localhost:3000`.

## Testing

### GET Request

```bash
# JSON response
curl "http://localhost:3000/calculate?a=10&b=20" \
  -H "Content-Type: application/json"

# HTML response
curl "http://localhost:3000/calculate?a=10&b=20" \
  -H "Content-Type: text/html"

# XML response
curl "http://localhost:3000/calculate?a=10&b=20" \
  -H "Content-Type: application/xml"
```

### POST Request

```bash
curl -X POST "http://localhost:3000/calculate" \
  -H "Content-Type: application/json" \
  -d '{"a": 10, "b": 20}'
```

### OpenAPI Spec

```bash
curl "http://localhost:3000/openapi.json"
```

## What to Learn

This example demonstrates:
- Basic contract definition
- Handler implementation
- Type inference in action
- Content negotiation
- OpenAPI generation

## Next Steps

- Check out the [Complex Example](/examples/complex) for more advanced patterns
- Read the [Contracts Guide](/guide/contracts) to learn more about contracts
- Explore [Content Types](/guide/content-types) for content negotiation

