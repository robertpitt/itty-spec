# Router Configuration

The `createRouter` function is the heart of `itty-spec`. It binds your contract to handlers and configures the request/response pipeline.

## Basic Usage

```ts
import { createRouter } from "itty-spec";

const router = createRouter({
  contract,
  handlers: {
    // Your handlers here
  },
});
```

## Complete Options Reference

```ts
createRouter<TContract, RequestType, Args>({
  contract: TContract,                    // Required: Your contract definition
  handlers: {                            // Required: Handlers for each operation
    [operationId: string]: HandlerFunction;
  },
  base?: string,                         // Optional: Base path for all routes
  missing?: HandlerFunction,            // Optional: Handler for unmatched routes
  before?: RequestHandler[],            // Optional: Middleware to run before handlers
  finally?: ResponseHandler[],          // Optional: Middleware to run after handlers
  format?: ResponseHandler,             // Optional: Custom response formatter
})
```

## Contract

The `contract` option is required and defines your API operations:

```ts
const router = createRouter({
  contract: myContract,
  handlers: { /* ... */ },
});
```

## Handlers

Handlers implement the business logic for each operation in your contract. Each handler receives a typed request object:

```ts
const router = createRouter({
  contract,
  handlers: {
    getUser: async (request) => {
      // request is fully typed based on the contract
      const { id } = request.validatedParams;
      // ...
    },
    createUser: async (request) => {
      const body = request.validatedBody;
      // ...
    },
  },
});
```

### Handler Type Signature

```ts
type HandlerFunction = (
  request: ContractRequest<Operation>,
  ...args: Args
) => Promise<ContractOperationResponse<Operation>>;
```

## Base Path

Use `base` to prefix all routes with a common path:

```ts
const router = createRouter({
  contract,
  handlers,
  base: "/api/v1",  // All routes are prefixed with /api/v1
});

// Contract path: "/users"
// Actual route: "/api/v1/users"
```

This is useful for:
- API versioning
- Mounting routers at specific paths
- Organizing routes by domain

## Missing Route Handler

The `missing` option defines what happens when no route matches:

```ts
const router = createRouter({
  contract,
  handlers,
  missing: async (request) => {
    return request.respond({
      status: 404,
      contentType: "application/json",
      body: {
        error: "Not Found",
        path: new URL(request.url).pathname,
      },
    });
  },
});
```

**Default**: Returns a 404 response with a JSON error message.

## Middleware

Middleware functions run at different stages of the request lifecycle.

### Before Middleware

`before` middleware runs after validation but before your handler:

```ts
const router = createRouter({
  contract,
  handlers,
  before: [
    // Logging middleware
    async (request) => {
      console.log(`${request.method} ${request.url}`);
    },
    // Authentication middleware
    async (request) => {
      const auth = request.headers.get("authorization");
      if (!auth) {
        throw new Error("Unauthorized");
      }
    },
  ],
});
```

**Built-in before middleware** (runs automatically):
1. `withParams` - Extracts path parameters
2. `withMatchingContractOperation` - Finds matching operation
3. `withSpecValidation` - Validates request data
4. `withResponseHelpers` - Adds `respond()` method

### Finally Middleware

`finally` middleware runs after your handler, before the response is sent:

```ts
const router = createRouter({
  contract,
  handlers,
  finally: [
    // Response timing middleware
    async (request, response) => {
      const duration = Date.now() - request.startTime;
      response.headers.set("x-response-time", `${duration}ms`);
      return response;
    },
    // CORS middleware
    async (request, response) => {
      response.headers.set("access-control-allow-origin", "*");
      return response;
    },
  ],
});
```

**Built-in finally middleware**:
1. `withMissingHandler` - Handles 404s
2. `withContractFormat` - Formats responses

## Custom Response Formatting

The `format` option allows you to customize how responses are formatted:

