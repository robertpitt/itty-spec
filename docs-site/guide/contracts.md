# Contracts Deep Dive

Contracts are the foundation of `itty-spec`. They define your API's structure, validation rules, and type information in a single, declarative format.

## Contract Operation Structure

A contract operation defines a single API endpoint with all its inputs and outputs:

```ts
{
  operationId?: string;        // Optional operation identifier
  summary?: string;            // Short description
  description?: string;        // Detailed description
  title?: string;              // Operation title
  tags?: string[];             // Tags for grouping operations
  path: string;                // Route pattern (required)
  method: HttpMethod;          // HTTP method (required)
  pathParams?: Schema;        // Path parameter schema
  query?: Schema;             // Query parameter schema
  headers?: Schema;           // Header schema
  requests?: {                // Request body schemas
    [contentType: string]: {
      body: Schema;
    };
  };
  responses: {                // Response schemas (required)
    [statusCode: number]: {
      [contentType: string]: {
        body: Schema;
        headers?: Schema;
      };
    };
  };
}
```

## Path Parameters

Path parameters are extracted from URL patterns like `/users/:id` or `/posts/:postId/comments/:commentId`.

### Automatic Extraction

When you use a path pattern with `:param`, `itty-spec` automatically extracts and types the parameters:

```ts
const contract = createContract({
  getUser: {
    path: "/users/:id",  // Automatically extracts { id: string }
    method: "GET",
    responses: {
      200: {
        "application/json": { body: UserSchema },
      },
    },
  },
});

// In your handler:
const { id } = request.validatedParams; // { id: string }
```

**Important**: For automatic extraction to work with full type inference, use `as const`:

```ts
// ✅ Good - full type inference
const contract = createContract({
  getUser: {
    path: "/users/:id",
    // ...
  },
} as const);

// ⚠️ May work but type inference may be limited
const contract = createContract({
  getUser: {
    path: "/users/:id",
    // ...
  },
});
```

### Explicit Path Parameter Schemas

For validation beyond string types, provide an explicit `pathParams` schema:

```ts
const contract = createContract({
  getUser: {
    path: "/users/:id",
    method: "GET",
    pathParams: z.object({
      id: z.string().uuid(),  // Validate as UUID
    }),
    responses: {
      200: {
        "application/json": { body: UserSchema },
      },
    },
  },
});
```

### Multiple Path Parameters

Extract multiple parameters from complex paths:

```ts
const contract = createContract({
  getComment: {
    path: "/posts/:postId/comments/:commentId",
    method: "GET",
    // Automatically extracts { postId: string; commentId: string }
    responses: {
      200: {
        "application/json": { body: CommentSchema },
      },
    },
  },
});
```

## Query Parameters

Query parameters are parsed from the URL query string and validated against your schema.

### Basic Query Parameters

```ts
const contract = createContract({
  searchUsers: {
    path: "/users",
    method: "GET",
    query: z.object({
      q: z.string().min(1),           // Required
      limit: z.number().default(10),   // Optional with default
      offset: z.number().optional(),   // Optional
    }),
    responses: {
      200: {
        "application/json": { body: z.array(UserSchema) },
      },
    },
  },
});
```

### Query Parameter Types

Query parameters are always strings in URLs, but you can transform them:

```ts
query: z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)),
  tags: z.string().transform(s => s.split(',')), // "tag1,tag2" -> ["tag1", "tag2"]
  active: z.enum(['true', 'false']).transform(val => val === 'true'),
})
```

### Array Query Parameters

Handle array parameters (e.g., `?tags=tag1&tags=tag2`):

```ts
query: z.object({
  tags: z.array(z.string()).optional(),
  ids: z.array(z.string().uuid()),
})
```

## Headers

Headers are validated and normalized to lowercase keys for consistent access.

### Basic Header Validation

```ts
const contract = createContract({
  createUser: {
    path: "/users",
    method: "POST",
    headers: z.object({
      authorization: z.string(),
      "content-type": z.literal("application/json"),
      "x-api-key": z.string(),
    }),
    responses: {
      201: {
        "application/json": { body: UserSchema },
      },
    },
  },
});
```

### Typed Headers

Headers are automatically typed in your handlers:

```ts
// Headers are normalized to lowercase
const auth = request.validatedHeaders.get("authorization"); // string | null
const apiKey = request.validatedHeaders.get("x-api-key");   // string | null

// TypeScript provides autocomplete for known headers
request.validatedHeaders.set("authorization", "Bearer token");
```

### Header Normalization

All header keys are normalized to lowercase at runtime, regardless of how they're defined in your schema:

```ts
// Schema definition
headers: z.object({
  "Authorization": z.string(),      // Capital A
  "X-API-Key": z.string(),          // Mixed case
})

// Runtime access (always lowercase)
request.validatedHeaders.get("authorization");  // ✅ Works
request.validatedHeaders.get("x-api-key");      // ✅ Works
```

