import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { OpenAPIV3_1 } from 'openapi-types';
import {
  toOpenAPISchema,
  type ToOpenAPISchemaContext,
  type ToOpenAPISchemaFn,
} from '@standard-community/standard-openapi';

/**
 * Get default options for a schema based on its vendor
 */
function getDefaultOptionsForSchema(schema: StandardSchemaV1): Partial<ToOpenAPISchemaContext> {
  if (!schema || typeof schema !== 'object' || !('~standard' in schema)) {
    return {};
  }

  const standard = schema['~standard'];
  if (!standard || typeof standard !== 'object') {
    return {};
  }

  const vendor = standard.vendor;
  if (!vendor || typeof vendor !== 'string') {
    return {};
  }

  // Vendor-specific default options
  const vendorDefaults: Record<string, Partial<ToOpenAPISchemaContext>> = {
    zod: {
      options: {
        io: 'input',
        unrepresentable: 'any', // Handle void and other unrepresentable types
      },
    },
    valibot: {
      options: {
        io: 'input',
        // Add valibot-specific options here if needed
      },
    },
  };

  return vendorDefaults[vendor] || {};
}

/**
 * Merge context options with vendor defaults
 */
function mergeContextWithDefaults(
  schema: StandardSchemaV1,
  context?: Partial<ToOpenAPISchemaContext>
): Partial<ToOpenAPISchemaContext> {
  const defaults = getDefaultOptionsForSchema(schema);

  // Deep merge options if both have options
  if (defaults.options && context?.options) {
    return {
      ...defaults,
      ...context,
      options: {
        ...defaults.options,
        ...context.options,
      },
    };
  }

  // Simple merge if no options conflict
  return {
    ...defaults,
    ...context,
  };
}

/**
 * Extract OpenAPI schema from a StandardSchemaV1 schema (async)
 *
 * Uses @standard-community/standard-openapi to convert schemas.
 * This is an alias for extractSchemaAsync for backward compatibility.
 *
 * @deprecated Use extractSchemaAsync instead
 * @param schema StandardSchemaV1 compatible schema
 * @returns Promise resolving to OpenAPI 3.1 SchemaObject
 */
export async function extractSchema(schema: StandardSchemaV1): Promise<OpenAPIV3_1.SchemaObject> {
  const result = await extractSchemaAsync(schema);
  return result.schema;
}

/**
 * Extract OpenAPI schema from a StandardSchemaV1 schema (async)
 *
 * Uses @standard-community/standard-openapi to convert schemas.
 * Automatically applies vendor-specific default options (e.g., unrepresentable: 'any' for Zod).
 *
 * @param schema StandardSchemaV1 compatible schema
 * @param context Optional context for schema conversion (merged with vendor defaults)
 * @returns Promise resolving to OpenAPI 3.1 SchemaObject and components
 */
export async function extractSchemaAsync(
  schema: StandardSchemaV1,
  context?: Partial<ToOpenAPISchemaContext>
): Promise<{
  schema: OpenAPIV3_1.SchemaObject;
  components: OpenAPIV3_1.ComponentsObject | undefined;
}> {
  // Merge vendor defaults with provided context
  const mergedContext = mergeContextWithDefaults(schema, context);

  const result = await toOpenAPISchema(schema, mergedContext);
  // Cast to our types since standard-openapi uses openapi-types which has slightly different types
  return {
    schema: result.schema as OpenAPIV3_1.SchemaObject,
    components: result.components as OpenAPIV3_1.ComponentsObject | undefined,
  };
}

/**
 * Extract raw JSON Schema from a StandardSchemaV1 schema (before OpenAPI conversion)
 * This is used to extract definitions that may be present in the JSON Schema
 *
 * Note: With standard-openapi, definitions are returned in the components object.
 * This function extracts them for backward compatibility.
 * Automatically applies vendor-specific default options.
 *
 * @param schema StandardSchemaV1 compatible schema
 * @returns Raw JSON Schema object (may include definitions property)
 * @throws Error if schema is invalid or vendor is not supported
 */
export async function extractRawJsonSchema(schema: StandardSchemaV1): Promise<any> {
  // Apply vendor defaults
  const defaults = getDefaultOptionsForSchema(schema);
  const result = await toOpenAPISchema(schema, defaults);

  // Convert components back to definitions format for backward compatibility
  const raw: any = {};
  if (result.components?.schemas) {
    raw.definitions = {};
    for (const [name, schemaObj] of Object.entries(result.components.schemas)) {
      raw.definitions[name] = schemaObj;
    }
  }

  return raw;
}

// Re-export types from standard-openapi
export type { ToOpenAPISchemaContext, ToOpenAPISchemaFn };

// Re-export loadVendor for custom vendor support
export { loadVendor } from '@standard-community/standard-openapi';
