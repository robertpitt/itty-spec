# Content Types

`itty-spec` supports multiple content types for both requests and responses, enabling content negotiation and flexible API design.

## Request Content Types

You can define multiple request body schemas, each for a different content type:

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

### Content-Type Matching

The router matches the request's `Content-Type` header to the appropriate schema:

```ts
// Request with Content-Type: application/json
// → Validates against JSON schema

// Request with Content-Type: application/xml
// → Validates against XML schema
```

### Handling Multiple Content Types in Handlers

In your handler, you can check the content type and handle accordingly:

```ts
const handler = async (request) => {
  const contentType = request.headers.get("content-type");
  const body = request.validatedBody;
  
  if (contentType?.includes("json")) {
    // body is typed from JSON schema
    const { name, email } = body as { name: string; email: string };
    // ...
  } else if (contentType?.includes("xml")) {
    // body is typed as string
    const xmlString = body as string;
    // Parse XML...
  }
};
```

## Response Content Types

Define multiple response formats for the same status code:

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
          body: z.string(),  // HTML string
        },
        "application/xml": {
          body: z.string(),  // XML string
        },
      },
    },
  },
});
```

### Content Negotiation

Use the `Accept` header to determine the response format:

```ts
const handler = async (request) => {
  const accept = request.headers.get("accept") || "application/json";
  
  if (accept.includes("text/html")) {
    return request.respond({
      status: 200,
      contentType: "text/html",
      body: generateHTML(user),
    });
  }
  
  if (accept.includes("application/xml")) {
    return request.respond({
      status: 200,
      contentType: "application/xml",
      body: generateXML(user),
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

## JSON Content Type

JSON is the most common content type. Define JSON schemas using Zod:

```ts
requests: {
  "application/json": {
    body: z.object({
      name: z.string(),
      email: z.string().email(),
    }),
  },
}

responses: {
  200: {
    "application/json": {
      body: z.object({
        id: z.string(),
        name: z.string(),
      }),
    },
  },
}
```

## HTML Content Type

Serve HTML responses for web pages or HTML fragments:

```ts
responses: {
  200: {
    "text/html": {
      body: z.string(),  // HTML as string
    },
  },
}

// In handler:
return request.respond({
  status: 200,
  contentType: "text/html",
  body: `
    <html>
      <body>
        <h1>User Profile</h1>
        <p>Name: ${user.name}</p>
      </body>
    </html>
  `,
});
```

### HTML with Headers

You can include response headers with HTML:

```ts
responses: {
  200: {
    "text/html": {
      body: z.string(),
      headers: z.object({
        "content-type": z.literal("text/html; charset=utf-8"),
      }),
    },
  },
}
```

## XML Content Type

Serve XML responses:

```ts
responses: {
  200: {
    "application/xml": {
      body: z.string(),  // XML as string
    },
  },
}

// In handler:
return request.respond({
  status: 200,
  contentType: "application/xml",
  body: `<?xml version="1.0"?><user><id>${user.id}</id></user>`,
});
```

## Form Data

Handle form submissions:

```ts
requests: {
  "application/x-www-form-urlencoded": {
    body: z.object({
      name: z.string(),
      email: z.string().email(),
    }),
  },
  "multipart/form-data": {
    body: z.object({
      name: z.string(),
      email: z.string().email(),
      file: z.instanceof(File).optional(),
    }),
  },
}
```

### Parsing Form Data

For form data, you may need to parse it manually:

```ts
const handler = async (request) => {
  const contentType = request.headers.get("content-type");
  
  if (contentType?.includes("form-urlencoded")) {
    const formData = await request.formData();
    const name = formData.get("name");
    const email = formData.get("email");
    // ...
  }
};
```

## Custom Content Types

Define custom content types for specialized formats:

```ts
requests: {
  "application/vnd.api+json": {  // JSON:API format
    body: z.object({
      data: z.object({
        type: z.string(),
        attributes: z.record(z.unknown()),
      }),
    }),
  },
  "text/csv": {
    body: z.string(),  // CSV as string
  },
}
```

## Content-Type Best Practices

### 1. Always Specify Content-Type

```ts
// ✅ Good - explicit content type
return request.respond({
  status: 200,
  contentType: "application/json",
  body: data,
});

// ❌ Bad - missing content type
return request.respond({
  status: 200,
  body: data,
});
```

### 2. Use Appropriate Content Types

```ts
// ✅ Good
"application/json"  // For JSON data
"text/html"         // For HTML
"application/xml"   // For XML
"text/plain"        // For plain text

// ❌ Bad
"json"              // Not a valid content type
"html"              // Not a valid content type
```

### 3. Handle Content Negotiation

```ts
const handler = async (request) => {
  const accept = request.headers.get("accept") || "application/json";
  
  // Prioritize requested format
  if (accept.includes("text/html")) {
    return htmlResponse();
  }
  
  // Fallback to JSON
  return jsonResponse();
};
```

### 4. Validate Content-Type Headers

```ts
headers: z.object({
  "content-type": z.union([
    z.literal("application/json"),
    z.literal("application/xml"),
  ]),
})
```

### 5. Use Consistent Content Types

```ts
// ✅ Good - consistent across operations
responses: {
  200: {
    "application/json": { body: UserSchema },
  },
}

// ❌ Bad - inconsistent
responses: {
  200: {
    "application/json": { body: UserSchema },
    "text/json": { body: UserSchema },  // Non-standard
  },
}
```

## Examples

### JSON API

```ts
const contract = createContract({
  getUsers: {
    path: "/users",
    method: "GET",
    responses: {
      200: {
        "application/json": {
          body: z.object({
            data: z.array(UserSchema),
            meta: z.object({
              total: z.number(),
              page: z.number(),
            }),
          }),
        },
      },
    },
  },
});
```

### HTML Page

```ts
const contract = createContract({
  getDashboard: {
    path: "/dashboard",
    method: "GET",
    responses: {
      200: {
        "text/html": {
          body: z.string(),
        },
      },
    },
  },
});

// Handler returns HTML
const handler = async (request) => {
  return request.respond({
    status: 200,
    contentType: "text/html",
    body: renderDashboard(),
  });
};
```

### XML API

```ts
const contract = createContract({
  getUser: {
    path: "/users/:id",
    method: "GET",
    responses: {
      200: {
        "application/xml": {
          body: z.string(),
        },
      },
    },
  },
});

// Handler returns XML
const handler = async (request) => {
  const user = await getUser(request.validatedParams.id);
  return request.respond({
    status: 200,
    contentType: "application/xml",
    body: `
      <?xml version="1.0"?>
      <user>
        <id>${user.id}</id>
        <name>${user.name}</name>
      </user>
    `,
  });
};
```

## Related Topics

- [Contracts](/guide/contracts) - Learn about defining content types in contracts
- [Validation](/guide/validation) - Understand how content types affect validation
- [Examples](/examples/content-types) - See content type examples

