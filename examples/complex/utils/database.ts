/**
 * In-memory database simulation
 * In a real application, this would connect to an actual database
 */

import { z } from 'zod/v4';
import { User, Product, Order } from '../schemas';

type User = z.infer<typeof User>;
type Product = z.infer<typeof Product>;
type Order = z.infer<typeof Order>;

// In-memory stores
const users: Map<string, User> = new Map();
const products: Map<string, Product> = new Map();
const orders: Map<string, Order> = new Map();

/**
 * Generate a UUID v4
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Users database operations
 */
export const userDb = {
  findAll: (filters?: { role?: string; status?: string; search?: string }): User[] => {
    let results = Array.from(users.values());

    if (filters?.role) {
      results = results.filter((u) => u.role === filters.role);
    }
    if (filters?.status) {
      results = results.filter((u) => u.status === filters.status);
    }
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      results = results.filter(
        (u) =>
          u.email.toLowerCase().includes(searchLower) ||
          u.username.toLowerCase().includes(searchLower)
      );
    }

    return results;
  },
  findById: (id: string): User | undefined => {
    return users.get(id);
  },
  findByEmail: (email: string): User | undefined => {
    return Array.from(users.values()).find((u) => u.email === email);
  },
  create: (data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User => {
    const user: User = {
      ...data,
      id: generateId(),
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    };
    users.set(user.id, user);
    return user;
  },
  update: (
    id: string,
    data: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>
  ): User | null => {
    const user = users.get(id);
    if (!user) return null;

    const updated: User = {
      ...user,
      ...data,
      updatedAt: getCurrentTimestamp(),
    };
    users.set(id, updated);
    return updated;
  },
  delete: (id: string): boolean => {
    return users.delete(id);
  },
};

/**
 * Products database operations
 */
export const productDb = {
  findAll: (filters?: {
    category?: string;
    status?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    search?: string;
  }): Product[] => {
    let results = Array.from(products.values());

    if (filters?.category) {
      results = results.filter((p) => p.category === filters.category);
    }
    if (filters?.status) {
      results = results.filter((p) => p.status === filters.status);
    }
    if (filters?.minPrice !== undefined) {
      results = results.filter((p) => p.price >= filters.minPrice!);
    }
    if (filters?.maxPrice !== undefined) {
      results = results.filter((p) => p.price <= filters.maxPrice!);
    }
    if (filters?.inStock !== undefined) {
      results = results.filter((p) => (filters.inStock ? p.stock > 0 : p.stock === 0));
    }
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) || p.sku.toLowerCase().includes(searchLower)
      );
    }

    return results;
  },
  findById: (id: string): Product | undefined => {
    return products.get(id);
  },
  create: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product => {
    const product: Product = {
      ...data,
      id: generateId(),
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    };
    products.set(product.id, product);
    return product;
  },
  update: (
    id: string,
    data: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>
  ): Product | null => {
    const product = products.get(id);
    if (!product) return null;

    const updated: Product = {
      ...product,
      ...data,
      updatedAt: getCurrentTimestamp(),
    };
    products.set(id, updated);
    return updated;
  },
  delete: (id: string): boolean => {
    return products.delete(id);
  },
};

/**
 * Orders database operations
 */
export const orderDb = {
  findAll: (filters?: {
    status?: string;
    userId?: string;
    minTotal?: number;
    maxTotal?: number;
    startDate?: string;
    endDate?: string;
  }): Order[] => {
    let results = Array.from(orders.values());

    if (filters?.status) {
      results = results.filter((o) => o.status === filters.status);
    }
    if (filters?.userId) {
      results = results.filter((o) => o.userId === filters.userId);
    }
    if (filters?.minTotal !== undefined) {
      results = results.filter((o) => o.total >= filters.minTotal!);
    }
    if (filters?.maxTotal !== undefined) {
      results = results.filter((o) => o.total <= filters.maxTotal!);
    }
    if (filters?.startDate) {
      results = results.filter((o) => o.createdAt >= filters.startDate!);
    }
    if (filters?.endDate) {
      results = results.filter((o) => o.createdAt <= filters.endDate!);
    }

    return results;
  },
  findById: (id: string): Order | undefined => {
    return orders.get(id);
  },
  create: (data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Order => {
    const order: Order = {
      ...data,
      id: generateId(),
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    };
    orders.set(order.id, order);
    return order;
  },
  update: (
    id: string,
    data: Partial<Omit<Order, 'id' | 'createdAt' | 'updatedAt'>>
  ): Order | null => {
    const order = orders.get(id);
    if (!order) return null;

    const updated: Order = {
      ...order,
      ...data,
      updatedAt: getCurrentTimestamp(),
    };
    orders.set(id, updated);
    return updated;
  },
};

/**
 * Initialize with sample data
 */
export function initializeSampleData() {
  // Create sample users
  const _adminUser = userDb.create({
    email: 'admin@example.com',
    username: 'admin',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    status: 'active',
  });

  const regularUser = userDb.create({
    email: 'user@example.com',
    username: 'user',
    firstName: 'Regular',
    lastName: 'User',
    role: 'user',
    status: 'active',
  });

  // Create sample products
  const product1 = productDb.create({
    name: 'Laptop',
    description: 'High-performance laptop',
    price: 99900, // $999.00 in cents
    currency: 'USD',
    category: 'electronics',
    status: 'active',
    stock: 10,
    sku: 'LAP-001',
    tags: ['electronics', 'computers'],
    images: ['https://example.com/laptop.jpg'],
  });

  const _product2 = productDb.create({
    name: 'T-Shirt',
    description: 'Comfortable cotton t-shirt',
    price: 1999, // $19.99 in cents
    currency: 'USD',
    category: 'clothing',
    status: 'active',
    stock: 50,
    sku: 'TSH-001',
    tags: ['clothing', 'apparel'],
    images: ['https://example.com/tshirt.jpg'],
  });

  // Create sample order
  orderDb.create({
    userId: regularUser.id,
    items: [
      {
        productId: product1.id,
        productName: product1.name,
        quantity: 1,
        price: product1.price,
        subtotal: product1.price,
      },
    ],
    status: 'pending',
    subtotal: product1.price,
    tax: Math.round(product1.price * 0.1), // 10% tax
    shipping: 1000, // $10.00 shipping
    total: product1.price + Math.round(product1.price * 0.1) + 1000,
    currency: 'USD',
    paymentMethod: 'credit_card',
    shippingAddress: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'US',
    },
  });
}
