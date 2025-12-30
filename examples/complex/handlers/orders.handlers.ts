import { z } from 'zod/v4';
import { orderDb, productDb } from '../utils/database';
import { paginate } from '../utils/pagination';
import { OrderItem } from '../schemas/orders';
import { ordersContract } from '../contracts/orders.contract';
import { defineHandlers } from '../../../src/contract';

type OrderItemType = z.infer<typeof OrderItem>;

/**
 * Order handlers - implement all order-related endpoints
 * Each handler is typed against its contract operation for full type safety
 */

export const orderHandlers = defineHandlers(ordersContract, {
  getOrders: async (request) => {
    const {
      page = 1,
      limit = 20,
      status,
      userId: filterUserId,
      minTotal,
      maxTotal,
      startDate,
      endDate,
    } = request.validatedQuery || {};

    const filters: any = {
      status,
      minTotal,
      maxTotal,
      startDate,
      endDate,
    };

    if (filterUserId) {
      filters.userId = filterUserId;
    }

    const allOrders = orderDb.findAll(filters);
    const result = paginate(allOrders, { page, limit });

    return request.respond({
      status: 200,
      contentType: 'application/json',
      body: {
        orders: result.items,
        meta: result.meta,
      },
    });
  },

  getOrderById: async (request) => {
    const { id } = request.validatedPathParams;
    const order = orderDb.findById(id);

    if (!order) {
      return request.respond({
        status: 404,
        contentType: 'application/json',
        body: {
          error: 'Order not found',
          code: 'ORDER_NOT_FOUND',
        },
      });
    }

    return request.respond({
      status: 200,
      contentType: 'application/json',
      body: order,
    });
  },

  createOrder: async (request) => {
    const data = request.validatedBody;

    // Validate products exist and calculate totals
    const items: OrderItemType[] = [];
    let subtotal = 0;

    for (const item of data.items) {
      const product = productDb.findById(item.productId);
      if (!product) {
        return request.respond({
          status: 404,
          contentType: 'application/json',
          body: {
            error: `Product not found: ${item.productId}`,
            code: 'PRODUCT_NOT_FOUND',
          },
        });
      }

      if (product.stock < item.quantity) {
        return request.respond({
          status: 400,
          contentType: 'application/json',
          body: {
            error: `Insufficient stock for product: ${product.name}`,
            code: 'INSUFFICIENT_STOCK',
          },
        });
      }

      const itemSubtotal = product.price * item.quantity;
      subtotal += itemSubtotal;

      items.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        price: product.price,
        subtotal: itemSubtotal,
      });
    }

    // Calculate tax and shipping (simplified)
    const tax = Math.round(subtotal * 0.1); // 10% tax
    const shipping = 1000; // $10.00 flat shipping
    const total = subtotal + tax + shipping;

    const order = orderDb.create({
      userId: request.userId || 'mock-user-id',
      items,
      status: 'pending',
      subtotal,
      tax,
      shipping,
      total,
      currency: 'USD',
      paymentMethod: data.paymentMethod,
      shippingAddress: data.shippingAddress,
    });

    return request.respond({
      status: 201,
      contentType: 'application/json',
      body: order,
    });
  },

  updateOrderStatus: async (request) => {
    const { id } = request.validatedPathParams;
    const { status } = request.validatedBody;

    const order = orderDb.findById(id);
    if (!order) {
      return request.respond({
        status: 404,
        contentType: 'application/json',
        body: {
          error: 'Order not found',
          code: 'ORDER_NOT_FOUND',
        },
      });
    }

    const updated = orderDb.update(id, { status });
    if (!updated) {
      return request.respond({
        status: 404,
        contentType: 'application/json',
        body: {
          error: 'Order not found',
          code: 'ORDER_NOT_FOUND',
        },
      });
    }

    return request.respond({
      status: 200,
      contentType: 'application/json',
      body: updated,
    });
  },

  getUserOrders: async (request) => {
    const { id } = request.validatedPathParams;
    const { page = 1, limit = 20, status } = request.validatedQuery || {};

    const filters: any = { userId: id };
    if (status) {
      filters.status = status;
    }

    const allOrders = orderDb.findAll(filters);
    const result = paginate(allOrders, { page, limit });

    return request.respond({
      status: 200,
      contentType: 'application/json',
      body: {
        orders: result.items,
        meta: result.meta,
      },
    });
  },
});
