import { createContract } from '../../../src/index.ts';
import { z } from 'zod/v4';
import {
  CreateOrderRequest,
  UpdateOrderStatusRequest,
  OrderResponse,
  OrdersListResponse,
  OrderQueryParams,
  ErrorResponse,
  AuthHeaders,
  IdParam,
  PaginationQuery,
} from '../schemas';

/**
 * Orders contract - defines all order-related API endpoints
 */
export const ordersContract = createContract({
  getOrders: {
    path: '/orders',
    method: 'GET',
    summary: 'List Orders',
    description: 'Retrieve a paginated list of orders with optional filtering',
    headers: AuthHeaders,
    query: PaginationQuery.extend(OrderQueryParams.shape),
    responses: {
      200: {
        'application/json': {
          body: OrdersListResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
      401: {
        'application/json': {
          body: ErrorResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
    },
    tags: ['Orders'],
  },
  getOrderById: {
    path: '/orders/:id',
    method: 'GET',
    summary: 'Get Order by ID',
    description: 'Retrieve a specific order by its ID',
    headers: AuthHeaders,
    pathParams: IdParam,
    responses: {
      200: {
        'application/json': {
          body: OrderResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
      401: {
        'application/json': {
          body: ErrorResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
      403: {
        'application/json': {
          body: ErrorResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
      404: {
        'application/json': {
          body: ErrorResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
    },
    tags: ['Orders'],
  },
  createOrder: {
    path: '/orders',
    method: 'POST',
    summary: 'Create Order',
    description: 'Create a new order',
    headers: AuthHeaders,
    requests: {
      'application/json': {
        body: CreateOrderRequest,
      },
    },
    responses: {
      201: {
        'application/json': {
          body: OrderResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
      400: {
        'application/json': {
          body: ErrorResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
      401: {
        'application/json': {
          body: ErrorResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
      404: {
        'application/json': {
          body: ErrorResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
    },
    tags: ['Orders'],
  },
  updateOrderStatus: {
    path: '/orders/:id/status',
    method: 'PATCH',
    summary: 'Update Order Status',
    description: 'Update the status of an existing order',
    headers: AuthHeaders,
    pathParams: IdParam,
    requests: {
      'application/json': {
        body: UpdateOrderStatusRequest,
      },
    },
    responses: {
      200: {
        'application/json': {
          body: OrderResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
      400: {
        'application/json': {
          body: ErrorResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
      401: {
        'application/json': {
          body: ErrorResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
      403: {
        'application/json': {
          body: ErrorResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
      404: {
        'application/json': {
          body: ErrorResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
    },
    tags: ['Orders'],
  },
  getUserOrders: {
    path: '/users/:id/orders',
    method: 'GET',
    summary: 'Get User Orders',
    description: 'Retrieve all orders for a specific user',
    headers: AuthHeaders,
    pathParams: IdParam,
    query: PaginationQuery.extend(
      z.object({
        status: OrderQueryParams.shape.status.optional(),
      }).shape
    ),
    responses: {
      200: {
        'application/json': {
          body: OrdersListResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
      401: {
        'application/json': {
          body: ErrorResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
      403: {
        'application/json': {
          body: ErrorResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
      404: {
        'application/json': {
          body: ErrorResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
    },
    tags: ['Orders', 'Users'],
  },
});
