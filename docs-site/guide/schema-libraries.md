# Schema Libraries

`itty-spec` uses the [Standard Schema V1](https://github.com/standard-schema/spec) interface, which provides a common abstraction layer for schema validation. This means you can use any Standard Schema V1 compatible library.

## Supported Libraries

### Zod (v4) - Recommended

Zod v4 is fully supported with excellent TypeScript inference and OpenAPI generation.

#### Installation

```bash
npm install zod@v4
```

#### Basic Usage

```ts
import { z } from "zod";
import { createContract } from "itty-spec";

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(18).optional(),
});

const contract = createContract({
  getUser: {
    path: "/users/:id",
    method: "GET",
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    responses: {
      200: {
        "application/json": { body: UserSchema },
      },
    },
  },
});
```

#### Zod Features

- Excellent TypeScript inference
- Rich validation methods
- Transform support
- Refinement support
- OpenAPI generation support

#### Example with Transforms

```ts
const QuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)),
  tags: z.string().transform(s => s.split(',')),
});
```

### Valibot

Valibot is fully supported with OpenAPI generation via `@standard-community/standard-openapi`.

#### Installation

```bash
npm install valibot
```

#### Basic Usage

```ts
import * as v from "valibot";
import { createContract } from "itty-spec";

const UserSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  name: v.pipe(v.string(), v.minLength(1)),
  email: v.pipe(v.string(), v.email()),
  age: v.optional(v.pipe(v.number(), v.minValue(18))),
});

const contract = createContract({
  getUser: {
    path: "/users/:id",
    method: "GET",
    pathParams: v.object({
      id: v.pipe(v.string(), v.uuid()),
    }),
    responses: {
      200: {
        "application/json": { body: UserSchema },
      },
    },
  },
});
```

#### Valibot Features

- Smaller bundle size than Zod
- Similar API to Zod
- OpenAPI generation support
- Good TypeScript inference

#### Example with Pipes

```ts
const QuerySchema = v.object({
  page: v.pipe(
    v.string(),
    v.transform(Number),
    v.number(),
    v.minValue(1)
  ),
  limit: v.pipe(
    v.string(),
    v.transform(Number),
    v.number(),
    v.minValue(1),
    v.maxValue(100)
  ),
});
```

## Standard Schema V1

Standard Schema V1 provides a common interface that all compatible libraries implement. This ensures:

- **Portability**: Switch between libraries without changing your contracts
- **Type Safety**: Consistent type inference across libraries
- **Runtime Validation**: Same validation behavior regardless of library

### Standard Schema Interface

All Standard Schema V1 compatible schemas implement:

```ts
interface StandardSchemaV1 {
  '~standard': {
    validate: (data: unknown) => Promise<ValidationResult>;
  };
}
```

## Choosing a Schema Library

### Use Zod if:

- You want the best TypeScript inference
- You need extensive validation features
- You prefer a more mature ecosystem
- Bundle size is not a primary concern

### Use Valibot if:

- Bundle size is critical
- You want similar features to Zod
- You're building for edge/serverless environments
- You prefer a more modular approach

## Migration Between Libraries

Since both libraries implement Standard Schema V1, you can migrate between them:

### From Zod to Valibot

```ts
// Before (Zod)
import { z } from "zod";

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
});

// After (Valibot)
import * as v from "valibot";

const UserSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  name: v.pipe(v.string(), v.minLength(1)),
  email: v.pipe(v.string(), v.email()),
});
```

### From Valibot to Zod

```ts
// Before (Valibot)
import * as v from "valibot";

const UserSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  name: v.pipe(v.string(), v.minLength(1)),
  email: v.pipe(v.string(), v.email()),
});

// After (Zod)
import { z } from "zod";

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
});
```

## Library-Specific Patterns

### Zod Patterns

#### Using Refinements

```ts
const PasswordSchema = z.string()
  .min(8)
  .refine(
    (val) => /[A-Z]/.test(val),
    { message: "Password must contain at least one uppercase letter" }
  )
  .refine(
    (val) => /[0-9]/.test(val),
    { message: "Password must contain at least one number" }
  );
```

#### Using Preprocess

```ts
const QuerySchema = z.preprocess(
  (val) => {
    if (typeof val === 'string') {
      return { page: val, limit: '10' };
    }
    return val;
  },
  z.object({
    page: z.string(),
    limit: z.string(),
  })
);
```

### Valibot Patterns

#### Using Pipes

```ts
const PasswordSchema = v.pipe(
  v.string(),
  v.minLength(8),
  v.custom((val) => /[A-Z]/.test(val), "Must contain uppercase"),
  v.custom((val) => /[0-9]/.test(val), "Must contain number")
);
```

#### Using Transform

```ts
const QuerySchema = v.object({
  page: v.pipe(
    v.string(),
    v.transform(Number),
    v.number(),
    v.minValue(1)
  ),
});
```

## OpenAPI Generation

Both Zod and Valibot support OpenAPI generation:

### Zod OpenAPI

Zod schemas are automatically converted to OpenAPI:

```ts
import { createOpenApiSpecification } from "itty-spec/openapi";

const spec = await createOpenApiSpecification(contract, {
  title: "My API",
  version: "1.0.0",
});
```

### Valibot OpenAPI

Valibot schemas are converted via `@standard-community/standard-openapi`:

```ts
import { createOpenApiSpecification } from "itty-spec/openapi";

// Works the same way
const spec = await createOpenApiSpecification(contract, {
  title: "My API",
  version: "1.0.0",
});
```

## Best Practices

### 1. Be Consistent

Use the same library throughout your project:

```ts
// ✅ Good - consistent
import { z } from "zod";
// Use Zod everywhere

// ❌ Bad - mixed
import { z } from "zod";
import * as v from "valibot";
// Using both libraries
```

### 2. Reuse Schemas

Define schemas once and reuse:

```ts
// ✅ Good
const UserSchema = z.object({ /* ... */ });

const contract = createContract({
  getUser: {
    // Uses UserSchema
    responses: { 200: { "application/json": { body: UserSchema } } },
  },
  createUser: {
    // Reuses UserSchema
    responses: { 201: { "application/json": { body: UserSchema } } },
  },
});
```

### 3. Use Type Inference

Let TypeScript infer types from schemas:

```ts
// ✅ Good
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

type User = z.infer<typeof UserSchema>;

// ❌ Bad - manually typing
type User = {
  id: string;
  name: string;
};
```

### 4. Validate Early

Define schemas for all inputs:

```ts
// ✅ Good - validates everything
const contract = createContract({
  getUser: {
    path: "/users/:id",
    pathParams: z.object({ id: z.string().uuid() }),
    query: z.object({ include: z.array(z.string()).optional() }),
    headers: z.object({ authorization: z.string() }),
    responses: { /* ... */ },
  },
});
```

## Related Topics

- [Contracts](/guide/contracts) - Learn about using schemas in contracts
- [Validation](/guide/validation) - Understand validation behavior
- [OpenAPI Integration](/guide/openapi) - Generate API documentation
- [Examples](/examples/valibot) - See Valibot examples

