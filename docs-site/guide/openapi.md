# OpenAPI Integration

`itty-spec` can automatically generate OpenAPI 3.1 specifications from your contracts, enabling automatic API documentation and tooling integration.

## Generating OpenAPI Specifications

Use `createOpenApiSpecification` to generate an OpenAPI spec from your contract:

```ts
import { createOpenApiSpecification } from "itty-spec/openapi";
import { contract } from "./contract";

const openApiSpec = await createOpenApiSpecification(contract, {
  title: "My API",
  version: "1.0.0",
  description: "A comprehensive API built with itty-spec",
  servers: [
    { url: "https://api.example.com", description: "Production" },
    { url: "https://staging-api.example.com", description: "Staging" },
  ],
});
```

## OpenAPI Options

The `createOpenApiSpecification` function accepts the following options:

```ts
type OpenApiSpecificationOptions = {
  title: string;                    // Required: API title
  description?: string;             // API description (supports markdown)
  summary?: string;                 // Short summary
  version?: string;                  // API version (default: "0.0.0")
  termsOfService?: string;          // Terms of service URL
  contact?: {                       // Contact information
    name?: string;
    url?: string;
    email?: string;
  };
  license?: {                       // License information
    identifier?: string;
    name?: string;
    url?: string;
  };
  servers?: Array<{                 // Server URLs
    url: string;
    description?: string;
  }>;
  tags?: Array<{                    // Operation tags
    name: string;
    description?: string;
  }>;
};
```

### Complete Example

```ts
const openApiSpec = await createOpenApiSpecification(contract, {
  title: "User Management API",
  version: "1.0.0",
  description: `
# User Management API

This API provides endpoints for managing users.

## Features

- User CRUD operations
- Authentication
- Role-based access control
  `,
  servers: [
    { url: "https://api.example.com", description: "Production" },
    { url: "https://staging-api.example.com", description: "Staging" },
  ],
  contact: {
    name: "API Support",
    email: "support@example.com",
    url: "https://example.com/support",
  },
  license: {
    identifier: "MIT",
    name: "MIT License",
    url: "https://opensource.org/licenses/MIT",
  },
  termsOfService: "https://example.com/terms",
  tags: [
    { name: "Users", description: "User management endpoints" },
    { name: "Authentication", description: "Authentication endpoints" },
  ],
});
```

## Serving OpenAPI Specifications

Add the OpenAPI spec as a route in your router:

```ts
import { createRouter } from "itty-spec";
import { createOpenApiSpecification } from "itty-spec/openapi";
import { z } from "zod";

// Generate the spec
const openApiSpec = await createOpenApiSpecification(contract, {
  title: "My API",
  version: "1.0.0",
});

// Add to contract
const extendedContract = {
  ...contract,
  getOpenApiSpec: {
    path: "/openapi.json",
    method: "GET",
    responses: {
      200: {
        "application/json": { body: z.any() },
      },
    },
  },
};

// Add handler
const router = createRouter({
  contract: extendedContract,
  handlers: {
    ...yourHandlers,
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

## Schema Deduplication

`itty-spec` automatically deduplicates schemas in the OpenAPI spec. If the same schema is used multiple times, it's defined once in `components.schemas` and referenced elsewhere:

```ts
// Contract uses UserSchema multiple times
const contract = createContract({
  getUser: {
    // Uses UserSchema
    responses: {
      200: { "application/json": { body: UserSchema } },
    },
  },
  createUser: {
    // Uses UserSchema again
    responses: {
      201: { "application/json": { body: UserSchema } },
    },
  },
});

// OpenAPI spec defines UserSchema once in components.schemas
// Both operations reference it via $ref
```

## Schema References

Schemas are automatically converted to OpenAPI format and referenced:

```ts
// Zod schema
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
});

// OpenAPI spec
{
  "components": {
    "schemas": {
      "UserSchema": {
        "type": "object",
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "name": { "type": "string" },
          "email": { "type": "string", "format": "email" }
        },
        "required": ["id", "name", "email"]
      }
    }
  }
}
```

## Operation Metadata

Operation metadata from your contract is included in the OpenAPI spec:

```ts
const contract = createContract({
  getUser: {
    operationId: "getUserById",
    summary: "Get user by ID",
    description: "Retrieves a user by their unique identifier",
    tags: ["Users"],
    path: "/users/:id",
    method: "GET",
    responses: { /* ... */ },
  },
});

