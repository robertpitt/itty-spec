# Getting Started

## Installation

```bash
npm install itty-spec
# or
pnpm add itty-spec
# or
yarn add itty-spec
```

### Peer Dependencies

`itty-spec` requires a Standard Schema V1 compatible library for validation. Install one of the following:

```bash
# For Zod (recommended)
npm install zod@v4

# For Valibot
npm install valibot
```

## Environment Setup

`itty-spec` works in any environment that supports the Fetch API. No special configuration is required, but you may need TypeScript configured:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "strict": true
  }
}
```

## Quick Start

### 1) Define a contract

```ts
import { createContract } from "itty-spec";
import { z } from "zod";

const UserEntity = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(18).optional(),
});

const CreateUserRequest = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(18).optional(),
});

const ListUsersResponse = z.object({
  users: z.array(UserEntity),
  total: z.number(),
});

export const contract = createContract({
  getUsers: {
    path: "/users",
    method: "GET",
    headers: z.object({
      "x-api-key": z.string(),
    }),
    query: z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(10),
    }),
    responses: {
      200: {
        "application/json": { body: ListUsersResponse },
      },
    },
  },

  createUser: {
    path: "/users",
    method: "POST",
    headers: z.object({
      "x-api-key": z.string(),
    }),
    requests: {
      "application/json": {
        body: CreateUserRequest,
      },
    },
    responses: {
      200: {
        "application/json": { body: UserEntity },
      },
      400: {
        "application/json": { body: z.object({ error: z.string() }) },
      },
    },
  },
});
```

### 2) Implement the contract with a router

```ts
import { createRouter } from "itty-spec";
import { contract } from "./contract";

const router = createRouter({
  contract,
  handlers: {
    getUsers: async (request) => {
      const { page, limit } = request.validatedQuery;

      return request.respond({
        status: 200,
        contentType: "application/json",
        body: { users: [], total: 0 },
      });
    },

    createUser: async (request) => {
      const { name, email } = request.validatedBody;

      return request.respond({
        status: 200,
        contentType: "application/json",
        body: { id: "123", name, email },
      });
    },
  },
});

export default {
  fetch: router.fetch,
};
```

## Target Environments

`itty-spec` is designed to be lightweight and efficient, making it ideal for:

- **Cloudflare Workers**: Edge computing with minimal cold start times
- **AWS Lambda**: Serverless functions with size constraints
- **Node.js servers**: Traditional backend servers
- **Bun**: Fast JavaScript runtime
- **Deno**: Secure runtime for JavaScript and TypeScript
- **Any Fetch-compatible environment**: Works wherever the Fetch API is available

The library's minimal dependencies and small bundle size ensure fast startup times and low memory footprint, critical for edge and serverless deployments.

## Your First API

Let's build a complete, working API step by step. This tutorial will show you how to create a simple todo API with full type safety.

### Step 1: Define Your Schemas

First, create schemas for your data structures:

```ts
import { z } from "zod";

const TodoSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  completed: z.boolean(),
  createdAt: z.string().datetime(),
});

const CreateTodoRequest = z.object({
  title: z.string().min(1),
  completed: z.boolean().default(false),
});
```

### Step 2: Create Your Contract

Define your API contract with all operations:

```ts
import { createContract } from "itty-spec";

export const contract = createContract({
  getTodos: {
    path: "/todos",
    method: "GET",
    query: z.object({
      completed: z.boolean().optional(),
      limit: z.number().min(1).max(100).default(10),
    }),
    responses: {
      200: {
        "application/json": {
          body: z.object({
            todos: z.array(TodoSchema),
            total: z.number(),
          }),
        },
      },
    },
  },
  getTodo: {
    path: "/todos/:id",
    method: "GET",
    responses: {
      200: {
        "application/json": { body: TodoSchema },
      },
      404: {
        "application/json": { body: z.object({ error: z.string() }) },
      },
    },
  },
  createTodo: {
    path: "/todos",
    method: "POST",
    requests: {
      "application/json": { body: CreateTodoRequest },
    },
    responses: {
      201: {
        "application/json": { body: TodoSchema },
      },
      400: {
        "application/json": { body: z.object({ error: z.string() }) },
      },
    },
  },
});
```

### Step 3: Implement Handlers

Create handlers that receive typed, validated data:

```ts
import { createRouter } from "itty-spec";
import { contract } from "./contract";

