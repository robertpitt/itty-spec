# Best Practices

This guide covers best practices for building APIs with `itty-spec`, from contract design to deployment.

## Contract Organization

### 1. Organize by Domain

Split contracts by domain or feature:

```ts
// contracts/users.contract.ts
export const usersContract = createContract({
  getUser: { /* ... */ },
  createUser: { /* ... */ },
});

// contracts/products.contract.ts
export const productsContract = createContract({
  getProduct: { /* ... */ },
  createProduct: { /* ... */ },
});

// contracts/index.ts
export const contract = {
  ...usersContract,
  ...productsContract,
};
```

### 2. Use Descriptive Operation IDs

```ts
// ✅ Good
operationId: "getUserById"
operationId: "createUserAccount"
operationId: "updateUserProfile"

// ❌ Bad
operationId: "get"
operationId: "create"
operationId: "update"
```

### 3. Provide Metadata

Always include summary, description, and tags:

```ts
const contract = createContract({
  getUser: {
    operationId: "getUserById",
    summary: "Get user by ID",
    description: "Retrieves a user by their unique identifier. Returns 404 if user not found.",
    tags: ["Users"],
    path: "/users/:id",
    method: "GET",
    responses: { /* ... */ },
  },
});
```

## Schema Reuse

### 1. Define Schemas Once

```ts
// schemas/user.ts
export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
});

export const CreateUserRequest = z.object({
  name: z.string(),
  email: z.string().email(),
});

// Use in contracts
import { UserSchema, CreateUserRequest } from "./schemas/user";

const contract = createContract({
  getUser: {
    responses: {
      200: { "application/json": { body: UserSchema } },
    },
  },
  createUser: {
    requests: {
      "application/json": { body: CreateUserRequest },
    },
    responses: {
      201: { "application/json": { body: UserSchema } },
    },
  },
});
```

### 2. Use Schema Composition

```ts
const BaseUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

const UserWithEmailSchema = BaseUserSchema.extend({
  email: z.string().email(),
});

const AdminUserSchema = UserWithEmailSchema.extend({
  role: z.literal("admin"),
  permissions: z.array(z.string()),
});
```

### 3. Create Common Schemas

```ts
// schemas/common.ts
export const ErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.array(z.unknown()).optional(),
});

export const PaginationQuery = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
});

export const PaginationResponse = z.object({
  data: z.array(z.unknown()),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
  }),
});
```

## Handler Organization

### 1. Group Handlers by Domain

```ts
// handlers/users.handlers.ts
export const userHandlers = {
  getUser: async (request) => { /* ... */ },
  createUser: async (request) => { /* ... */ },
  updateUser: async (request) => { /* ... */ },
  deleteUser: async (request) => { /* ... */ },
};

// handlers/products.handlers.ts
export const productHandlers = {
  getProduct: async (request) => { /* ... */ },
  createProduct: async (request) => { /* ... */ },
};

// index.ts
const router = createRouter({
  contract,
  handlers: {
    ...userHandlers,
    ...productHandlers,
  },
});
```

### 2. Keep Handlers Focused

```ts
// ✅ Good - single responsibility
const getUser = async (request) => {
  const { id } = request.validatedParams;
  const user = await db.findUser(id);
  
  if (!user) {
    return request.respond({
      status: 404,
      contentType: "application/json",
      body: { error: "User not found" },
    });
  }
  
  return request.respond({
    status: 200,
    contentType: "application/json",
    body: user,
  });
};

// ❌ Bad - mixed concerns
const getUser = async (request) => {
  // Authentication
  // Authorization
  // Business logic
  // Logging
  // Response formatting
};
```

### 3. Extract Business Logic

```ts
// services/user.service.ts
export class UserService {
  async findUser(id: string): Promise<User | null> {
    return await db.findUser(id);
  }
  
  async createUser(data: CreateUserData): Promise<User> {
    return await db.createUser(data);
  }
}

// handlers/users.handlers.ts
const userService = new UserService();

export const userHandlers = {
  getUser: async (request) => {
    const user = await userService.findUser(request.validatedParams.id);
    // ...
  },
};
```

## Error Handling Strategies

### 1. Define Error Responses in Contracts

```ts
responses: {
  200: { "application/json": { body: SuccessSchema } },
  400: { "application/json": { body: ErrorSchema } },
  401: { "application/json": { body: ErrorSchema } },
  404: { "application/json": { body: ErrorSchema } },
  500: { "application/json": { body: ErrorSchema } },
}
```

### 2. Use Consistent Error Format

```ts
// ✅ Good - consistent
{
  error: "Not Found",
  message: "User not found",
  details: [{ resource: "user", id: "123" }]
}

// ❌ Bad - inconsistent
{
  error: "Not Found"
}
// vs
{
  message: "User not found"
}
```