```ts
const router = createRouter({
  contract,
  handlers,
  format: async (request, response) => {
    // Custom formatting logic
    if (response.body && typeof response.body === 'object') {
      return new Response(
        JSON.stringify(response.body, null, 2),  // Pretty print
        {
          status: response.status,
          headers: response.headers,
        }
      );
    }
    return response;
  },
});
```

**Default**: Automatically formats responses based on content type and contract.

## Additional Handler Arguments

You can pass additional arguments to handlers using TypeScript generics:

```ts
type Context = {
  db: Database;
  logger: Logger;
};

const router = createRouter<typeof contract, IRequest, [Context]>({
  contract,
  handlers: {
    getUser: async (request, context) => {
      // context is typed as Context
      const user = await context.db.findUser(request.validatedParams.id);
      context.logger.info("User retrieved", { userId: user.id });
      // ...
    },
  },
});

// When calling router.fetch, pass context:
router.fetch(request, { db, logger });
```

This is useful for:
- Dependency injection
- Request context
- Shared services

## Advanced Patterns

### Multiple Routers

Combine multiple routers for different domains:

```ts
const userRouter = createRouter({
  contract: userContract,
  handlers: userHandlers,
  base: "/users",
});

const productRouter = createRouter({
  contract: productContract,
  handlers: productHandlers,
  base: "/products",
});

// Combine in main router
const mainRouter = Router();
mainRouter.all("/users/*", userRouter.fetch);
mainRouter.all("/products/*", productRouter.fetch);
```

### Conditional Middleware

Apply middleware conditionally:

```ts
const router = createRouter({
  contract,
  handlers,
  before: [
    ...(process.env.NODE_ENV === 'development' ? [loggingMiddleware] : []),
    authMiddleware,
  ],
});
```

### Error Handling

Customize error handling:

```ts
const router = createRouter({
  contract,
  handlers,
  // Error handling is built-in, but you can customize
  // by catching errors in middleware
  before: [
    async (request) => {
      try {
        // Your logic
      } catch (error) {
        // Custom error handling
        throw error;  // Re-throw to use default handler
      }
    },
  ],
});
```

## Type Parameters

`createRouter` accepts three type parameters:

```ts
createRouter<
  TContract extends ContractDefinition,  // Your contract type
  RequestType extends IRequest = IRequest, // Request type (default: IRequest)
  Args extends any[] = any[]               // Additional handler arguments
>(options)
```

### Custom Request Type

Extend the request type for additional properties:

```ts
interface AuthenticatedRequest extends IRequest {
  userId: string;
  userRole: string;
}

const router = createRouter<typeof contract, AuthenticatedRequest>({
  contract,
  handlers: {
    getUser: async (request) => {
      // request.userId and request.userRole are available
      const userId = request.userId;
      // ...
    },
  },
});
```

## Best Practices

### 1. Organize Handlers by Domain

```ts
// handlers/users.ts
export const userHandlers = {
  getUser: async (request) => { /* ... */ },
  createUser: async (request) => { /* ... */ },
};

// handlers/products.ts
export const productHandlers = {
  getProduct: async (request) => { /* ... */ },
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

### 2. Use Base Paths for Versioning

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
```

### 3. Keep Middleware Focused

```ts
// ✅ Good - single responsibility
const authMiddleware = async (request) => {
  // Only authentication logic
};

const loggingMiddleware = async (request) => {
  // Only logging logic
};

// ❌ Bad - mixed concerns
const authAndLoggingMiddleware = async (request) => {
  // Authentication AND logging
};
```

### 4. Handle Missing Routes Gracefully

```ts
missing: async (request) => {
  return request.respond({
    status: 404,
    contentType: "application/json",
    body: {
      error: "Not Found",
      message: `Route ${new URL(request.url).pathname} not found`,
      availableRoutes: ["/users", "/products"],
    },
  });
},
```

## Related Topics

- [Contracts](/guide/contracts) - Learn about contract definitions
- [Middleware](/guide/middleware) - Deep dive into middleware
- [Error Handling](/guide/error-handling) - Handle errors effectively
- [Validation](/guide/validation) - Understand validation flow

