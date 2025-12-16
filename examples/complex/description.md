# Complex API Example

This is a comprehensive example API demonstrating a scalable contract-router implementation.
It includes multiple domains (Users, Products, Orders) with full CRUD operations, authentication,
pagination, filtering, and nested resources.

## Features

- **Users Management**: Create, read, update, and delete user accounts with role-based access control
- **Products Catalog**: Manage products with categories, inventory, and search capabilities
- **Order Processing**: Create and manage orders with status tracking and user-specific filtering
- **Authentication**: Bearer token authentication for protected endpoints
- **Pagination**: Paginated responses for list endpoints
- **Filtering**: Advanced filtering options for all list endpoints

## Authentication

Most endpoints require authentication via Bearer token in the Authorization header:

```
Authorization: Bearer your-token-here
```

## Sample Data

The API initializes with sample data including:

- Admin user (admin@example.com)
- Regular user (user@example.com)
- Sample products (Laptop, T-Shirt)
- Sample order

## Getting Started

1. Start the server: `npm run dev`
2. Visit `http://localhost:3000/docs` for interactive API documentation
3. Use the health check endpoint to verify the API is running: `GET /health`