// OpenAPI spec includes:
{
  "paths": {
    "/users/{id}": {
      "get": {
        "operationId": "getUserById",
        "summary": "Get user by ID",
        "description": "Retrieves a user by their unique identifier",
        "tags": ["Users"],
        // ...
      }
    }
  }
}
```

## Integration with Documentation Tools

### Swagger UI

Serve Swagger UI alongside your OpenAPI spec:

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
    getSwaggerUI: {
      path: "/docs",
      method: "GET",
      responses: {
        200: { "text/html": { body: z.string() } },
      },
    },
  },
  handlers: {
    ...yourHandlers,
    getOpenApiSpec: async (request) => {
      return request.respond({
        status: 200,
        contentType: "application/json",
        body: openApiSpec,
      });
    },
    getSwaggerUI: async (request) => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>API Documentation</title>
            <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
          </head>
          <body>
            <div id="swagger-ui"></div>
            <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
            <script>
              SwaggerUIBundle({
                url: '/openapi.json',
                dom_id: '#swagger-ui',
              });
            </script>
          </body>
        </html>
      `;
      return request.respond({
        status: 200,
        contentType: "text/html",
        body: html,
      });
    },
  },
});
```

### Redoc

Similar setup for Redoc:

```ts
getRedoc: async (request) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>API Documentation</title>
        <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
        <style>body { margin: 0; padding: 0; }</style>
      </head>
      <body>
        <redoc spec-url="/openapi.json"></redoc>
        <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
      </body>
    </html>
  `;
  return request.respond({
    status: 200,
    contentType: "text/html",
    body: html,
  });
},
```

### Elements (Stoplight)

Elements provides a modern API documentation experience:

```ts
getElements: async (request) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>API Documentation</title>
        <link rel="stylesheet" href="https://unpkg.com/@stoplight/elements/styles.min.css">
      </head>
      <body>
        <elements-api
          apiDescriptionUrl="/openapi.json"
          router="hash"
        />
        <script src="https://unpkg.com/@stoplight/elements/web-components.min.js"></script>
      </body>
    </html>
  `;
  return request.respond({
    status: 200,
    contentType: "text/html",
    body: html,
  });
},
```

## Customizing OpenAPI Output

The OpenAPI spec is generated automatically, but you can customize it by modifying the contract:

### Adding Examples

```ts
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
}).openapi({
  example: {
    id: "123e4567-e89b-12d3-a456-426614174000",
    name: "John Doe",
    email: "john@example.com",
  },
});
```

### Adding Descriptions

```ts
const UserSchema = z.object({
  id: z.string().uuid().describe("User unique identifier"),
  name: z.string().describe("User's full name"),
  email: z.string().email().describe("User's email address"),
});
```

## Best Practices

### 1. Keep Specs Up to Date

Generate the OpenAPI spec at build time or startup:

```ts
// Generate once at startup
const openApiSpec = await createOpenApiSpecification(contract, options);

// Serve from memory
const router = createRouter({
  contract: extendedContract,
  handlers: {
    getOpenApiSpec: async () => {
      return request.respond({
        status: 200,
        contentType: "application/json",
        body: openApiSpec,
      });
    },
  },
});
```

### 2. Use Descriptive Metadata

```ts
// ✅ Good
{
  summary: "Get user by ID",
  description: "Retrieves a user by their unique identifier. Returns 404 if user not found.",
  tags: ["Users"],
}

// ❌ Bad
{
  summary: "Get user",
  // Missing description and tags
}
```

### 3. Organize with Tags

```ts
tags: ["Users", "Public"]  // Groups operations in documentation
```

### 4. Provide Server URLs

```ts
servers: [
  { url: "https://api.example.com", description: "Production" },
  { url: "https://staging-api.example.com", description: "Staging" },
]
```

### 5. Include Contact Information

```ts
contact: {
  name: "API Support",
  email: "support@example.com",
  url: "https://example.com/support",
}
```

## Related Topics

- [Contracts](/guide/contracts) - Learn about contract definitions
- [Schema Libraries](/guide/schema-libraries) - Understand schema support
- [Examples](/examples/complex) - See OpenAPI integration examples

