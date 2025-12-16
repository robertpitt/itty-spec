import { createContract } from '../../../src/index.ts';
import { z } from 'zod/v4';
import {
  CreateProductRequest,
  UpdateProductRequest,
  ProductResponse,
  ProductsListResponse,
  ProductQueryParams,
  ErrorResponse,
  AuthHeaders,
  IdParam,
  PaginationQuery,
} from '../schemas';

/**
 * Products contract - defines all product-related API endpoints
 */
export const productsContract = createContract({
  getProducts: {
    path: '/products',
    method: 'GET',
    summary: 'List Products',
    description: 'Retrieve a paginated list of products with optional filtering',
    query: PaginationQuery.extend(ProductQueryParams.shape),
    responses: {
      200: {
        'application/json': {
          body: ProductsListResponse,
          headers: z.object({ 'content-type': z.literal('application/json') }),
        },
      },
    },
    tags: ['Products'],
  },
  getProductById: {
    path: '/products/:id',
    method: 'GET',
    summary: 'Get Product by ID',
    description: 'Retrieve a specific product by its ID',
    pathParams: IdParam,
    responses: {
      200: {
        'application/json': {
          body: ProductResponse,
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
    tags: ['Products'],
  },
  createProduct: {
    path: '/products',
    method: 'POST',
    summary: 'Create Product',
    description: 'Create a new product',
    headers: AuthHeaders,
    requests: {
      'application/json': {
        body: CreateProductRequest,
      },
    },
    responses: {
      201: {
        'application/json': {
          body: ProductResponse,
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
    },
    tags: ['Products'],
  },
  updateProduct: {
    path: '/products/:id',
    method: 'PATCH',
    summary: 'Update Product',
    description: 'Update an existing product',
    headers: AuthHeaders,
    pathParams: IdParam,
    requests: {
      'application/json': {
        body: UpdateProductRequest,
      },
    },
    responses: {
      200: {
        'application/json': {
          body: ProductResponse,
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
    tags: ['Products'],
  },
  deleteProduct: {
    path: '/products/:id',
    method: 'DELETE',
    summary: 'Delete Product',
    description: 'Delete a product',
    headers: AuthHeaders,
    pathParams: IdParam,
    responses: {
      204: {
        'application/json': {
          body: z.void(),
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
    tags: ['Products'],
  },
});
