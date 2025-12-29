# createRouter

Creates a type-safe router from a contract definition with automatic route registration and validation.

## Signature

```ts
function createRouter<
  TContract extends ContractDefinition,
  RequestType extends IRequest = IRequest,
  Args extends any[] = any[]
>(
  options: ContractRouterOptions<TContract, RequestType, Args>
): RouterType<RequestType, Args, Response>
```

## Type Parameters

- `TContract` - The contract definition type
- `RequestType` - The request type (default: `IRequest`)
- `Args` - Additional arguments passed to handlers (default: `any[]`)

## Parameters

### options.contract

**Type**: `TContract`

**Required**: Yes

The contract definition mapping operation IDs to operations.

### options.handlers

**Type**: `{ [K in keyof TContract]?: ContractOperationHandler<TContract[K], Args> }`

**Required**: Yes

Handlers for each operation in the contract. Each handler receives a typed request object.

### options.base

**Type**: `string | undefined`

**Required**: No

Base path to prefix all routes. Useful for API versioning or mounting routers.

### options.missing

**Type**: `(request: RequestType & { respond: ... }, ...args: Args) => Response | Promise<Response>`

**Required**: No

Handler for unmatched routes. Defaults to returning a 404 response.

### options.before

**Type**: `RequestHandler<RequestType, Args>[]`

**Required**: No

Middleware to run before handlers. Runs after built-in validation middleware.

### options.finally

**Type**: `ResponseHandler[]`

**Required**: No

Middleware to run after handlers. Runs before response formatting.

### options.format

**Type**: `ResponseHandler`

**Required**: No

Custom response formatter. Defaults to contract-aware JSON formatter.

## Returns

An itty-router instance with registered routes and middleware.

## Example

```ts
import { createRouter } from "itty-spec";
import { contract } from "./contract";

const router = createRouter({
  contract,
  handlers: {
    getUser: async (request) => {
      const { id } = request.validatedParams;
      const user = await getUserById(id);
      
      return request.respond({
        status: 200,
        contentType: "application/json",
        body: user,
      });
    },
    createUser: async (request) => {
      const body = request.validatedBody;
      const user = await createUser(body);
      
      return request.respond({
        status: 201,
        contentType: "application/json",
        body: user,
      });
    },
  },
});
```

## Advanced Usage

### Custom Request Type

```ts
interface AuthenticatedRequest extends IRequest {
  user: User;
}

const router = createRouter<typeof contract, AuthenticatedRequest>({
  contract,
  handlers: {
    getUser: async (request) => {
      // request.user is available
      const user = request.user;
      // ...
    },
  },
});
```

### Additional Handler Arguments

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
      context.logger.info("Fetching user");
      const user = await context.db.findUser(request.validatedParams.id);
      // ...
    },
  },
});

// Pass context when calling
router.fetch(request, { db, logger });
```

### Base Path

```ts
const router = createRouter({
  contract,
  handlers,
  base: "/api/v1",  // All routes prefixed with /api/v1
});

// Contract path: "/users"
// Actual route: "/api/v1/users"
```

### Custom Middleware

```ts
const router = createRouter({
  contract,
  handlers,
  before: [
    async (request) => {
      console.log(`${request.method} ${request.url}`);
    },
    async (request) => {
      const auth = request.headers.get("authorization");
      if (!auth) {
        throw new Error("Unauthorized");
      }
    },
  ],
  finally: [
    async (response, request) => {
      response.headers.set("access-control-allow-origin", "*");
      return response;
    },
  ],
});
```

### Custom Missing Handler

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

## Built-in Middleware

The router automatically includes these middleware:

### Before Middleware (in order)

1. `withParams` - Extracts path parameters
2. `withMatchingContractOperation` - Finds matching operation
3. `withSpecValidation` - Validates request data
4. `withResponseHelpers` - Attaches `respond()` method

### Finally Middleware (in order)

1. `withMissingHandler` - Handles 404s
2. `withContractFormat` - Formats responses

## Related

- [Router Configuration Guide](/guide/router-configuration) - Learn about router options
- [Middleware Guide](/guide/middleware) - Understand middleware
- [createContract](/api/create-contract) - Create a contract

