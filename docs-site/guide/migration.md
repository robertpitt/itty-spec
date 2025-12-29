# Migration Guide

This guide helps you migrate to `itty-spec` from other frameworks or upgrade between versions.

## From itty-router

If you're already using `itty-router`, migrating to `itty-spec` is straightforward.

### Before (itty-router)

```ts
import { Router } from "itty-router";

const router = Router();

router.get("/users/:id", async (request) => {
  const { id } = request.params;
  const user = await getUser(id);
  return json(user);
});
```

### After (itty-spec)

```ts
import { createContract, createRouter } from "itty-spec";
import { z } from "zod";

const contract = createContract({
  getUser: {
    path: "/users/:id",
    method: "GET",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      200: {
        "application/json": { body: UserSchema },
      },
    },
  },
});

const router = createRouter({
  contract,
  handlers: {
    getUser: async (request) => {
      const { id } = request.validatedParams; // Typed!
      const user = await getUser(id);
      return request.respond({
        status: 200,
        contentType: "application/json",
        body: user, // Type-checked!
      });
    },
  },
});
```

### Key Differences

1. **Contracts**: Define your API structure upfront
2. **Validation**: Automatic validation of all inputs
3. **Type Safety**: Full TypeScript inference
4. **Response Helpers**: Use `request.respond()` instead of `json()`

## From Express/Fastify

### Before (Express)

```ts
import express from "express";

const app = express();
app.use(express.json());

app.get("/users/:id", async (req, res) => {
  const { id } = req.params;
  const user = await getUser(id);
  res.json(user);
});
```

### After (itty-spec)

```ts
import { createContract, createRouter } from "itty-spec";
import { createServerAdapter } from "@whatwg-node/server";
import { createServer } from "http";

const contract = createContract({
  getUser: {
    path: "/users/:id",
    method: "GET",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      200: {
        "application/json": { body: UserSchema },
      },
    },
  },
});

const router = createRouter({
  contract,
  handlers: {
    getUser: async (request) => {
      const { id } = request.validatedParams;
      const user = await getUser(id);
      return request.respond({
        status: 200,
        contentType: "application/json",
        body: user,
      });
    },
  },
});

const adapter = createServerAdapter(router.fetch);
const server = createServer(adapter);
server.listen(3000);
```

## From Hono

### Before (Hono)

```ts
import { Hono } from "hono";

const app = new Hono();

app.get("/users/:id", async (c) => {
  const id = c.req.param("id");
  const user = await getUser(id);
  return c.json(user);
});
```

### After (itty-spec)

```ts
import { createContract, createRouter } from "itty-spec";

const contract = createContract({
  getUser: {
    path: "/users/:id",
    method: "GET",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      200: {
        "application/json": { body: UserSchema },
      },
    },
  },
});

const router = createRouter({
  contract,
  handlers: {
    getUser: async (request) => {
      const { id } = request.validatedParams;
      const user = await getUser(id);
      return request.respond({
        status: 200,
        contentType: "application/json",
        body: user,
      });
    },
  },
});
```

## From tRPC

### Before (tRPC)

```ts
import { z } from "zod";
import { router, publicProcedure } from "./trpc";

export const appRouter = router({
  getUser: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      return await getUser(input.id);
    }),
});
```

### After (itty-spec)

```ts
import { createContract, createRouter } from "itty-spec";
import { z } from "zod";

const contract = createContract({
  getUser: {
    path: "/users/:id",
    method: "GET",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      200: {
        "application/json": { body: UserSchema },
      },
    },
  },
});

const router = createRouter({
  contract,
  handlers: {
    getUser: async (request) => {
      const { id } = request.validatedParams;
      return request.respond({
        status: 200,
        contentType: "application/json",
        body: await getUser(id),
      });
    },
  },
});
```

## Version Upgrades

### From 0.1.x to 0.2.x

#### Breaking Changes

1. **Response Format**: Responses now use `request.respond()` instead of returning objects directly

```ts
// Before
return { status: 200, body: user };

// After
return request.respond({
  status: 200,
  contentType: "application/json",
  body: user,
});
```

2. **Request Body**: Use `request.validatedBody` instead of `request.body`

```ts
// Before
const body = request.body;

// After
const body = request.validatedBody;
```

3. **Path Parameters**: Use `request.validatedParams` instead of `request.params`

```ts
// Before
const { id } = request.params;

// After
const { id } = request.validatedParams;
```

## Migration Checklist

- [ ] Install `itty-spec` and required dependencies
- [ ] Define contracts for all endpoints
- [ ] Convert handlers to use `request.respond()`
- [ ] Update path parameter access to `request.validatedParams`
- [ ] Update query parameter access to `request.validatedQuery`
- [ ] Update body access to `request.validatedBody`
- [ ] Update header access to `request.validatedHeaders`
- [ ] Test all endpoints
- [ ] Update error handling
- [ ] Generate OpenAPI spec
- [ ] Update deployment configuration

## Common Migration Issues

### Issue: Type Errors

**Problem**: TypeScript errors after migration

**Solution**: Ensure you're using `as const` for contracts:

```ts
const contract = createContract({
  getUser: {
    path: "/users/:id",
    // ...
  },
} as const);
```

### Issue: Validation Errors

**Problem**: Requests fail validation unexpectedly

**Solution**: Check that your schemas match your actual data:

```ts
// Ensure schemas match actual data
pathParams: z.object({
  id: z.string().uuid(), // Matches actual UUID format
})
```

### Issue: Missing Handlers

**Problem**: Routes return 404

**Solution**: Ensure all contract operations have corresponding handlers:

```ts
const router = createRouter({
  contract,
  handlers: {
    getUser: async (request) => { /* ... */ },
    // All operations must have handlers
  },
});
```

## Related Topics

- [Getting Started](/guide/getting-started) - Learn the basics
- [Contracts](/guide/contracts) - Understand contracts
- [Router Configuration](/guide/router-configuration) - Configure your router