## Request Bodies

Request bodies are validated based on the `Content-Type` header and can support multiple content types.

### Single Content Type

```ts
const contract = createContract({
  createUser: {
    path: "/users",
    method: "POST",
    requests: {
      "application/json": {
        body: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
      },
    },
    responses: {
      201: {
        "application/json": { body: UserSchema },
      },
    },
    },
});
```

### Multiple Content Types

Support different request formats:

```ts
const contract = createContract({
  createUser: {
    path: "/users",
    method: "POST",
    requests: {
      "application/json": {
        body: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
      },
      "application/xml": {
        body: z.string(),  // XML as string
      },
    },
    responses: {
      201: {
        "application/json": { body: UserSchema },
      },
    },
  },
});

// In handler, validate body based on Content-Type
const contentType = request.headers.get("content-type");
if (contentType?.includes("json")) {
  const { name, email } = request.validatedBody; // Typed from JSON schema
}
```

## Responses

Responses define all possible status codes and content types your endpoint can return.

### Single Response

```ts
responses: {
  200: {
    "application/json": {
      body: z.object({
        users: z.array(UserSchema),
        total: z.number(),
      }),
    },
  },
}
```

### Multiple Status Codes

Define different responses for different scenarios:

```ts
responses: {
  200: {
    "application/json": {
      body: UserSchema,
    },
  },
  400: {
    "application/json": {
      body: z.object({ error: z.string() }),
    },
  },
  404: {
    "application/json": {
      body: z.object({ error: z.string() }),
    },
  },
}
```

### Multiple Content Types

Support content negotiation:

```ts
responses: {
  200: {
    "application/json": {
      body: UserSchema,
    },
    "text/html": {
      body: z.string(),  // HTML string
    },
    "application/xml": {
      body: z.string(),  // XML string
    },
  },
}
```

### Response Headers

Define response headers in your contract:

```ts
responses: {
  201: {
    "application/json": {
      body: UserSchema,
      headers: z.object({
        location: z.string().url(),
        "x-created-at": z.string(),
      }),
    },
  },
}

// In handler:
return request.respond({
  status: 201,
  contentType: "application/json",
  body: user,
  headers: {
    location: `/users/${user.id}`,
    "x-created-at": new Date().toISOString(),
  },
});
```

### Default Responses

When 200 is not present, you must provide a `default` response:

```ts
responses: {
  400: {
    "application/json": { body: ErrorSchema },
  },
  default: {  // Required when 200 is missing
    "application/json": { body: ErrorSchema },
  },
}
```

## Operation Metadata

Add metadata to improve documentation and OpenAPI generation:

```ts
const contract = createContract({
  getUser: {
    operationId: "getUserById",        // Unique identifier
    summary: "Get user by ID",         // Short description
    description: "Retrieves a user...", // Detailed description
    title: "Get User",                 // Display title
    tags: ["Users", "Public"],         // Grouping tags
    path: "/users/:id",
    method: "GET",
    responses: {
      200: {
        "application/json": { body: UserSchema },
      },
    },
  },
});
```

## Best Practices

### 1. Use Descriptive Operation IDs

```ts
// ✅ Good
operationId: "getUserById"
operationId: "createUserAccount"

// ❌ Bad
operationId: "get"
operationId: "create"
```

### 2. Reuse Schemas

```ts
// Define schemas once
const UserSchema = z.object({ /* ... */ });
const ErrorSchema = z.object({ error: z.string() });

// Reuse in contracts
const contract = createContract({
  getUser: {
    // ...
    responses: {
      200: { "application/json": { body: UserSchema } },
      404: { "application/json": { body: ErrorSchema } },
    },
  },
  createUser: {
    // ...
    responses: {
      201: { "application/json": { body: UserSchema } },
      400: { "application/json": { body: ErrorSchema } },
    },
  },
});
```

### 3. Use `as const` for Better Type Inference

```ts
// ✅ Good - full type inference
const contract = createContract({
  getUser: {
    path: "/users/:id",
    // ...
  },
} as const);
```

### 4. Validate Path Parameters Explicitly

For non-string path parameters, use explicit schemas:

```ts
// ✅ Good - validates UUID format
pathParams: z.object({
  id: z.string().uuid(),
})
```

### 5. Provide Defaults for Optional Query Parameters

```ts
// ✅ Good
query: z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
})
```

### 6. Use Tags for Organization

```ts
tags: ["Users", "Authentication"]  // Groups operations in OpenAPI docs
```

## Related Topics

- [Type Safety](/guide/type-safety) - Learn how types flow from contracts
- [Validation](/guide/validation) - Understand validation behavior
- [Router Configuration](/guide/router-configuration) - Configure your router
- [OpenAPI Integration](/guide/openapi) - Generate API documentation

