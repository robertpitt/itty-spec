import { createServerAdapter } from '@whatwg-node/server';
import { createServer } from 'http';
import { contract } from './contracts';
import { createOpenApiSpecification } from '../../src/openapi';
import { createRouter } from '../../src/index.ts';
import { userHandlers } from './handlers/users.handlers';
import { productHandlers } from './handlers/products.handlers';
import { orderHandlers } from './handlers/orders.handlers';
import { initializeSampleData } from './utils/database';
import { createSpotlightElementsHtml } from './utils/docs';
import { withAuth } from './middleware/auth.middleware';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Convert the contract to an OpenAPI specification
 */
const openApiSpecification = createOpenApiSpecification(contract, {
  title: 'Complex API',
  version: '1.0.0',
  description: readFileSync(join(import.meta.dirname, 'description.md'), 'utf8'),
  servers: [{ url: 'http://localhost:3000', description: 'Localhost' }],
  contact: {
    name: 'API Support',
    url: 'https://www.example.com/support',
    email: 'support@example.com',
  },
  license: {
    identifier: 'MIT',
    name: 'MIT License',
    url: 'https://opensource.org/licenses/MIT',
  },
  termsOfService: 'https://www.example.com/terms',
  tags: [
    { name: 'Users', description: 'User management endpoints' },
    { name: 'Products', description: 'Product management endpoints' },
    { name: 'Orders', description: 'Order management endpoints' },
  ],
});

/**
 * Initialize sample data
 */
initializeSampleData();

/**
 * Create router with all handlers
 */
const router = createRouter({
  contract,
  before: [
    // Add authentication middleware to all requests
    withAuth,
  ],
  handlers: {
    // User handlers
    getUsers: userHandlers.getUsers,
    getUserById: userHandlers.getUserById,
    createUser: userHandlers.createUser,
    updateUser: userHandlers.updateUser,
    deleteUser: userHandlers.deleteUser,
    getProducts: productHandlers.getProducts,
    getProductById: productHandlers.getProductById,
    createProduct: productHandlers.createProduct,
    updateProduct: productHandlers.updateProduct,
    deleteProduct: productHandlers.deleteProduct,
    getOrders: orderHandlers.getOrders,
    getOrderById: orderHandlers.getOrderById,
    createOrder: orderHandlers.createOrder,
    updateOrderStatus: orderHandlers.updateOrderStatus,
    getUserOrders: orderHandlers.getUserOrders,
    getSpec: async (request) => {
      return request.respond({
        status: 200,
        contentType: 'application/json',
        body: openApiSpecification as any,
      });
    },

    // Misc handlers
    getDocs: async (request) => {
      return request.respond({
        status: 200,
        contentType: 'text/html',
        body: createSpotlightElementsHtml(),
      });
    },
    healthCheck: async (request) => {
      return request.respond({
        status: 200,
        contentType: 'application/json',
        body: {
          status: 'ok',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      });
    },
  },
});

/**
 * Create server adapter and start server
 */
const adapter = createServerAdapter(router.fetch);
const server = createServer(adapter);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

server.listen(PORT, () => {
  console.log(`Complex API server is running on http://localhost:${PORT}`);
  console.log(`API Documentation: http://localhost:${PORT}/docs`);
  console.log(`Health Check: http://localhost:${PORT}/health`);
});
