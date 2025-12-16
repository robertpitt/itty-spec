# Complex Example

This is a comprehensive example demonstrating a scalable contract-router implementation with multiple domains, authentication, pagination, and advanced filtering.

## Structure

The example is organized into a scalable folder structure:

```
complex/
├── schemas/          # Domain-specific Zod schemas
│   ├── common.ts     # Shared schemas (pagination, errors, etc.)
│   ├── users.ts      # User domain schemas
│   ├── products.ts   # Product domain schemas
│   ├── orders.ts     # Order domain schemas
│   └── index.ts      # Central export point
├── contracts/        # Contract definitions by domain
│   ├── users.contract.ts
│   ├── products.contract.ts
│   ├── orders.contract.ts
│   └── index.ts      # Combined contract
├── handlers/         # Request handlers by domain
│   ├── users.handlers.ts
│   ├── products.handlers.ts
│   ├── orders.handlers.ts
│   └── index.ts      # Central export point
├── utils/            # Shared utilities
│   ├── database.ts    # In-memory database simulation
│   ├── pagination.ts # Pagination helpers
│   ├── auth.ts       # Authentication utilities
│   ├── docs.ts       # Documentation utilities
│   └── index.ts      # Central export point
├── middleware/        # Custom middleware
│   └── auth.middleware.ts
└── index.ts          # Main entry point
```

## Features

### Domains

1. **Users** - User management with role-based access control
   - List users with filtering (role, status, search)
   - Get user by ID
   - Create user
   - Update user
   - Delete user

2. **Products** - Product catalog management
   - List products with filtering (category, status, price range, stock, search)
   - Get product by ID
   - Create product
   - Update product
   - Delete product

3. **Orders** - Order processing and management
   - List orders with filtering (status, user, date range, total range)
   - Get order by ID
   - Create order
   - Update order status
   - Get user orders (nested resource)

### Additional Features

- **Authentication**: Bearer token authentication for protected endpoints
- **Pagination**: Paginated responses for all list endpoints
- **Filtering**: Advanced filtering options for all list endpoints
- **Error Handling**: Standardized error responses
- **OpenAPI Documentation**: Auto-generated API documentation at `/docs`
- **Health Check**: Health check endpoint at `/health`

## Running the Example

```bash
# From the project root
cd examples/complex
npm run dev
# or
tsx index.ts
```

The server will start on `http://localhost:3000` (or the port specified in `PORT` environment variable).

## API Endpoints

### Public Endpoints

- `GET /health` - Health check
- `GET /docs` - API documentation
- `GET /products` - List products (public)
- `GET /products/:id` - Get product by ID (public)

### Authenticated Endpoints

All other endpoints require authentication via Bearer token:

```
Authorization: Bearer your-token-here
```

#### Users

- `GET /users` - List users
- `GET /users/:id` - Get user by ID
- `POST /users` - Create user
- `PATCH /users/:id` - Update user
- `DELETE /users/:id` - Delete user

#### Products

- `POST /products` - Create product
- `PATCH /products/:id` - Update product
- `DELETE /products/:id` - Delete product

#### Orders

- `GET /orders` - List orders
- `GET /orders/:id` - Get order by ID
- `POST /orders` - Create order
- `PATCH /orders/:id/status` - Update order status
- `GET /users/:id/orders` - Get user orders

## Sample Data

The API initializes with sample data:

- **Users**:
  - Admin user: `admin@example.com`
  - Regular user: `user@example.com`

- **Products**:
  - Laptop ($999.00)
  - T-Shirt ($19.99)

- **Orders**:
  - Sample order for the regular user

## Scalability Patterns

This example demonstrates several scalability patterns:

1. **Domain Separation**: Each domain (users, products, orders) has its own schemas, contracts, and handlers
2. **Shared Utilities**: Common functionality (pagination, auth, database) is extracted into reusable utilities
3. **Modular Contracts**: Contracts are defined per domain and combined in a central index
4. **Type Safety**: Full TypeScript type safety throughout the application
5. **Middleware**: Custom middleware for cross-cutting concerns (authentication)

## Extending the Example

To add a new domain:

1. Create schemas in `schemas/your-domain.ts`
2. Create contract in `contracts/your-domain.contract.ts`
3. Create handlers in `handlers/your-domain.handlers.ts`
4. Export from respective `index.ts` files
5. Add to the main contract in `contracts/index.ts`
6. Add handlers to `index.ts`

This structure makes it easy to scale the API as new domains are added.
