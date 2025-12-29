# Advanced Patterns

This guide covers advanced patterns and techniques for building complex APIs with `itty-spec`.

## Multi-Domain Contracts

Organize large APIs by splitting contracts into domains:

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

// contracts/orders.contract.ts
export const ordersContract = createContract({
  getOrder: { /* ... */ },
  createOrder: { /* ... */ },
});

// contracts/index.ts
export const contract = {
  ...usersContract,
  ...productsContract,
  ...ordersContract,
};
```

## Contract Composition

Compose contracts from smaller pieces:

```ts
// contracts/base.contract.ts
export const baseContract = createContract({
  healthCheck: {
    path: "/health",
    method: "GET",
    responses: {
      200: {
        "application/json": {
          body: z.object({ status: z.literal("ok") }),
        },
      },
    },
  },
});

// contracts/api.contract.ts
export const apiContract = {
  ...baseContract,
  ...usersContract,
  ...productsContract,
};
```

## Conditional Responses

Handle different response types based on conditions:

```ts
const handler = async (request) => {
  const user = await getUser(request.validatedParams.id);
  
  if (!user) {
    return request.respond({
      status: 404,
      contentType: "application/json",
      body: { error: "User not found" },
    });
  }
  
  if (user.deleted) {
    return request.respond({
      status: 410,
      contentType: "application/json",
      body: { error: "User has been deleted" },
    });
  }
  
  return request.respond({
    status: 200,
    contentType: "application/json",
    body: user,
  });
};
```

## Dynamic Content Types

Select content type based on request headers:

```ts
const handler = async (request) => {
  const accept = request.headers.get("accept") || "application/json";
  const user = await getUser(request.validatedParams.id);
  
  if (accept.includes("text/html")) {
    return request.respond({
      status: 200,
      contentType: "text/html",
      body: renderUserPage(user),
    });
  }
  
  if (accept.includes("application/xml")) {
    return request.respond({
      status: 200,
      contentType: "application/xml",
      body: renderUserXML(user),
    });
  }
  
  // Default to JSON
  return request.respond({
    status: 200,
    contentType: "application/json",
    body: user,
  });
};
```

## File Uploads

Handle file uploads with multipart form data:

```ts
const contract = createContract({
  uploadFile: {
    path: "/files",
    method: "POST",
    requests: {
      "multipart/form-data": {
        body: z.object({
          file: z.instanceof(File),
          description: z.string().optional(),
        }),
      },
    },
    responses: {
      201: {
        "application/json": {
          body: z.object({
            id: z.string(),
            filename: z.string(),
            size: z.number(),
          }),
        },
      },
    },
  },
});

const handler = async (request) => {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const description = formData.get("description") as string;
  
  // Process file
  const fileId = await saveFile(file);
  
  return request.respond({
    status: 201,
    contentType: "application/json",
    body: {
      id: fileId,
      filename: file.name,
      size: file.size,
    },
  });
};
```

## Streaming Responses

Stream large responses:

```ts
const handler = async (request) => {
  const stream = new ReadableStream({
    async start(controller) {
      const data = await fetchLargeDataset();
      
      for (const item of data) {
        controller.enqueue(JSON.stringify(item) + "\n");
      }
      
      controller.close();
    },
  });
  
  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "application/x-ndjson",
    },
  });
};
```

## WebSocket Integration

While `itty-spec` is designed for HTTP, you can integrate WebSockets:

```ts
// Handle WebSocket upgrade
const router = createRouter({
  contract: {
    upgradeWebSocket: {
      path: "/ws",
      method: "GET",
      headers: z.object({
        upgrade: z.literal("websocket"),
      }),
      responses: {
        101: {
          "application/json": { body: z.any() },
        },
      },
    },
  },
  handlers: {
    upgradeWebSocket: async (request) => {
      // Handle WebSocket upgrade
      // This is environment-specific
      return new Response(null, { status: 101 });
    },
  },
});
```

## Request Context

Pass additional context to handlers:

```ts
type Context = {
  db: Database;
  logger: Logger;
  cache: Cache;
};

