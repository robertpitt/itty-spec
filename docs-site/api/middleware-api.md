# Middleware API

Reference for built-in middleware and custom middleware patterns in `itty-spec`.

## Built-in Middleware

### withMatchingContractOperation

Finds and sets the matching contract operation from a contract.

**Type**: `RequestHandler<IRequest>`

**Usage**: Automatically included in router's `before` array.

**Purpose**: Matches incoming requests to contract operations based on method and path pattern.

```ts
import { withMatchingContractOperation } from "itty-spec/middleware";

// Automatically included, but can be used manually:
const middleware = withMatchingContractOperation(contract, basePath);
```

### withSpecValidation

Validates path params, query params, headers, and body against contract schemas.

**Type**: `RequestHandler<IRequest>`

**Usage**: Automatically included in router's `before` array.

**Purpose**: Validates all request data before handlers run.

```ts
import { withSpecValidation } from "itty-spec/middleware";

// Automatically included
```

### withResponseHelpers

Attaches typed `respond()` method to request object.

**Type**: `RequestHandler<IRequest>`

**Usage**: Automatically included in router's `before` array.

**Purpose**: Provides type-safe response helper method.

```ts
import { withResponseHelpers } from "itty-spec/middleware";

// Automatically included
// Makes request.respond() available in handlers
```

### withContractFormat

Formats contract response objects to Response objects.

**Type**: `ResponseHandler`

**Usage**: Automatically included in router's `finally` array.

**Purpose**: Converts contract response format to HTTP Response.

```ts
import { withContractFormat } from "itty-spec/middleware";

// Automatically included
// Can be customized:
const router = createRouter({
  contract,
  handlers,
  format: withContractFormat(customFormatter),
});
```

### withContractErrorHandler

Handles validation errors and other errors.

**Type**: `(err: unknown, request: RequestType, ...args: Args) => Response`

**Usage**: Automatically set as router's `catch` handler.

**Purpose**: Converts errors to appropriate HTTP responses.

```ts
import { withContractErrorHandler } from "itty-spec/middleware";

// Automatically included
// Can be customized:
const router = Router({
  catch: withContractErrorHandler(),
});
```

### withMissingHandler

Handles missing routes (404s).

**Type**: `ResponseHandler`

**Usage**: Automatically included in router's `finally` array.

**Purpose**: Returns 404 for unmatched routes.

```ts
import { withMissingHandler } from "itty-spec/middleware";

// Automatically included
// Can be customized:
const router = createRouter({
  contract,
  handlers,
  missing: async (request) => {
    return request.respond({
      status: 404,
      contentType: "application/json",
      body: { error: "Not Found" },
    });
  },
});
```

## Middleware Types

### RequestHandler

Type for before middleware.

```ts
type RequestHandler<
  RequestType extends IRequest = IRequest,
  Args extends any[] = any[]
> = (
  request: RequestType,
  ...args: Args
) => void | Promise<void> | Response | Promise<Response>
```

If a middleware returns a `Response`, it short-circuits the request.

### ResponseHandler

Type for finally middleware.

```ts
type ResponseHandler = (
  response: unknown,
  request: IRequest
) => Response | Promise<Response>
```

## Custom Middleware Patterns

### Authentication Middleware

```ts
async function withAuth(request: IRequest) {
  const authHeader = request.headers.get("authorization");
  
  if (!authHeader) {
    throw new Error("Unauthorized");
  }
  
  const user = await verifyToken(authHeader);
  (request as any).user = user;
}

const router = createRouter({
  contract,
  handlers,
  before: [withAuth],
});
```

### Logging Middleware

```ts
async function withLogging(request: IRequest) {
  const startTime = Date.now();
  (request as any).startTime = startTime;
  
  console.log(`${request.method} ${request.url}`);
}

const router = createRouter({
  contract,
  handlers,
  before: [withLogging],
  finally: [
    async (response, request) => {
      const startTime = (request as any).startTime;
      if (startTime) {
        const duration = Date.now() - startTime;
        console.log(`Duration: ${duration}ms`);
      }
      return response;
    },
  ],
});
```

### CORS Middleware

```ts
function withCORS(allowedOrigins: string[] = ["*"]) {
  return async (response: Response, request: IRequest) => {
    const origin = request.headers.get("origin");
    
    if (allowedOrigins.includes("*") || (origin && allowedOrigins.includes(origin))) {
      response.headers.set("access-control-allow-origin", origin || "*");
      response.headers.set("access-control-allow-methods", "GET, POST, PUT, DELETE");
      response.headers.set("access-control-allow-headers", "Content-Type, Authorization");
    }
    
    return response;
  };
}

const router = createRouter({
  contract,
  handlers,
  finally: [withCORS(["https://example.com"])],
});
```

### Rate Limiting Middleware

```ts
const rateLimiter = new Map<string, { count: number; resetAt: number }>();

function withRateLimit(maxRequests: number = 100, windowMs: number = 60000) {
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
}

const router = createRouter({
  contract,
  handlers,
  before: [withRateLimit(100, 60000)],
});
```

## Middleware Ordering

Middleware runs in the order specified:

```ts
const router = createRouter({
  contract,
  handlers,
  before: [
    middleware1,  // Runs first
    middleware2,  // Runs second
    middleware3,  // Runs third
  ],
  finally: [
    middleware4,  // Runs first (after handler)
    middleware5,  // Runs second
  ],
});
```

### Built-in Middleware Order

Built-in middleware always runs in a specific order:

**Before:**
1. `withParams`
2. `withMatchingContractOperation`
3. `withSpecValidation`
4. `withResponseHelpers`
5. Your custom `before` middleware

**Finally:**
1. `withMissingHandler`
2. `withContractFormat`
3. Your custom `finally` middleware

## Short-Circuiting

If a before middleware returns a `Response`, it short-circuits the request:

```ts
async function withAuth(request: IRequest) {
  const auth = request.headers.get("authorization");
  if (!auth) {
    // Short-circuit: return error immediately
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401 }
    );
  }
  // Continue to next middleware/handler
}
```

## Related

- [Middleware Guide](/guide/middleware) - Learn about middleware patterns
- [Router Configuration](/guide/router-configuration) - Configure middleware
- [Error Handling](/guide/error-handling) - Handle errors in middleware

