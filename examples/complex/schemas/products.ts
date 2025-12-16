import { z } from 'zod/v4';
import { PaginationMeta } from './common';

/**
 * Product category enum
 */
export const ProductCategory = z
  .enum(['electronics', 'clothing', 'food', 'books', 'toys', 'other'])
  .meta({
    title: 'Product Category',
    description: 'The category of the product',
  });

/**
 * Product status enum
 */
export const ProductStatus = z.enum(['active', 'inactive', 'out_of_stock', 'discontinued']).meta({
  title: 'Product Status',
  description: 'The current status of the product',
});

/**
 * Product schema
 */
export const Product = z
  .object({
    id: z
      .string()
      .uuid()
      .meta({ title: 'Product ID', description: 'Unique identifier for the product' }),
    name: z
      .string()
      .min(1)
      .max(200)
      .meta({ title: 'Product Name', description: 'Name of the product' }),
    description: z
      .string()
      .max(5000)
      .optional()
      .meta({ title: 'Description', description: 'Product description' }),
    price: z.number().positive().meta({ title: 'Price', description: 'Product price in cents' }),
    currency: z
      .string()
      .length(3)
      .default('USD')
      .meta({ title: 'Currency', description: 'Currency code (ISO 4217)' }),
    category: ProductCategory.meta({ title: 'Category', description: 'Product category' }),
    status: ProductStatus.meta({ title: 'Status', description: 'Product status' }),
    stock: z
      .number()
      .int()
      .min(0)
      .meta({ title: 'Stock', description: 'Number of items in stock' }),
    sku: z
      .string()
      .min(1)
      .max(100)
      .meta({ title: 'SKU', description: 'Stock keeping unit identifier' }),
    tags: z.array(z.string()).default([]).meta({ title: 'Tags', description: 'Product tags' }),
    images: z
      .array(z.string().url())
      .default([])
      .meta({ title: 'Images', description: 'URLs of product images' }),
    createdAt: z
      .string()
      .datetime()
      .meta({ title: 'Created At', description: 'Product creation timestamp' }),
    updatedAt: z
      .string()
      .datetime()
      .meta({ title: 'Updated At', description: 'Last update timestamp' }),
  })
  .meta({ title: 'Product', description: 'Product information' });

/**
 * Create product request schema
 */
export const CreateProductRequest = z
  .object({
    name: z
      .string()
      .min(1)
      .max(200)
      .meta({ title: 'Product Name', description: 'Name of the product' }),
    description: z
      .string()
      .max(5000)
      .optional()
      .meta({ title: 'Description', description: 'Product description' }),
    price: z.number().positive().meta({ title: 'Price', description: 'Product price in cents' }),
    currency: z
      .string()
      .length(3)
      .default('USD')
      .optional()
      .meta({ title: 'Currency', description: 'Currency code' }),
    category: ProductCategory.meta({ title: 'Category', description: 'Product category' }),
    stock: z
      .number()
      .int()
      .min(0)
      .default(0)
      .optional()
      .meta({ title: 'Stock', description: 'Initial stock quantity' }),
    sku: z
      .string()
      .min(1)
      .max(100)
      .meta({ title: 'SKU', description: 'Stock keeping unit identifier' }),
    tags: z
      .array(z.string())
      .default([])
      .optional()
      .meta({ title: 'Tags', description: 'Product tags' }),
    images: z
      .array(z.string().url())
      .default([])
      .optional()
      .meta({ title: 'Images', description: 'URLs of product images' }),
  })
  .meta({ title: 'Create Product Request', description: 'Request to create a new product' });

/**
 * Update product request schema
 */
export const UpdateProductRequest = z
  .object({
    name: z
      .string()
      .min(1)
      .max(200)
      .optional()
      .meta({ title: 'Product Name', description: 'Name of the product' }),
    description: z
      .string()
      .max(5000)
      .optional()
      .meta({ title: 'Description', description: 'Product description' }),
    price: z
      .number()
      .positive()
      .optional()
      .meta({ title: 'Price', description: 'Product price in cents' }),
    currency: z
      .string()
      .length(3)
      .optional()
      .meta({ title: 'Currency', description: 'Currency code' }),
    category: ProductCategory.optional().meta({
      title: 'Category',
      description: 'Product category',
    }),
    status: ProductStatus.optional().meta({ title: 'Status', description: 'Product status' }),
    stock: z
      .number()
      .int()
      .min(0)
      .optional()
      .meta({ title: 'Stock', description: 'Stock quantity' }),
    sku: z
      .string()
      .min(1)
      .max(100)
      .optional()
      .meta({ title: 'SKU', description: 'Stock keeping unit identifier' }),
    tags: z.array(z.string()).optional().meta({ title: 'Tags', description: 'Product tags' }),
    images: z
      .array(z.string().url())
      .optional()
      .meta({ title: 'Images', description: 'URLs of product images' }),
  })
  .meta({ title: 'Update Product Request', description: 'Request to update product information' });

/**
 * Product response schema
 */
export const ProductResponse = Product.meta({
  title: 'Product Response',
  description: 'Product information response',
});

/**
 * Products list response schema
 */
export const ProductsListResponse = z
  .object({
    products: z.array(Product).meta({ title: 'Products', description: 'List of products' }),
    meta: PaginationMeta.meta({ title: 'Pagination', description: 'Pagination metadata' }),
  })
  .meta({ title: 'Products List Response', description: 'Paginated list of products' });

/**
 * Product query parameters for filtering
 */
export const ProductQueryParams = z
  .object({
    category: ProductCategory.optional().meta({
      title: 'Category Filter',
      description: 'Filter by product category',
    }),
    status: ProductStatus.optional().meta({
      title: 'Status Filter',
      description: 'Filter by product status',
    }),
    minPrice: z
      .string()
      .transform((val) => parseFloat(val))
      .pipe(z.number().nonnegative())
      .optional()
      .meta({ title: 'Min Price', description: 'Minimum price filter' }),
    maxPrice: z
      .string()
      .transform((val) => parseFloat(val))
      .pipe(z.number().nonnegative())
      .optional()
      .meta({ title: 'Max Price', description: 'Maximum price filter' }),
    inStock: z
      .string()
      .transform((val) => val === 'true')
      .pipe(z.boolean())
      .optional()
      .meta({ title: 'In Stock', description: 'Filter by availability' }),
    search: z
      .string()
      .min(1)
      .max(100)
      .optional()
      .meta({ title: 'Search', description: 'Search by name or SKU' }),
  })
  .meta({
    title: 'Product Query Parameters',
    description: 'Query parameters for filtering products',
  });
