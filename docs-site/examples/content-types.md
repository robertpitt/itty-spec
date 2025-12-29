# Content Types Example

Demonstrates handling multiple content types and content negotiation.

## Overview

This example shows:
- Multiple request content types
- Multiple response content types
- Content negotiation based on Accept header
- HTML, XML, and JSON responses

## Contract Definition

```ts
const contract = createContract({
  getUser: {
    path: "/users/:id",
    method: "GET",
    responses: {
      200: {
        "application/json": {
          body: z.object({
            id: z.string(),
            name: z.string(),
            email: z.string(),
          }),
        },
        "text/html": {
          body: z.string(),
        },
        "application/xml": {
          body: z.string(),
        },
      },
    },
  },
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
      "application/x-www-form-urlencoded": {
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

## Content Negotiation

The handler checks the `Accept` header to determine the response format:

```ts
const handler = async (request) => {
  const user = await getUser(request.validatedParams.id);
  const accept = request.headers.get("accept") || "application/json";
  
  if (accept.includes("text/html")) {
    return request.respond({
      status: 200,
      contentType: "text/html",
      body: `
        <html>
          <body>
            <h1>User Profile</h1>
            <p>Name: ${user.name}</p>
            <p>Email: ${user.email}</p>
          </body>
        </html>
      `,
    });
  }
  
  if (accept.includes("application/xml")) {
    return request.respond({
      status: 200,
      contentType: "application/xml",
      body: `
        <?xml version="1.0"?>
        <user>
          <id>${user.id}</id>
          <name>${user.name}</name>
          <email>${user.email}</email>
        </user>
      `,
    });
  }
  
  // Default to JSON
  return request.respond({
    status: 200,
    contentType: "application/json",
    body: user,
  });
};
```

## Testing

### JSON Response

```bash
curl "http://localhost:3000/users/123" \
  -H "Accept: application/json"
```

### HTML Response

```bash
curl "http://localhost:3000/users/123" \
  -H "Accept: text/html"
```

### XML Response

```bash
curl "http://localhost:3000/users/123" \
  -H "Accept: application/xml"
```

## Related

- [Content Types Guide](/guide/content-types) - Learn about content types
- [Simple Example](/examples/simple) - See content negotiation in action

