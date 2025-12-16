import { z } from 'zod/v4';
import { PaginationMeta } from './common';

/**
 * Order status enum
 */
export const OrderStatus = z
  .enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
  .meta({
    title: 'Order Status',
    description: 'The current status of the order',
  });

/**
 * Payment method enum
 */
export const PaymentMethod = z
  .enum(['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash'])
  .meta({
    title: 'Payment Method',
    description: 'The payment method used for the order',
  });

/**
 * Order item schema
 */
export const OrderItem = z
  .object({
    productId: z
      .string()
      .uuid()
      .meta({ title: 'Product ID', description: 'Identifier of the product' }),
    productName: z
      .string()
      .meta({ title: 'Product Name', description: 'Name of the product at time of order' }),
    quantity: z
      .number()
      .int()
      .positive()
      .meta({ title: 'Quantity', description: 'Number of items ordered' }),
    price: z.number().positive().meta({ title: 'Price', description: 'Price per item in cents' }),
    subtotal: z
      .number()
      .positive()
      .meta({ title: 'Subtotal', description: 'Total for this line item in cents' }),
  })
  .meta({ title: 'Order Item', description: 'An item within an order' });

/**
 * Order schema
 */
export const Order = z
  .object({
    id: z
      .string()
      .uuid()
      .meta({ title: 'Order ID', description: 'Unique identifier for the order' }),
    userId: z
      .string()
      .uuid()
      .meta({ title: 'User ID', description: 'Identifier of the user who placed the order' }),
    items: z.array(OrderItem).min(1).meta({ title: 'Items', description: 'Items in the order' }),
    status: OrderStatus.meta({ title: 'Status', description: 'Current order status' }),
    subtotal: z
      .number()
      .nonnegative()
      .meta({ title: 'Subtotal', description: 'Subtotal in cents' }),
    tax: z.number().nonnegative().meta({ title: 'Tax', description: 'Tax amount in cents' }),
    shipping: z
      .number()
      .nonnegative()
      .meta({ title: 'Shipping', description: 'Shipping cost in cents' }),
    total: z.number().nonnegative().meta({ title: 'Total', description: 'Total amount in cents' }),
    currency: z
      .string()
      .length(3)
      .default('USD')
      .meta({ title: 'Currency', description: 'Currency code (ISO 4217)' }),
    paymentMethod: PaymentMethod.meta({
      title: 'Payment Method',
      description: 'Payment method used',
    }),
    shippingAddress: z
      .object({
        street: z.string().min(1).max(200),
        city: z.string().min(1).max(100),
        state: z.string().min(1).max(100),
        zipCode: z.string().min(1).max(20),
        country: z.string().length(2),
      })
      .meta({ title: 'Shipping Address', description: 'Shipping address for the order' }),
    createdAt: z
      .string()
      .datetime()
      .meta({ title: 'Created At', description: 'Order creation timestamp' }),
    updatedAt: z
      .string()
      .datetime()
      .meta({ title: 'Updated At', description: 'Last update timestamp' }),
  })
  .meta({ title: 'Order', description: 'Order information' });

/**
 * Create order request schema
 */
export const CreateOrderRequest = z
  .object({
    items: z
      .array(
        z.object({
          productId: z
            .string()
            .uuid()
            .meta({ title: 'Product ID', description: 'Identifier of the product' }),
          quantity: z
            .number()
            .int()
            .positive()
            .meta({ title: 'Quantity', description: 'Number of items to order' }),
        })
      )
      .min(1)
      .meta({ title: 'Items', description: 'Items to include in the order' }),
    paymentMethod: PaymentMethod.meta({
      title: 'Payment Method',
      description: 'Payment method to use',
    }),
    shippingAddress: z
      .object({
        street: z.string().min(1).max(200).meta({ title: 'Street', description: 'Street address' }),
        city: z.string().min(1).max(100).meta({ title: 'City', description: 'City name' }),
        state: z
          .string()
          .min(1)
          .max(100)
          .meta({ title: 'State', description: 'State or province' }),
        zipCode: z.string().min(1).max(20).meta({ title: 'Zip Code', description: 'Postal code' }),
        country: z
          .string()
          .length(2)
          .meta({ title: 'Country', description: 'Country code (ISO 3166-1 alpha-2)' }),
      })
      .meta({ title: 'Shipping Address', description: 'Shipping address for the order' }),
  })
  .meta({ title: 'Create Order Request', description: 'Request to create a new order' });

/**
 * Update order status request schema
 */
export const UpdateOrderStatusRequest = z
  .object({
    status: OrderStatus.meta({ title: 'Status', description: 'New order status' }),
  })
  .meta({ title: 'Update Order Status Request', description: 'Request to update order status' });

/**
 * Order response schema
 */
export const OrderResponse = Order.meta({
  title: 'Order Response',
  description: 'Order information response',
});

/**
 * Orders list response schema
 */
export const OrdersListResponse = z
  .object({
    orders: z.array(Order).meta({ title: 'Orders', description: 'List of orders' }),
    meta: PaginationMeta.meta({ title: 'Pagination', description: 'Pagination metadata' }),
  })
  .meta({ title: 'Orders List Response', description: 'Paginated list of orders' });

/**
 * Order query parameters for filtering
 */
export const OrderQueryParams = z
  .object({
    status: OrderStatus.optional().meta({
      title: 'Status Filter',
      description: 'Filter by order status',
    }),
    userId: z
      .string()
      .uuid()
      .optional()
      .meta({ title: 'User ID Filter', description: 'Filter by user ID' }),
    minTotal: z
      .string()
      .transform((val) => parseFloat(val))
      .pipe(z.number().nonnegative())
      .optional()
      .meta({ title: 'Min Total', description: 'Minimum order total filter' }),
    maxTotal: z
      .string()
      .transform((val) => parseFloat(val))
      .pipe(z.number().nonnegative())
      .optional()
      .meta({ title: 'Max Total', description: 'Maximum order total filter' }),
    startDate: z
      .string()
      .datetime()
      .optional()
      .meta({ title: 'Start Date', description: 'Filter orders from this date' }),
    endDate: z
      .string()
      .datetime()
      .optional()
      .meta({ title: 'End Date', description: 'Filter orders until this date' }),
  })
  .meta({ title: 'Order Query Parameters', description: 'Query parameters for filtering orders' });
