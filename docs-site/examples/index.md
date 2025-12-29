# Examples

This project includes several example implementations to help you get started with `itty-spec`.

## Getting Started

- **[Simple Example](/examples/simple)** - Basic contract and router setup
- **[Complex Example](/examples/complex)** - Multi-domain API with authentication

## Schema Libraries

- **[Valibot Example](/examples/valibot)** - Using Valibot instead of Zod

## Advanced Patterns

- **[Content Types](/examples/content-types)** - Multiple content types and content negotiation
- **[Authentication](/examples/authentication)** - Authentication middleware patterns
- **[File Upload](/examples/file-upload)** - Handling file uploads

## Example Features

### Simple Example

**Difficulty**: Beginner  
**Features**: Basic contracts, handlers, content negotiation, OpenAPI

A basic example showing:
- Contract definition
- Handler implementation
- Type inference
- Content negotiation
- OpenAPI generation

[View Example →](/examples/simple)

### Complex Example

**Difficulty**: Intermediate  
**Features**: Multi-domain, authentication, pagination, database patterns

A comprehensive example demonstrating:
- Multiple contracts organized by domain
- Authentication middleware
- Pagination utilities
- Database integration
- Error handling patterns
- OpenAPI specification

[View Example →](/examples/complex)

### Valibot Example

**Difficulty**: Beginner  
**Features**: Valibot schemas, OpenAPI generation

An example using Valibot instead of Zod:
- Valibot schema definitions
- Similar patterns to Zod
- OpenAPI generation support

[View Example →](/examples/valibot)

## Running Examples

All examples can be run locally:

```bash
# Navigate to example directory
cd examples/simple

# Install dependencies
npm install

# Run the example
npm run dev
```

## Repository

For complete working examples, check out the [examples directory](https://github.com/robertpitt/itty-spec/tree/main/examples) in the repository.

