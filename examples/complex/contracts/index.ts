import { createContract } from '../../../src/index.ts';
import { z } from 'zod/v4';
import { usersContract } from './users.contract';
import { productsContract } from './products.contract';
import { ordersContract } from './orders.contract';

/**
 * Main contract combining all domain contracts
 * This allows for a single contract definition that can be used with the router
 */
export const contract = createContract({
  ...usersContract,
  ...productsContract,
  ...ordersContract,
  getSpec: {
    path: '/spec',
    method: 'GET',
    summary: 'Get the OpenAPI specification',
    description: 'Get the OpenAPI specification',
    responses: {
      200: {
        'application/json': {
          body: z.object({ spec: z.any() }),
        },
      },
    },
  },
  getDocs: {
    path: '/docs',
    method: 'GET',
    title: 'OpenAPI Documentation',
    description: 'This endpoint provides a public API for the OpenAPI specification',
    summary: 'Get the OpenAPI specification',
    tags: ['Misc'],
    responses: {
      200: {
        'text/html': {
          body: z
            .string()
            .meta({ title: 'OpenAPI Specification', description: 'The OpenAPI specification' }),
          headers: z.object({ 'content-type': z.literal('text/html') }),
        },
      },
    },
  },
  healthCheck: {
    path: '/health',
    method: 'GET',
    summary: 'Health Check',
    description: 'Check the health status of the API',
    responses: {
      200: {
        'application/json': {
          body: z
            .object({
              status: z.literal('ok'),
              timestamp: z.string().datetime(),
              version: z.string(),
            })
            .meta({ title: 'Health Check Response', description: 'API health status' }),
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
    },
    tags: ['Misc'],
  },
});

export default contract;
