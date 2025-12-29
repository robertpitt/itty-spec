# Complex Example

A comprehensive example demonstrating advanced patterns and best practices.

## Overview

This example showcases a production-ready API with:
- Multi-domain contract organization
- Authentication middleware
- Pagination and filtering
- Database integration patterns
- Comprehensive error handling
- OpenAPI documentation

## Project Structure

```
complex/
├── contracts/          # Contract definitions by domain
│   ├── users.contract.ts
│   ├── products.contract.ts
│   ├── orders.contract.ts
│   └── index.ts
├── schemas/            # Reusable schemas
│   ├── common.ts
│   ├── users.ts
│   ├── products.ts
│   └── orders.ts
├── handlers/            # Request handlers by domain
│   ├── users.handlers.ts
│   ├── products.handlers.ts
│   └── orders.handlers.ts
├── middleware/         # Custom middleware
│   └── auth.middleware.ts
├── utils/              # Utilities
│   ├── database.ts
│   ├── pagination.ts
│   ├── auth.ts
│   └── docs.ts
└── index.ts            # Main entry point
```

## Domain Organization

### Contracts by Domain

Each domain has its own contract file:

```ts
// contracts/users.contract.ts
export const usersContract = createContract({
  getUsers: { /* ... */ },
  getUserById: { /* ... */ },
  createUser: { /* ... */ },
  updateUser: { /* ... */ },
  deleteUser: { /* ... */ },
});

// contracts/index.ts
export const contract = {
  ...usersContract,
  ...productsContract,
  ...ordersContract,
};
```

### Schema Reuse

Schemas are defined once and reused:

```ts
// schemas/common.ts
export const PaginationQuery = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
});

export const ErrorResponse = z.object({
  error: z.string(),
  message: z.string(),
});

// Used in contracts
import { PaginationQuery, ErrorResponse } from "./schemas/common";
```

## Authentication Middleware

The example includes authentication middleware:

```ts
// middleware/auth.middleware.ts
export function withAuth(request: AuthenticatedRequest): void {
  const authHeader = request.headers.get("authorization");
  const userId = extractUserIdFromAuth(authHeader);
  
  if (!userId) {
    return; // Let handler decide
  }
  
  const user = userDb.findById(userId);
  if (user) {
    request.userId = user.id;
    request.userRole = user.role;
  }
}

// Applied to all routes
const router = createRouter({
  contract,
  before: [withAuth],
  handlers: { /* ... */ },
});
```

## Pagination

The example includes pagination utilities:

```ts
// utils/pagination.ts
export function paginate<T>(
  items: T[],
  page: number,
  limit: number
): PaginatedResponse<T> {
  const start = (page - 1) * limit;
  const end = start + limit;
  
  return {
    data: items.slice(start, end),
    meta: {
      page,
      limit,
      total: items.length,
      totalPages: Math.ceil(items.length / limit),
    },
  };
}

// Used in handlers
const handler = async (request) => {
  const { page, limit } = request.validatedQuery;
  const users = await getAllUsers();
  const paginated = paginate(users, page, limit);
  
  return request.respond({
    status: 200,
    contentType: "application/json",
    body: paginated,
  });
};
```

## Error Handling

Comprehensive error handling patterns:

```ts
const handler = async (request) => {
  const user = await getUser(request.validatedParams.id);
  
  if (!user) {
    return request.respond({
      status: 404,
      contentType: "application/json",
      body: {
        error: "Not Found",
        message: "User not found",
      },
    });
  }
  
  // Check permissions
  if (request.userRole !== "admin" && request.userId !== user.id) {
    return request.respond({
      status: 403,
      contentType: "application/json",
      body: {
        error: "Forbidden",
        message: "You don't have permission to access this resource",
      },
    });
  }
  
  return request.respond({
    status: 200,
    contentType: "application/json",
    body: user,
  });
};
```

## OpenAPI Integration

The example generates and serves OpenAPI documentation:

```ts
const openApiSpec = await createOpenApiSpecification(contract, {
  title: "Complex API",
  version: "1.0.0",
  description: readFileSync(join(import.meta.dirname, "description.md"), "utf8"),
  servers: [{ url: "http://localhost:3000", description: "Localhost" }],
  tags: [
    { name: "Users", description: "User management endpoints" },
    { name: "Products", description: "Product management endpoints" },
    { name: "Orders", description: "Order management endpoints" },
  ],
});

// Serve OpenAPI spec and docs
const router = createRouter({
  contract: {
    ...contract,
    getSpec: { /* ... */ },
    getDocs: { /* ... */ },
  },
  handlers: {
    ...handlers,
    getSpec: async (request) => {
      return request.respond({
        status: 200,
        contentType: "application/json",
        body: openApiSpec,
      });
    },
    getDocs: async (request) => {
      return request.respond({
        status: 200,
        contentType: "text/html",
        body: createSpotlightElementsHtml(),
      });
    },
  },
});
```

## Key Patterns

### 1. Domain Separation

Each domain (users, products, orders) has:
- Its own contract file
- Its own handler file
- Its own schema file

### 2. Schema Reuse

Common schemas (pagination, errors) are defined once and reused.

### 3. Middleware Composition

Middleware is composed and reused across domains.

### 4. Type Safety

Full type inference from contracts to handlers.

## Running the Example

```bash
cd examples/complex
npm install
npm run dev
```

The server will start on `http://localhost:3000`.

## API Endpoints

- `GET /users` - List users with pagination
- `GET /users/:id` - Get user by ID
- `POST /users` - Create user
- `PATCH /users/:id` - Update user
- `DELETE /users/:id` - Delete user
- `GET /products` - List products
- `GET /orders` - List orders
- `GET /openapi.json` - OpenAPI specification
- `GET /docs` - Interactive API documentation

## What to Learn

This example demonstrates:
- Multi-domain organization
- Authentication patterns
- Pagination implementation
- Error handling strategies
- OpenAPI integration
- Production-ready patterns

## Next Steps

- Read the [Best Practices Guide](/guide/best-practices)
- Explore [Advanced Patterns](/guide/advanced-patterns)
- Check out [Middleware Guide](/guide/middleware)

