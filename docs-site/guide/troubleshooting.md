# Troubleshooting

Common issues and solutions when working with `itty-spec`.

## Type Inference Issues

### Path Parameters Not Inferred

**Problem**: Path parameters are typed as `EmptyObject` instead of the actual parameter types.

**Solution**: Use `as const` when creating contracts:

```ts
// ✅ Good
const contract = createContract({
  getUser: {
    path: "/users/:id",
    method: "GET",
    responses: { /* ... */ },
  },
} as const);

// ❌ Bad - may not infer path params
const contract = createContract({
  getUser: {
    path: "/users/:id",
    method: "GET",
    responses: { /* ... */ },
  },
});
```

### Type Errors in Handlers

**Problem**: TypeScript errors when accessing request properties.

**Solution**: Ensure your handler receives the correct type:

```ts
// ✅ Good - TypeScript infers types
const handler = async (request) => {
  const { id } = request.validatedParams; // Typed correctly
};

// ⚠️ May need explicit type
const handler = async (request: ContractRequest<typeof contract.getUser>) => {
  const { id } = request.validatedParams;
};
```

## Validation Problems

### Validation Fails Unexpectedly

**Problem**: Valid requests are rejected with 400 errors.

**Solution**: Check your schemas match the actual data format:

```ts
// Check query parameter types
query: z.object({
  page: z.string().transform(Number).pipe(z.number()), // Query params are strings
  limit: z.number().default(10), // Or use defaults
})

// Check header normalization
headers: z.object({
  authorization: z.string(), // Headers are lowercase at runtime
})
```

### Missing Content-Type Error

**Problem**: Requests fail with "Content-Type header is required".

**Solution**: Ensure Content-Type header is set for POST/PUT requests:

```ts
// ✅ Good
fetch("/users", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ name: "John" }),
});

// ❌ Bad - missing Content-Type
fetch("/users", {
  method: "POST",
  body: JSON.stringify({ name: "John" }),
});
```

### Unsupported Content-Type

**Problem**: Error "Unsupported Content-Type: ...".

**Solution**: Ensure the Content-Type matches a defined request schema:

```ts
// Contract defines
requests: {
  "application/json": { body: UserSchema },
}

// Request must use
Content-Type: application/json
```

## Response Issues

### Type Error on Response

**Problem**: TypeScript error when returning response.

**Solution**: Ensure response matches contract:

```ts
// Contract defines
responses: {
  200: {
    "application/json": {
      body: z.object({ id: z.string(), name: z.string() }),
    },
  },
}

// ✅ Good
return request.respond({
  status: 200,
  contentType: "application/json",
  body: { id: "123", name: "John" },
});

// ❌ Bad - missing field
return request.respond({
  status: 200,
  contentType: "application/json",
  body: { id: "123" }, // Missing 'name'
});
```

### Wrong Status Code Error

**Problem**: TypeScript error when using status code not in contract.

**Solution**: Only use status codes defined in contract:

```ts
// Contract defines
responses: {
  200: { /* ... */ },
  404: { /* ... */ },
}

// ✅ Good
return request.respond({ status: 200, /* ... */ });
return request.respond({ status: 404, /* ... */ });

// ❌ Bad
return request.respond({ status: 500, /* ... */ }); // Not in contract
```

## Router Issues

### Routes Return 404

**Problem**: All routes return 404.

**Solution**: Check:
1. Contract paths match request paths
2. HTTP methods match
3. Handlers are provided for all operations

```ts
// ✅ Good
const contract = createContract({
  getUser: {
    path: "/users/:id", // Matches request
    method: "GET",      // Matches request
    responses: { /* ... */ },
  },
});

const router = createRouter({
  contract,
  handlers: {
    getUser: async (request) => { /* ... */ }, // Handler provided
  },
});
```

### Middleware Not Running

**Problem**: Custom middleware doesn't execute.

**Solution**: Ensure middleware is in the correct array:

```ts
// ✅ Good
const router = createRouter({
  contract,
  handlers,
  before: [myMiddleware],  // Runs before handler
  finally: [myMiddleware], // Runs after handler
});
```

## Performance Issues

### Slow Validation

**Problem**: Validation is slow.

**Solution**: 
1. Use efficient schemas
2. Avoid unnecessary transforms
3. Cache validation results if possible

```ts
// ✅ Good - efficient
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

### Large Bundle Size

**Problem**: Bundle size is too large.

**Solution**:
1. Use Valibot instead of Zod
2. Tree-shake unused code
3. Avoid heavy dependencies

```ts
// ✅ Good - tree-shake
import { createContract, createRouter } from "itty-spec";

// ❌ Bad - imports everything
import * as ittySpec from "itty-spec";
```

## OpenAPI Issues

### OpenAPI Spec Generation Fails

**Problem**: `createOpenApiSpecification` throws an error.

**Solution**: Check that all schemas are Standard Schema V1 compatible:

```ts
// ✅ Good - Standard Schema
import { z } from "zod";
const schema = z.object({ id: z.string() });

// ❌ Bad - not Standard Schema
const schema = { type: "object" }; // Plain object
```

### Missing Schemas in OpenAPI

**Problem**: Some schemas don't appear in OpenAPI spec.

**Solution**: Ensure schemas are used in contract operations:

```ts
// ✅ Good - schema used in contract
const contract = createContract({
  getUser: {
    responses: {
      200: { "application/json": { body: UserSchema } },
    },
  },
});

// ❌ Bad - schema defined but not used
const UserSchema = z.object({ /* ... */ });
// Not referenced in contract
```

## Common Errors

### "Validation failed"

This means request data doesn't match the contract schema. Check:
- Path parameters format
- Query parameters types
- Header values
- Body structure

### "Content-Type header is required"

Set the Content-Type header for POST/PUT requests:

```ts
headers: {
  "Content-Type": "application/json",
}
```

### "Unsupported Content-Type"

The Content-Type doesn't match any defined request schema. Either:
1. Add the content type to your contract
2. Use a supported content type

### "Route not found"

Check:
1. Path matches contract path pattern
2. HTTP method matches
3. Handler is provided for the operation

## Getting Help

If you're still experiencing issues:

1. Check the [FAQ](/guide/faq) for common questions
2. Review the [Examples](/examples/) for working code
3. Open an issue on GitHub with:
   - Error message
   - Code snippet
   - Expected vs actual behavior

## Related Topics

- [FAQ](/guide/faq) - Common questions
- [Validation](/guide/validation) - Understand validation
- [Type Safety](/guide/type-safety) - Type inference details

