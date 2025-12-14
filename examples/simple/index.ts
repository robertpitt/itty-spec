import { createServerAdapter } from '@whatwg-node/server';
import { createServer } from 'http';
import { contract } from './contract';
import { createOpenApiSpecification } from '../../src/openapi';
import { createRouter } from '../../src/index.ts';

/**
 * Convert the contract to an OpenAPI specification so we can serve it from the router
 */
const openApiSpecification = createOpenApiSpecification(contract, {
  title: 'Simple API',
  version: '1.0.0',
  // markdown description showing of the markdown syntax
  description: `
  # Simple API
  This is a simple API that demonstrates the use of the contract-router library.
  It is a basic API that allows you to calculate the sum of two numbers.
  It also provides a documentation endpoint that allows you to view the API documentation.

  ## Calculating the sum of two numbers
  To calculate the sum of two numbers, you can use the following endpoint:
  \`\`\`
  GET /calculate
  \`\`\`
  The request body should be a JSON object with the following properties:
  \`\`\`
  { "a": 1, "b": 2 }
  \`\`\`
  The response will be a JSON object with the following properties:
  `
});

/**
 * We use an embedded elements
 */
const openApiSpecificationHtml = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>API Documentation</title>
    <script src="https://unpkg.com/@stoplight/elements/web-components.min.js"></script>
    <link rel="stylesheet" href="https://unpkg.com/@stoplight/elements/styles.min.css">
  </head>
  <body>
    <elements-api id="docs" router="hash" layout="sidebar"></elements-api>
    <script>
    (async () => {
      const docs = document.getElementById('docs');
      docs.apiDescriptionDocument = ${JSON.stringify(openApiSpecification)};;
    })();
    </script>
  </body>
</html>`;

const router = createRouter({
  contract,
  handlers: {
    getCalculate: async (request) => {
      const result = request.validatedQuery.a + request.validatedQuery.b;
      return result > 100
        ? request.json({ error: 'Invalid request' }, 400)
        : request.json({ result: result }, 200);
    },
    postCalculate: async (request) => {
      const result = request.validatedBody.a + request.validatedBody.b;
      return result > 100
        ? request.json({ error: 'Invalid request' }, 400)
        : request.json({ result: result }, 200);
    },
    getDocs: async (request) => {
      return request.html(openApiSpecificationHtml);
    },
  },
});

const adapter = createServerAdapter(router.fetch);
const server = createServer(adapter);

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
