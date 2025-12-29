# FAQ

Frequently asked questions about `itty-spec`.

## General Questions

### What is itty-spec?

`itty-spec` is a contract-first, type-safe API framework built on top of `itty-router`. It provides automatic validation, type inference, and OpenAPI generation.

### Why use itty-spec?

- **Type Safety**: End-to-end TypeScript inference from contract to handler
- **Validation**: Automatic request validation before handlers run
- **Documentation**: Generate OpenAPI specs from your contracts
- **Lightweight**: Minimal bundle size, perfect for edge/serverless

### How does itty-spec differ from itty-router?

`itty-router` is a minimal router. `itty-spec` adds:
- Contract-based routing
- Automatic validation
- Type inference
- OpenAPI generation

### Is itty-spec production-ready?

Yes! `itty-spec` is used in production and actively maintained.

## Contract Questions

### Do I need to define contracts for all endpoints?

Yes, contracts are required. They serve as the single source of truth for your API.

### Can I use contracts without handlers?

No, every operation in your contract needs a corresponding handler.

### Can I have multiple contracts?

Yes, you can split contracts by domain and combine them:

```ts
const contract = {
  ...usersContract,
  ...productsContract,
};
```

### How do I handle optional fields?

Use `.optional()` or `.default()` in your schemas:

```ts
query: z.object({
  page: z.number().optional(),
  limit: z.number().default(10),
})
```

## Type Safety Questions

### Why are my path parameters typed as `EmptyObject`?

Use `as const` when creating contracts:

```ts
const contract = createContract({
  getUser: {
    path: "/users/:id",
    // ...
  },
} as const);
```

### How do I access typed request data?

Use the validated properties:

```ts
const { id } = request.validatedParams;
const { page } = request.validatedQuery;
const body = request.validatedBody;
const auth = request.validatedHeaders.get("authorization");
```

### Can I extend the request type?

Yes, use TypeScript generics:

```ts
interface AuthenticatedRequest extends IRequest {
  user: User;
}

const router = createRouter<typeof contract, AuthenticatedRequest>({
  // ...
});
```

## Validation Questions

### What happens if validation fails?

Validation errors return a 400 Bad Request with details:

```json
{
  "error": "Validation failed",
  "details": [...]
}
```

### Can I customize validation errors?

Yes, use custom error handling:

```ts
const router = Router({
  catch: (error, request) => {
    // Custom error handling
  },
});
```

### How do I validate complex data?

Use Zod refinements or Valibot pipes:

```ts
const schema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  { message: "Passwords don't match" }
);
```

## Response Questions

### How do I return different status codes?

Define them in your contract and use `request.respond()`:

```ts
responses: {
  200: { "application/json": { body: SuccessSchema } },
  404: { "application/json": { body: ErrorSchema } },
}

return request.respond({
  status: 404,
  contentType: "application/json",
  body: { error: "Not found" },
});
```

### Can I return HTML responses?

Yes, define HTML content type in your contract:

```ts
responses: {
  200: {
    "text/html": { body: z.string() },
  },
}

return request.respond({
  status: 200,
  contentType: "text/html",
  body: "<html>...</html>",
});
```

### How do I set response headers?

Define headers in your contract and include them in the response:

```ts
responses: {
  201: {
    "application/json": {
      body: UserSchema,
      headers: z.object({
        location: z.string().url(),
      }),
    },
  },
}

return request.respond({
  status: 201,
  contentType: "application/json",
  body: user,
  headers: {
    location: `/users/${user.id}`,
  },
});
```

## Middleware Questions

### How do I add authentication?

Use before middleware:

```ts
const router = createRouter({
  contract,
  handlers,
  before: [
    async (request) => {
      const auth = request.headers.get("authorization");
      if (!auth) {
        throw new Error("Unauthorized");
      }
      // Attach user to request
    },
  ],
});
```

### Can I use Express middleware?

No, `itty-spec` uses Fetch API middleware. You'll need to adapt Express middleware or write new middleware.

### How do I handle CORS?

Use finally middleware:

```ts
const router = createRouter({
  contract,
  handlers,
  finally: [
    async (response, request) => {
      response.headers.set("access-control-allow-origin", "*");
      return response;
    },
  ],
});
```

## OpenAPI Questions

### How do I generate OpenAPI specs?

Use `createOpenApiSpecification`:

```ts
import { createOpenApiSpecification } from "itty-spec/openapi";

const spec = await createOpenApiSpecification(contract, {
  title: "My API",
  version: "1.0.0",
});
```

### Can I customize the OpenAPI spec?

The spec is generated from your contract. Customize it by:
- Adding metadata to operations
- Using schema descriptions
- Organizing with tags

### How do I serve the OpenAPI spec?

Add it as a route:

```ts
const router = createRouter({
  contract: {
    ...contract,
    getOpenApiSpec: {
      path: "/openapi.json",
      method: "GET",
      responses: {
        200: { "application/json": { body: z.any() } },
      },
    },
  },
  handlers: {
    ...handlers,
    getOpenApiSpec: async (request) => {
      return request.respond({
        status: 200,
        contentType: "application/json",
        body: openApiSpec,
      });
    },
  },
});
```

## Schema Library Questions

### Which schema library should I use?

- **Zod**: Best TypeScript inference, mature ecosystem
- **Valibot**: Smaller bundle size, similar features

### Can I use both Zod and Valibot?

Technically yes, but it's not recommended. Stick to one library for consistency.

### How do I migrate between libraries?

Since both implement Standard Schema V1, you can migrate by updating schema definitions. See the [Schema Libraries](/guide/schema-libraries) guide.

## Performance Questions

### Is itty-spec fast?

Yes! `itty-spec` is designed for performance:
- Minimal overhead
- Efficient validation
- Small bundle size

### How do I optimize bundle size?

1. Use Valibot instead of Zod
2. Tree-shake unused code
3. Avoid heavy dependencies

### Can I cache validation results?

Validation happens per request. If you need caching, implement it in your handlers.

## Deployment Questions

### Can I use itty-spec with Cloudflare Workers?

Yes! `itty-spec` works perfectly with Cloudflare Workers:

```ts
export default {
  fetch: router.fetch,
};
```

### Can I use itty-spec with AWS Lambda?

Yes, with a Fetch adapter:

```ts
import { createServerAdapter } from "@whatwg-node/server";

const adapter = createServerAdapter(router.fetch);
export const handler = adapter;
```

### Can I use itty-spec with Node.js?

Yes, use `@whatwg-node/server`:

```ts
import { createServerAdapter } from "@whatwg-node/server";
import { createServer } from "http";

const adapter = createServerAdapter(router.fetch);
const server = createServer(adapter);
server.listen(3000);
```

## Related Topics

- [Getting Started](/guide/getting-started) - Learn the basics
- [Troubleshooting](/guide/troubleshooting) - Common issues
- [Examples](/examples/) - Working examples

