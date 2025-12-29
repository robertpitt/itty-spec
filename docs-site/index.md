---
layout: home

hero:
  name: itty-spec
  text: Contract-first, type-safe API definitions
  tagline: for itty-router
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/robertpitt/itty-spec

features:
  - title: Contract-first API design
    details: Define routes, inputs, and outputs once. The contract drives both runtime behavior and compile-time types.
  - title: Fully typed TypeScript
    details: Complete type inference from contract to handler, with compile-time guarantees for request/response shapes.
  - title: Runtime validation
    details: Invalid requests are rejected before your handler runs, using Standard Schema V1 compatible validators.
  - title: End-to-end type safety
    details: Handlers receive typed, validated data (validatedParams, validatedQuery, validatedBody, validatedHeaders).
  - title: Typed response builder
    details: Responses must match the contract - TypeScript errors catch mismatches at compile time.
  - title: Fetch-first compatibility
    details: Works in any environment that supports the Fetch API - Cloudflare Workers, AWS Lambda, Node.js, Bun, Deno.
  - title: OpenAPI generation
    details: Generate and serve OpenAPI 3.1 specifications from the same contract using @standard-community/standard-openapi.
  - title: Minimal bundle size
    details: Designed for edge/serverless environments where every byte counts.
---

## What this project provides

- **Contract-first API design**: define routes, inputs, and outputs once.
- **Fully typed TypeScript experience**: complete type inference from contract to handler, with compile-time guarantees for request/response shapes.
- **Runtime validation**: invalid requests are rejected before your handler runs, using Standard Schema V1 compatible validators.
- **End-to-end TypeScript inference**: handlers receive typed, validated data (`validatedParams`, `validatedQuery`, `validatedBody`, `validatedHeaders`).
- **Typed response builder**: responses must match the contract (status/content-type/body) - TypeScript errors catch mismatches at compile time.
- **Fetch-first compatibility**: works in any environment that supports the Fetch API.
- **OpenAPI generation and serving**: generate and serve OpenAPI 3.1 specifications from the same contract using `@standard-community/standard-openapi`.

## What this project is not

- Not a full application framework (no controllers, DI container, ORM, etc.).
- Not a server runtime (you bring your own deployment: Workers, Node, Bun, Deno, etc.).
- Not a replacement for itty-router; it builds on it.

## Foundation

`itty-spec` is built on a lightweight foundation of battle-tested libraries:

- **[itty-router](https://itty.dev/itty-router)** (v5): The tiny router for Fetch that powers routing and request handling.
- **[Standard Schema V1](https://github.com/standard-schema/spec)** (`@standard-schema/spec`): Provides a common interface for schema validation, enabling compatibility with multiple schema libraries.
- **[Standard Community OpenAPI](https://github.com/standard-community/standard-openapi)** (`@standard-community/standard-openapi`): Converts Standard Schema V1 schemas to OpenAPI 3.1 format for documentation and tooling.

This architecture ensures minimal bundle size while providing maximum type safety and developer experience. The library is designed to work seamlessly in edge/serverless environments where every byte counts.

