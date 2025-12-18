import { createServerAdapter } from '@whatwg-node/server';
import { createServer } from 'http';
import { contract } from './contract';
import { createOpenApiSpecification } from '../../src/openapi';
import { createRouter } from '../../src/index.ts';
import {
  createSpotlightElementsHtml,
  formatCalculateResponseXML,
  formatCalculateErrorXML,
  formatCalculateResponseHTML,
  formatCalculateErrorHTML,
} from './utils.ts';
import { IRequest } from 'itty-router';

/**
 * Convert the contract to an OpenAPI specification so we can serve it from the router
 */
const openApiSpecification = createOpenApiSpecification(contract, {
  title: 'Simple API',
  version: '1.0.0',
  // markdown description showing of the markdown syntax
  description: `# Simple API\nThis is a simple API that demonstrates the use of the contract-router library.\nIt is a basic API that allows you to calculate the sum of two numbers.\nIt also provides a documentation endpoint that allows you to view the API documentation.\n## Calculating the sum of two numbers\nTo calculate the sum of two numbers, you can use the following endpoint:`,
});

export type ExampleContext = {
  version: 1;
};

const router = createRouter<typeof contract, IRequest, [ExampleContext]>({
  contract,
  handlers: {
    getCalculate: async (request, _context) => {
      // Args are now properly propagated - context is available as the 2nd argument
      const result = request.validatedQuery.a + request.validatedQuery.b;
      // Headers are normalized to lowercase in types and runtime, regardless of how they're defined in the schema
      const contentType = request.validatedHeaders.get('content-type');

      if (result > 100) {
        const errorMessage = 'Invalid request';
        if (contentType === 'text/html') {
          return request.respond({
            status: 400,
            contentType: 'text/html',
            body: formatCalculateErrorHTML(errorMessage),
          });
        }
        if (contentType === 'application/xml') {
          return request.respond({
            status: 400,
            contentType: 'application/xml',
            body: formatCalculateErrorXML(errorMessage),
          });
        }
        return request.respond({
          status: 400,
          contentType: 'application/json',
          body: { error: errorMessage },
        });
      }

      if (contentType === 'text/html') {
        return request.respond({
          status: 200,
          contentType: 'text/html',
          body: formatCalculateResponseHTML(result),
        });
      }
      if (contentType === 'application/xml') {
        return request.respond({
          status: 200,
          contentType: 'application/xml',
          body: formatCalculateResponseXML(result),
        });
      }
      return request.respond({
        status: 200,
        contentType: 'application/json',
        body: { result: result },
      });
    },
    postCalculate: async (request) => {
      const result = request.validatedBody.a + request.validatedBody.b;

      if (result > 100) {
        const errorMessage = 'Invalid request';
        return request.respond({
          status: 400,
          contentType: 'application/json',
          body: { error: errorMessage },
        });
      }

      return request.respond({
        status: 200,
        contentType: 'application/json',
        body: { result: result },
      });
    },
    getDocs: async (request) => {
      return request.respond({
        status: 200,
        contentType: 'text/html',
        body: createSpotlightElementsHtml(openApiSpecification),
      });
    },
  },
});

const adapter = createServerAdapter((request) => router.fetch(request, { version: 1 }));
const server = createServer(adapter);

server.listen(3000, () => {
  console.log('Server is running on port http://localhost:3000');
});