// Simple in-memory store
const todos: Todo[] = [];

const router = createRouter({
  contract,
  handlers: {
    getTodos: async (request) => {
      const { completed, limit } = request.validatedQuery;
      
      let filtered = todos;
      if (completed !== undefined) {
        filtered = todos.filter(t => t.completed === completed);
      }
      
      return request.respond({
        status: 200,
        contentType: "application/json",
        body: {
          todos: filtered.slice(0, limit),
          total: filtered.length,
        },
      });
    },
    
    getTodo: async (request) => {
      const { id } = request.validatedParams;
      const todo = todos.find(t => t.id === id);
      
      if (!todo) {
        return request.respond({
          status: 404,
          contentType: "application/json",
          body: { error: "Todo not found" },
        });
      }
      
      return request.respond({
        status: 200,
        contentType: "application/json",
        body: todo,
      });
    },
    
    createTodo: async (request) => {
      const { title, completed } = request.validatedBody;
      
      const todo = {
        id: crypto.randomUUID(),
        title,
        completed: completed ?? false,
        createdAt: new Date().toISOString(),
      };
      
      todos.push(todo);
      
      return request.respond({
        status: 201,
        contentType: "application/json",
        body: todo,
      });
    },
  },
});

export default { fetch: router.fetch };
```

### Step 4: Deploy

Now you can deploy this to any Fetch-compatible environment:

**Cloudflare Workers:**
```ts
// Already done! Just export the fetch handler
export default { fetch: router.fetch };
```

**Node.js:**
```ts
import { createServer } from "http";
import { createServerAdapter } from "@whatwg-node/server";

const adapter = createServerAdapter(router.fetch);
const server = createServer(adapter);
server.listen(3000);
```

**Bun:**
```ts
Bun.serve({ fetch: router.fetch });
```

## Common Pitfalls

### 1. Forgetting `as const` for Path Parameters

For automatic path parameter extraction, use `as const`:

```ts
// ✅ Good - path params are extracted
const contract = createContract({
  getUser: {
    path: "/users/:id", // TypeScript infers { id: string }
    method: "GET",
    // ...
  },
} as const);

// ❌ Bad - path params may not be extracted
const contract = createContract({
  getUser: {
    path: "/users/:id", // May fall back to EmptyObject
    method: "GET",
    // ...
  },
});
```

### 2. Not Providing Required Handlers

Every operation in your contract should have a corresponding handler:

```ts
// ✅ Good
const router = createRouter({
  contract,
  handlers: {
    getUsers: async (request) => { /* ... */ },
    createUser: async (request) => { /* ... */ },
  },
});

// ❌ Bad - missing handler will cause runtime errors
const router = createRouter({
  contract,
  handlers: {
    getUsers: async (request) => { /* ... */ },
    // createUser is missing!
  },
});
```

### 3. Mismatched Response Types

Ensure your response matches the contract exactly:

```ts
// ✅ Good
return request.respond({
  status: 200,
  contentType: "application/json",
  body: { users: [], total: 0 }, // Matches contract
});

// ❌ Bad - TypeScript error!
return request.respond({
  status: 200,
  contentType: "application/json",
  body: { users: [] }, // Missing 'total' field
});
```

### 4. Incorrect Content-Type Handling

When using multiple content types, ensure you handle them correctly:

```ts
// ✅ Good - check content type from headers
const contentType = request.validatedHeaders.get("content-type");
if (contentType === "text/html") {
  return request.respond({
    status: 200,
    contentType: "text/html",
    body: "<html>...</html>",
  });
}

// ❌ Bad - assuming content type
return request.respond({
  status: 200,
  contentType: "text/html", // May not match request
  body: "<html>...</html>",
});
```

## Next Steps

- Learn about [Core Concepts](/guide/core-concepts) to understand how itty-spec works
- Explore [Contracts](/guide/contracts) to master contract definitions
- Check out [Examples](/examples/) for real-world patterns