### 3. Handle Errors Gracefully

```ts
const handler = async (request) => {
  try {
    const user = await getUser(request.validatedParams.id);
    return request.respond({
      status: 200,
      contentType: "application/json",
      body: user,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return request.respond({
        status: 404,
        contentType: "application/json",
        body: { error: "Not Found" },
      });
    }
    throw error; // Let error handler deal with it
  }
};
```

## Testing Strategies

### 1. Test Contracts

```ts
import { test, expect } from "vitest";
import { createContract } from "itty-spec";

test("contract is valid", () => {
  const contract = createContract({
    getUser: {
      path: "/users/:id",
      method: "GET",
      responses: {
        200: { "application/json": { body: z.object({ id: z.string() }) } },
      },
    },
  });
  
  expect(contract).toBeDefined();
});
```

### 2. Test Handlers

```ts
import { test, expect } from "vitest";
import { createRouter } from "itty-spec";

test("getUser handler returns user", async () => {
  const router = createRouter({
    contract,
    handlers: {
      getUser: async (request) => {
        return request.respond({
          status: 200,
          contentType: "application/json",
          body: { id: "123", name: "John" },
        });
      },
    },
  });
  
  const response = await router.fetch(
    new Request("http://localhost/users/123")
  );
  
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.id).toBe("123");
});
```

### 3. Test Validation

```ts
test("validation rejects invalid input", async () => {
  const router = createRouter({
    contract: {
      createUser: {
        path: "/users",
        method: "POST",
        requests: {
          "application/json": {
            body: z.object({
              email: z.string().email(),
            }),
          },
        },
        responses: {
          201: { "application/json": { body: z.object({ id: z.string() }) } },
        },
      },
    },
    handlers: { /* ... */ },
  });
  
  const response = await router.fetch(
    new Request("http://localhost/users", {
      method: "POST",
      body: JSON.stringify({ email: "not-an-email" }),
      headers: { "content-type": "application/json" },
    })
  );
  
  expect(response.status).toBe(400);
});
```

## Performance Considerations

### 1. Generate OpenAPI Spec Once

```ts
// ✅ Good - generate once at startup
const openApiSpec = await createOpenApiSpecification(contract, options);

// ❌ Bad - generate on every request
const handler = async (request) => {
  const spec = await createOpenApiSpecification(contract, options);
  // ...
};
```

### 2. Cache Validated Data

```ts
// If validation is expensive, cache results
const cache = new Map();

const handler = async (request) => {
  const cacheKey = `${request.method}:${request.url}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  const result = await expensiveOperation();
  cache.set(cacheKey, result);
  return result;
};
```

### 3. Use Efficient Schemas

```ts
// ✅ Good - efficient validation
const schema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

// ❌ Bad - unnecessary transforms
const schema = z.object({
  id: z.string().transform(uuid).pipe(z.string().uuid()),
  name: z.string().transform(trim).pipe(z.string()),
});
```

## Bundle Size Optimization

### 1. Tree-Shake Unused Code

```ts
// ✅ Good - import only what you need
import { createContract, createRouter } from "itty-spec";

// ❌ Bad - import everything
import * as ittySpec from "itty-spec";
```

### 2. Use Valibot for Smaller Bundles

```ts
// Valibot is smaller than Zod
import * as v from "valibot";
```

### 3. Avoid Heavy Dependencies

```ts
// ✅ Good - lightweight
import { z } from "zod";

// ❌ Bad - heavy
import { z } from "zod";
import heavyLibrary from "heavy-library";
```

## Security Best Practices

### 1. Validate All Inputs

```ts
// ✅ Good - validates everything
const contract = createContract({
  createUser: {
    pathParams: z.object({ id: z.string().uuid() }),
    query: z.object({ include: z.array(z.string()) }),
    headers: z.object({ authorization: z.string() }),
    requests: {
      "application/json": { body: CreateUserSchema },
    },
    responses: { /* ... */ },
  },
});
```

### 2. Sanitize Outputs

```ts
const handler = async (request) => {
  const user = await getUser(request.validatedParams.id);
  
  // Remove sensitive data
  const { password, ...safeUser } = user;
  
  return request.respond({
    status: 200,
    contentType: "application/json",
    body: safeUser,
  });
};
```

### 3. Use HTTPS

Always use HTTPS in production:

```ts
// Ensure your deployment uses HTTPS
// Cloudflare Workers: Automatic
// Node.js: Use reverse proxy (nginx, etc.)
```

## Related Topics

- [Contracts](/guide/contracts) - Learn about contract design
- [Router Configuration](/guide/router-configuration) - Configure your router
- [Error Handling](/guide/error-handling) - Handle errors effectively
- [Advanced Patterns](/guide/advanced-patterns) - Advanced techniques

