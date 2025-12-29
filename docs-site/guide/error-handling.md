# Error Handling

`itty-spec` provides built-in error handling that automatically converts errors into appropriate HTTP responses.

## Default Error Handling

By default, `itty-spec` includes an error handler that catches all errors and converts them to JSON responses:

```ts
// Built-in error handler
catch: withContractErrorHandler()
```

### Validation Errors

When validation fails, errors are automatically caught and returned as 400 Bad Request:

```json
{
  "error": "Validation failed",
  "details": [
    {
      "path": ["email"],
      "message": "Invalid email"
    }
  ]
}
```

### Other Errors

Other errors are converted to 500 Internal Server Error:

```json
{
  "error": "Internal server error",
  "details": [
    {
      "message": "Error message here"
    }
  ]
}
```

## Error Types

### Validation Errors

Validation errors occur when request data doesn't match the contract schema:

```ts
// Request with invalid email
POST /users
{ "email": "not-an-email" }

// Response: 400 Bad Request
{
  "error": "Validation failed",
  "details": [
    {
      "path": ["email"],
      "message": "Invalid email"
    }
  ]
}
```

### Handler Errors

Errors thrown in handlers are caught and converted to 500 responses:

```ts
const handler = async (request) => {
  throw new Error("Something went wrong");
  // Automatically converted to 500 response
};
```

### Middleware Errors

Errors in middleware are also caught:

```ts
const router = createRouter({
  contract,
  handlers,
  before: [
    async (request) => {
      throw new Error("Middleware error");
      // Caught by error handler
    },
  ],
});
```

## Custom Error Responses

### Error Response Contracts

Define error responses in your contract:

```ts
const contract = createContract({
  getUser: {
    path: "/users/:id",
    method: "GET",
    responses: {
      200: {
        "application/json": { body: UserSchema },
      },
      404: {
        "application/json": {
          body: z.object({
            error: z.string(),
            message: z.string(),
          }),
        },
      },
      500: {
        "application/json": {
          body: z.object({
            error: z.string(),
            details: z.array(z.unknown()),
          }),
        },
      },
    },
  },
});
```

### Throwing Errors with Status Codes

Use itty-router's `error` helper to throw errors with specific status codes:

```ts
import { error } from "itty-router";

const handler = async (request) => {
  const user = await getUser(request.validatedParams.id);
  
  if (!user) {
    throw error(404, "User not found");
    // Returns 404 response
  }
  
  return request.respond({
    status: 200,
    contentType: "application/json",
    body: user,
  });
};
```

### Custom Error Classes

Create custom error classes for different error types:

```ts
class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

class ValidationError extends Error {
  constructor(message: string, public issues: unknown[]) {
    super(message);
    this.name = "ValidationError";
  }
}

// In handler
const handler = async (request) => {
  const user = await getUser(request.validatedParams.id);
  
  if (!user) {
    throw new NotFoundError("User not found");
  }
  
  // Error handler can check error type
};
```

## Custom Error Handler

You can customize error handling by providing your own error handler:

```ts
const router = Router({
  catch: (error, request) => {
    // Custom error handling
    if (error instanceof NotFoundError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 404, headers: { "content-type": "application/json" } }
      );
    }
    
    if (error instanceof ValidationError) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: error.issues,
        }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }
    
    // Default error response
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  },
});
```

## Error Patterns

### Not Found Pattern

```ts
const handler = async (request) => {
  const resource = await findResource(request.validatedParams.id);
  
  if (!resource) {
    return request.respond({
      status: 404,
      contentType: "application/json",
      body: {
        error: "Not Found",
        message: `Resource ${request.validatedParams.id} not found`,
      },
    });
  }
  
  return request.respond({
    status: 200,
    contentType: "application/json",
    body: resource,
  });
};
```

### Unauthorized Pattern

```ts
const handler = async (request) => {
  const user = await getCurrentUser(request);
  
  if (!user) {
    return request.respond({
      status: 401,
      contentType: "application/json",
      body: {
        error: "Unauthorized",
        message: "Authentication required",
      },
    });
  }
  
  // Continue with handler logic
};
```

### Forbidden Pattern

```ts
const handler = async (request) => {
  const user = await getCurrentUser(request);
  const resource = await getResource(request.validatedParams.id);
  
  if (user.id !== resource.ownerId) {
    return request.respond({
      status: 403,
      contentType: "application/json",
      body: {
        error: "Forbidden",
        message: "You don't have permission to access this resource",
      },
    });
  }
  
  // Continue with handler logic
};
```

### Validation Error Pattern

```ts
const handler = async (request) => {
  try {
    // Business logic validation
    if (request.validatedBody.email.includes("spam")) {
      return request.respond({
        status: 400,
        contentType: "application/json",
        body: {
          error: "Validation failed",
          message: "Email domain not allowed",
        },
      });
    }
    
    // Continue
  } catch (error) {
    // Handle unexpected errors
    throw error; // Let error handler deal with it
  }
};
```

## Error Middleware

Create middleware to handle errors consistently:

```ts
async function withErrorHandling(request: IRequest) {
  try {
    // Your logic
  } catch (error) {
    // Transform error before it reaches error handler
    if (error instanceof DatabaseError) {
      throw new Error("Database error occurred");
    }
    throw error;
  }
}
```

## Best Practices

### 1. Define Error Responses in Contracts

```ts
// ✅ Good - error responses defined
responses: {
  200: { "application/json": { body: SuccessSchema } },
  400: { "application/json": { body: ErrorSchema } },
  404: { "application/json": { body: ErrorSchema } },
  500: { "application/json": { body: ErrorSchema } },
}
```

### 2. Use Consistent Error Format

```ts
// ✅ Good - consistent format
{
  error: "Error type",
  message: "Human-readable message",
  details?: [...]
}

// ❌ Bad - inconsistent format
{
  error: "Error type"
}
// vs
{
  message: "Error message"
}
```

### 3. Provide Helpful Error Messages

```ts
// ✅ Good
{
  error: "Validation failed",
  message: "Email must be a valid email address",
  details: [{ path: ["email"], message: "Invalid email" }]
}

// ❌ Bad
{
  error: "Validation failed"
}
```

### 4. Log Errors for Debugging

```ts
const router = Router({
  catch: (error, request) => {
    // Log error for debugging
    console.error("Error:", error);
    console.error("Request:", request.method, request.url);
    
    // Return user-friendly response
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500 }
    );
  },
});
```

### 5. Don't Expose Internal Details

```ts
// ✅ Good - user-friendly
{
  error: "Internal server error",
  message: "An error occurred processing your request"
}

// ❌ Bad - exposes internal details
{
  error: "DatabaseConnectionError",
  message: "Failed to connect to database at 192.168.1.1:5432",
  stack: "..."
}
```

## Related Topics

- [Validation](/guide/validation) - Understand validation errors
- [Middleware](/guide/middleware) - Handle errors in middleware
- [Router Configuration](/guide/router-configuration) - Configure error handling

