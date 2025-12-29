# createOpenApiSpecification

Generates an OpenAPI 3.1 specification from a contract definition.

## Signature

```ts
function createOpenApiSpecification(
  contract: ContractDefinition,
  options: OpenApiSpecificationOptions
): Promise<OpenAPIV3_1.Document>
```

## Parameters

### contract

**Type**: `ContractDefinition`

**Required**: Yes

The contract definition to generate OpenAPI spec from.

### options

**Type**: `OpenApiSpecificationOptions`

**Required**: Yes

Configuration options for the OpenAPI specification.

## Options

### options.title

**Type**: `string`

**Required**: Yes

The title of the API.

### options.version

**Type**: `string`

**Required**: No

**Default**: `"0.0.0"`

The version of the API.

### options.description

**Type**: `string`

**Required**: No

API description. Supports markdown.

### options.summary

**Type**: `string`

**Required**: No

Short summary of the API.

### options.termsOfService

**Type**: `string`

**Required**: No

URL to the terms of service.

### options.contact

**Type**: `{ name?: string; url?: string; email?: string }`

**Required**: No

Contact information for the API.

### options.license

**Type**: `{ identifier?: string; name?: string; url?: string }`

**Required**: No

License information for the API.

### options.servers

**Type**: `Array<{ url: string; description?: string }>`

**Required**: No

List of server URLs where the API is available.

### options.tags

**Type**: `Array<{ name: string; description?: string }>`

**Required**: No

Tags for grouping operations in the documentation.

## Returns

A Promise that resolves to an OpenAPI 3.1 Document.

## Example

```ts
import { createOpenApiSpecification } from "itty-spec/openapi";
import { contract } from "./contract";

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

## Schema Deduplication

The function automatically deduplicates schemas. If the same schema is used multiple times, it's defined once in `components.schemas` and referenced elsewhere via `$ref`.

## Schema Registry

Schemas are registered in a `SchemaRegistry` that:
- Deduplicates identical schemas
- Creates references for reused schemas
- Handles empty schemas
- Manages reference-only schemas

## Generated Structure

The generated OpenAPI spec includes:

- `openapi: "3.1.1"` - OpenAPI version
- `info` - API information from options
- `servers` - Server URLs from options
- `paths` - Paths generated from contract operations
- `components.schemas` - Reusable schema definitions

## Serving the Spec

Add the spec as a route in your router:

```ts
import { createRouter } from "itty-spec";
import { z } from "zod";

const openApiSpec = await createOpenApiSpecification(contract, options);

const router = createRouter({
  contract: {
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
  },
});
```

## Related

- [OpenAPI Integration Guide](/guide/openapi) - Learn about OpenAPI integration
- [createContract](/api/create-contract) - Create a contract
- [createRouter](/api/create-router) - Create a router

