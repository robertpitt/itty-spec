# Valibot Example

An example using Valibot instead of Zod for schema validation.

## Overview

This example demonstrates:
- Using Valibot schemas in contracts
- Valibot-specific patterns
- OpenAPI generation with Valibot
- Differences from Zod

## Valibot vs Zod

### Similarities

Both libraries:
- Support Standard Schema V1
- Provide type inference
- Support OpenAPI generation
- Have similar APIs

### Differences

**Valibot:**
- Smaller bundle size
- More modular API
- Uses pipes for transformations

**Zod:**
- More mature ecosystem
- Slightly better TypeScript inference
- Method chaining API

## Contract Definition

```ts
import { createContract } from "itty-spec";
import * as v from "valibot";

const CalculateRequest = v.pipe(
  v.object({
    a: v.pipe(
      v.string(),
      v.toNumber(),
      v.minValue(0),
      v.maxValue(100),
      v.title("Left Operand"),
      v.description("The left operand for the calculation")
    ),
    b: v.pipe(
      v.string(),
      v.toNumber(),
      v.minValue(0),
      v.maxValue(100),
      v.title("Right Operand"),
      v.description("The right operand for the calculation")
    ),
  }),
  v.title("Calculate Request"),
  v.description("The request to calculate the sum of two numbers")
);

export const contract = createContract({
  getCalculate: {
    path: "/calculate",
    method: "GET",
    query: CalculateRequest,
    responses: {
      200: {
        "application/json": {
          body: v.pipe(
            v.object({
              result: v.pipe(
                v.number(),
                v.title("Result"),
                v.description("The result of the calculation")
              ),
            }),
            v.title("Calculate Response")
          ),
        },
      },
    },
  },
});
```

## Key Patterns

### Using Pipes

Valibot uses pipes for transformations:

```ts
const schema = v.pipe(
  v.string(),
  v.toNumber(),
  v.minValue(0),
  v.maxValue(100)
);
```

### Object Schemas

```ts
const UserSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  name: v.pipe(v.string(), v.minLength(1)),
  email: v.pipe(v.string(), v.email()),
});
```

### Optional Fields

```ts
const schema = v.object({
  name: v.string(),
  email: v.optional(v.pipe(v.string(), v.email())),
  age: v.optional(v.pipe(v.number(), v.minValue(18))),
});
```

## Handler Implementation

Handlers work the same way as with Zod:

```ts
const handler = async (request) => {
  // Type inference works the same
  const { a, b } = request.validatedQuery; // { a: number; b: number }
  const result = a + b;
  
  return request.respond({
    status: 200,
    contentType: "application/json",
    body: { result },
  });
};
```

## OpenAPI Generation

OpenAPI generation works the same:

```ts
import { createOpenApiSpecification } from "itty-spec/openapi";

const openApiSpec = await createOpenApiSpecification(contract, {
  title: "Valibot API",
  version: "1.0.0",
  description: "API using Valibot schemas",
});
```

## Migration from Zod

If migrating from Zod to Valibot:

### Before (Zod)

```ts
import { z } from "zod";

const schema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
});
```

### After (Valibot)

```ts
import * as v from "valibot";

const schema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  name: v.pipe(v.string(), v.minLength(1)),
  email: v.pipe(v.string(), v.email()),
});
```

## Running the Example

```bash
cd examples/valibot
npm install
npm run dev
```

## What to Learn

This example demonstrates:
- Valibot schema definitions
- Pipe-based transformations
- Type inference with Valibot
- OpenAPI generation
- Migration patterns

## Related

- [Schema Libraries Guide](/guide/schema-libraries) - Learn about schema library support
- [Simple Example](/examples/simple) - Compare with Zod example

