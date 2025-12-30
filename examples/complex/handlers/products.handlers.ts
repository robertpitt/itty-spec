import { productDb } from '../utils/database';
import { paginate } from '../utils/pagination';
import { productsContract } from '../contracts/products.contract';
import { defineHandlers } from '../../../src/contract';

/**
 * Product handlers - implement all product-related endpoints
 * Each handler is typed against its contract operation for full type safety
 */

export const productHandlers = defineHandlers(productsContract, {
  getProducts: async (request) => {
    const {
      page = 1,
      limit = 20,
      category,
      status,
      minPrice,
      maxPrice,
      inStock,
      search,
    } = request.validatedQuery || {};

    const filters = {
      category,
      status,
      minPrice,
      maxPrice,
      inStock,
      search,
    };

    const allProducts = productDb.findAll(filters);
    const result = paginate(allProducts, { page, limit });

    return request.respond({
      status: 200,
      contentType: 'application/json',
      body: {
        products: result.items,
        meta: result.meta,
      },
    });
  },

  getProductById: async (request) => {
    const { id } = request.validatedPathParams;
    const product = productDb.findById(id);

    if (!product) {
      return request.respond({
        status: 404,
        contentType: 'application/json',
        body: {
          error: 'Product not found',
          code: 'PRODUCT_NOT_FOUND',
        },
      });
    }

    return request.respond({
      status: 200,
      contentType: 'application/json',
      body: product,
    });
  },

  createProduct: async (request) => {
    const data = request.validatedBody;
    const product = productDb.create({
      name: data.name,
      description: data.description,
      price: data.price,
      currency: data.currency || 'USD',
      category: data.category,
      status: 'active',
      stock: data.stock || 0,
      sku: data.sku,
      tags: data.tags || [],
      images: data.images || [],
    });

    return request.respond({
      status: 201,
      contentType: 'application/json',
      body: product,
    });
  },

  updateProduct: async (request) => {
    const { id } = request.validatedPathParams;
    const data = request.validatedBody;

    const product = productDb.findById(id);
    if (!product) {
      return request.respond({
        status: 404,
        contentType: 'application/json',
        body: {
          error: 'Product not found',
          code: 'PRODUCT_NOT_FOUND',
        },
      });
    }

    const updated = productDb.update(id, data);
    if (!updated) {
      return request.respond({
        status: 404,
        contentType: 'application/json',
        body: {
          error: 'Product not found',
          code: 'PRODUCT_NOT_FOUND',
        },
      });
    }

    return request.respond({
      status: 200,
      contentType: 'application/json',
      body: updated,
    });
  },

  deleteProduct: async (request) => {
    const { id } = request.validatedPathParams;

    const product = productDb.findById(id);
    if (!product) {
      return request.respond({
        status: 404,
        contentType: 'application/json',
        body: {
          error: 'Product not found',
          code: 'PRODUCT_NOT_FOUND',
        },
      });
    }

    productDb.delete(id);

    return request.respond({
      status: 204,
      contentType: 'application/json',
      body: undefined,
    });
  },
});
