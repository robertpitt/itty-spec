# Authentication Example

Demonstrates authentication middleware patterns.

## Overview

This example shows:
- Authentication middleware
- Protected routes
- Token validation
- User context in handlers

## Authentication Middleware

```ts
// middleware/auth.middleware.ts
export interface AuthenticatedRequest extends IRequest {
  userId?: string;
  userRole?: string;
}

export function withAuth(request: AuthenticatedRequest): void {
  const authHeader = request.headers.get("authorization");
  const userId = extractUserIdFromAuth(authHeader);
  
  if (!userId) {
    return; // Let handler decide what to do
  }
  
  const user = userDb.findById(userId);
  if (user) {
    request.userId = user.id;
    request.userRole = user.role;
  }
}
```

## Contract with Authentication

```ts
const contract = createContract({
  getProfile: {
    path: "/profile",
    method: "GET",
    headers: z.object({
      authorization: z.string(),
    }),
    responses: {
      200: {
        "application/json": { body: UserSchema },
      },
      401: {
        "application/json": { body: ErrorSchema },
      },
    },
  },
});
```

## Protected Handler

```ts
const handler = async (request: AuthenticatedRequest) => {
  if (!request.userId) {
    return request.respond({
      status: 401,
      contentType: "application/json",
      body: {
        error: "Unauthorized",
        message: "Authentication required",
      },
    });
  }
  
  const user = await getUser(request.userId);
  return request.respond({
    status: 200,
    contentType: "application/json",
    body: user,
  });
};
```

## Role-Based Access

```ts
const handler = async (request: AuthenticatedRequest) => {
  if (!request.userId) {
    return request.respond({
      status: 401,
      contentType: "application/json",
      body: { error: "Unauthorized" },
    });
  }
  
  if (request.userRole !== "admin") {
    return request.respond({
      status: 403,
      contentType: "application/json",
      body: {
        error: "Forbidden",
        message: "Admin access required",
      },
    });
  }
  
  // Admin-only logic
  const users = await getAllUsers();
  return request.respond({
    status: 200,
    contentType: "application/json",
    body: { users },
  });
};
```

## Router Setup

```ts
const router = createRouter<typeof contract, AuthenticatedRequest>({
  contract,
  handlers,
  before: [withAuth],
});
```

## Testing

### Authenticated Request

```bash
curl "http://localhost:3000/profile" \
  -H "Authorization: Bearer token123"
```

### Unauthenticated Request

```bash
curl "http://localhost:3000/profile"
# Returns 401 Unauthorized
```

## Related

- [Middleware Guide](/guide/middleware) - Learn about middleware
- [Complex Example](/examples/complex) - See authentication in a full example

