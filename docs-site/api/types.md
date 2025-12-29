# Types Reference

Complete reference for all TypeScript types used in `itty-spec`.

## Contract Types

### ContractDefinition

A record of operation IDs to contract operations.

```ts
type ContractDefinition<T extends Record<string, AnyContractOperation> = Record<string, AnyContractOperation>>
```

### ContractOperation

Defines a single API operation.

```ts
interface ContractOperation<
  TPathParams extends StandardSchemaV1 | undefined = undefined,
  TQuery extends StandardSchemaV1 | undefined = undefined,
  TRequests extends RequestByContentType | undefined = undefined,
  THeaders extends StandardSchemaV1 | undefined = undefined,
  TResponses extends ResponseByStatusCode = ResponseByStatusCode,
  TPath extends string = string
>
```

### Contract

Alias for contract definition type.

```ts
type Contract<T extends ContractDefinition> = T
```

## Request Types

### ContractRequest

The request object passed to handlers, with typed validated data and response helpers.

```ts
interface ContractRequest<O extends ContractOperation>
  extends ContractOperationRequest<O>, ContractOperationResponseHelpers<O>
```

### ContractOperationRequest

Request object with typed validated data.

```ts
interface ContractOperationRequest<O extends ContractOperation> extends IRequest {
  validatedParams: ContractOperationParameters<O>;
  validatedQuery: ContractOperationQuery<O>;
  validatedBody: ContractOperationBody<O>;
  validatedHeaders: ContractOperationHeaders<O>;
}
```

### ContractOperationParameters

Extract path parameter types from an operation.

```ts
type ContractOperationParameters<O extends AnyContractOperation>
```

### ContractOperationQuery

Extract query parameter types from an operation.

```ts
type ContractOperationQuery<O extends AnyContractOperation>
```

### ContractOperationBody

Extract body types from an operation.

```ts
type ContractOperationBody<O extends AnyContractOperation>
```

### ContractOperationHeaders

Extract header types from an operation.

```ts
type ContractOperationHeaders<O extends AnyContractOperation>
```

## Response Types

### ContractOperationResponse

Response type that must match one of the contract's response schemas.

```ts
type ContractOperationResponse<O extends ContractOperation>
```

### ContractOperationStatusCodes

Extract valid status codes from an operation.

```ts
type ContractOperationStatusCodes<O extends ContractOperation>
```

### ContractOperationResponseBody

Extract body type for a specific status code and content type.

```ts
type ContractOperationResponseBody<
  O extends ContractOperation,
  S extends ContractOperationStatusCodes<O>,
  C extends string = 'application/json'
>
```

### ContractOperationResponseHeaders

Extract headers type for a specific status code and content type.

```ts
type ContractOperationResponseHeaders<
  O extends ContractOperation,
  S extends ContractOperationStatusCodes<O>,
  C extends string = 'application/json'
>
```

### ResponseVariant

Extract a specific response variant from the union by status code.

```ts
type ResponseVariant<
  O extends ContractOperation,
  S extends ContractOperationStatusCodes<O>
>
```

## Helper Types

### ExtractPathParams

Extract path parameters from a path string.

```ts
type ExtractPathParams<TPath extends string>
```

Example:
```ts
type Params = ExtractPathParams<"/users/:id/posts/:postId">;
// Type: { id: string; postId: string }
```

### ExtractContentTypes

Extract all valid content types for a given status code.

```ts
type ExtractContentTypes<
  O extends ContractOperation,
  S extends ContractOperationStatusCodes<O>
>
```

### RespondOptions

Options for the `respond()` method.

```ts
type RespondOptions<
  O extends ContractOperation,
  S extends ContractOperationStatusCodes<O>,
  C extends ExtractContentTypes<O, S> & string
>
```

## Router Types

### ContractRouterOptions

Options for `createRouter`.

```ts
interface ContractRouterOptions<
  TContract extends ContractDefinition,
  RequestType extends IRequest = IRequest,
  Args extends any[] = any[]
>
```

### ContractOperationHandler

Handler function type for a contract operation.

```ts
type ContractOperationHandler<
  O extends ContractOperation,
  Args extends any[] = any[]
> = (
  request: ContractRequest<O>,
  ...args: Args
) => Promise<ContractOperationResponse<O>>
```

## Schema Types

### ResponseSchema

Response schema structure with body and optional headers.

```ts
interface ResponseSchema<
  TBody extends StandardSchemaV1 = StandardSchemaV1,
  THeaders extends StandardSchemaV1 = StandardSchemaV1
>
```

### ResponseByContentType

Response schemas mapped by content type.

```ts
type ResponseByContentType = {
  [contentType: string]: ResponseSchema;
}
```

### RequestByContentType

Request schemas mapped by content type.

```ts
type RequestByContentType = {
  [contentType: string]: { body: StandardSchemaV1 };
}
```

## Utility Types

### EmptyObject

Canonical "empty object" type.

```ts
type EmptyObject = Record<string, never>
```

### RawQuery

Default query object type when no schema is provided.

```ts
type RawQuery = Record<string, string | string[] | undefined>
```

### TypedHeaders

Typed Headers interface that extends the standard Headers API.

```ts
type TypedHeaders<S extends HeaderSpec>
```

## Usage Examples

### Extract Types from Contract

```ts
import type {
  ContractOperationParameters,
  ContractOperationQuery,
  ContractOperationBody,
} from "itty-spec";

type Params = ContractOperationParameters<typeof contract.getUser>;
type Query = ContractOperationQuery<typeof contract.searchUsers>;
type Body = ContractOperationBody<typeof contract.createUser>;
```

### Type Handler Functions

```ts
import type { ContractOperationHandler } from "itty-spec";

const handler: ContractOperationHandler<typeof contract.getUser> = async (request) => {
  // request is fully typed
  const { id } = request.validatedParams;
  // ...
};
```

### Extract Response Types

```ts
import type { ContractOperationResponse } from "itty-spec";

type Response = ContractOperationResponse<typeof contract.getUser>;
// Type: { status: 200; body: User } | { status: 404; body: Error }
```

## Related

- [Type Safety Guide](/guide/type-safety) - Learn about type inference
- [Contracts Guide](/guide/contracts) - Understand contract types
- [API Overview](/api/) - See all API functions

