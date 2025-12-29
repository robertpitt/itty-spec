# Getting Started

## Installation

```bash
npm install itty-spec
# or
pnpm add itty-spec
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

