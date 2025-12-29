# createContract

Creates a contract object that defines your API operations.

## Signature

```ts
function createContract<T extends ContractDefinition>(
  definition: T
): T
```

## Type Parameters

- `T` - The contract definition type (must extend `ContractDefinition`)

## Parameters

- `definition` - An object mapping operation IDs to contract operations

## Returns

The same contract definition with full type inference preserved.

## Example

```ts
import { createContract } from "itty-spec";
import { z } from "zod";

const contract = createContract({
  getUser: {
    path: "/users/:id",
    method: "GET",
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    responses: {
      200: {
        "application/json": {
          body: z.object({
            id: z.string().uuid(),
            name: z.string(),
            email: z.string().email(),
          }),
        },
      },
    },
  },
});
```

## Contract Operation Structure

Each operation in a contract can include:

### Required Fields

- `path` - Route pattern (e.g., `"/users/:id"`)
- `method` - HTTP method (`"GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS"`)
- `responses` - Response schemas keyed by status code and content type

### Optional Fields

- `operationId` - Unique identifier for the operation
- `summary` - Short description
- `description` - Detailed description (supports markdown)
- `title` - Display title
- `tags` - Array of tags for grouping
- `pathParams` - Schema for path parameters
- `query` - Schema for query parameters
- `headers` - Schema for request headers
- `requests` - Request body schemas keyed by content type

## Type Inference Tips

### Use `as const` for Path Parameters

For automatic path parameter extraction, use `as const`:

```ts
// ✅ Good - path params are extracted
const contract = createContract({
  getUser: {
    path: "/users/:id",  // TypeScript infers { id: string }
    method: "GET",
    responses: { /* ... */ },
  },
} as const);

// ⚠️ May not extract path params
const contract = createContract({
  getUser: {
    path: "/users/:id",
    method: "GET",
    responses: { /* ... */ },
  },
});
```

### Explicit Path Parameter Schemas

For validation beyond string types:

```ts
const contract = createContract({
  getUser: {
    path: "/users/:id",
    method: "GET",
    pathParams: z.object({
      id: z.string().uuid(),  // Validates UUID format
    }),
    responses: { /* ... */ },
  },
});
```

## Complete Example

```ts
import { createContract } from "itty-spec";
import { z } from "zod";

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
});

const CreateUserRequest = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

const contract = createContract({
  getUser: {
    operationId: "getUserById",
    summary: "Get user by ID",
    description: "Retrieves a user by their unique identifier",
    tags: ["Users"],
    path: "/users/:id",
    method: "GET",
    pathParams: z.object({
      id: z.string().uuid(),
    }),
    headers: z.object({
      authorization: z.string(),
    }),
    responses: {
      200: {
        "application/json": {
          body: UserSchema,
        },
      },
      404: {
        "application/json": {
          body: z.object({
            error: z.string(),
            message: z.string(),
          }),
        },
      },
    },
  },
  createUser: {
    operationId: "createUser",
    summary: "Create a new user",
    description: "Creates a new user account",
    tags: ["Users"],
    path: "/users",
    method: "POST",
    headers: z.object({
      authorization: z.string(),
      "content-type": z.literal("application/json"),
    }),
    requests: {
      "application/json": {
        body: CreateUserRequest,
      },
    },
    responses: {
      201: {
        "application/json": {
          body: UserSchema,
          headers: z.object({
            location: z.string().url(),
          }),
        },
      },
      400: {
        "application/json": {
          body: z.object({
            error: z.string(),
            details: z.array(z.unknown()),
          }),
        },
      },
    },
  },
} as const);
```

## Related

- [Contracts Guide](/guide/contracts) - Learn about contract definitions
- [Type Safety](/guide/type-safety) - Understand type inference
- [createRouter](/api/create-router) - Create a router from a contract