const router = createRouter<typeof contract, IRequest, [Context]>({
  contract,
  handlers: {
    getUser: async (request, context) => {
      context.logger.info("Fetching user", { id: request.validatedParams.id });
      
      const cached = await context.cache.get(request.validatedParams.id);
      if (cached) {
        return request.respond({
          status: 200,
          contentType: "application/json",
          body: cached,
        });
      }
      
      const user = await context.db.findUser(request.validatedParams.id);
      await context.cache.set(request.validatedParams.id, user);
      
      return request.respond({
        status: 200,
        contentType: "application/json",
        body: user,
      });
    },
  },
});

// Pass context when calling
router.fetch(request, { db, logger, cache });
```

## Middleware Chains

Create reusable middleware chains:

```ts
const authMiddleware = async (request: IRequest) => {
  const auth = request.headers.get("authorization");
  if (!auth) {
    throw new Error("Unauthorized");
  }
  (request as any).user = await getUserFromToken(auth);
};

const loggingMiddleware = async (request: IRequest) => {
  console.log(`${request.method} ${request.url}`);
};

const errorHandlingMiddleware = async (request: IRequest) => {
  try {
    // Your logic
  } catch (error) {
    // Handle error
    throw error;
  }
};

// Reuse across routers
const commonMiddleware = [
  loggingMiddleware,
  authMiddleware,
  errorHandlingMiddleware,
];

const router1 = createRouter({
  contract: contract1,
  handlers: handlers1,
  before: commonMiddleware,
});

const router2 = createRouter({
  contract: contract2,
  handlers: handlers2,
  before: commonMiddleware,
});
```

## Versioning

Version your API using base paths:

```ts
const v1Router = createRouter({
  contract: v1Contract,
  handlers: v1Handlers,
  base: "/api/v1",
});

const v2Router = createRouter({
  contract: v2Contract,
  handlers: v2Handlers,
  base: "/api/v2",
});

// Combine in main router
const mainRouter = Router();
mainRouter.all("/api/v1/*", v1Router.fetch);
mainRouter.all("/api/v2/*", v2Router.fetch);
```

## Database Transactions

Handle database transactions:

```ts
const handler = async (request) => {
  const transaction = await db.beginTransaction();
  
  try {
    const user = await transaction.createUser(request.validatedBody);
    await transaction.createUserProfile(user.id, request.validatedBody.profile);
    
    await transaction.commit();
    
    return request.respond({
      status: 201,
      contentType: "application/json",
      body: user,
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
```

## Caching Strategies

Implement caching:

```ts
const cache = new Map<string, { data: unknown; expires: number }>();

const handler = async (request) => {
  const cacheKey = `${request.method}:${request.url}`;
  const cached = cache.get(cacheKey);
  
  if (cached && cached.expires > Date.now()) {
    return request.respond({
      status: 200,
      contentType: "application/json",
      body: cached.data,
    });
  }
  
  const data = await fetchData();
  cache.set(cacheKey, {
    data,
    expires: Date.now() + 60000, // 1 minute
  });
  
  return request.respond({
    status: 200,
    contentType: "application/json",
    body: data,
  });
};
```

## Rate Limiting

Implement rate limiting:

```ts
const rateLimiter = new Map<string, { count: number; resetAt: number }>();

const withRateLimit = (maxRequests: number = 100, windowMs: number = 60000) => {
  return async (request: IRequest) => {
    const key = request.headers.get("x-forwarded-for") || "unknown";
    const now = Date.now();
    
    const limit = rateLimiter.get(key);
    
    if (limit && limit.resetAt > now) {
      if (limit.count >= maxRequests) {
        throw new Error("Rate limit exceeded");
      }
      limit.count++;
    } else {
      rateLimiter.set(key, { count: 1, resetAt: now + windowMs });
    }
  };
};

const router = createRouter({
  contract,
  handlers,
  before: [withRateLimit(100, 60000)],
});
```

## Related Topics

- [Best Practices](/guide/best-practices) - General best practices
- [Middleware](/guide/middleware) - Middleware patterns
- [Router Configuration](/guide/router-configuration) - Router setup

