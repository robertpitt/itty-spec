import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { OpenAPIV3_1 } from './types';
import { createRequire } from 'module';

/**
 * Type for schema extraction functions
 */
type SchemaExtractor = (schema: StandardSchemaV1) => OpenAPIV3_1.SchemaObject;

/**
 * Get a require function that works in both CommonJS and ES module environments
 *
 * Uses createRequire which works in both environments when import.meta.url is available.
 * Since this package uses "type": "module", import.meta.url is always available.
 */
function getRequire(): NodeRequire {
  // createRequire works in both CommonJS and ES module environments
  // Since package.json has "type": "module", import.meta.url is always available
  return createRequire(import.meta.url);
}

/**
 * Get zod module dynamically, trying multiple import strategies
 *
 * Uses string-based require to prevent bundlers from statically analyzing and bundling zod.
 *
 * @throws Error if zod cannot be loaded or doesn't have toJSONSchema method
 */
function getZodModule(): any {
  // Use string concatenation to prevent static analysis by bundlers
  const zodV4Path = 'zod' + '/v4';
  const zodPath = 'zod';

  try {
    const require = getRequire();

    // Try zod/v4 first (zod v4) - using dynamic path to prevent bundling
    try {
      const zodV4 = require(zodV4Path);
      if (zodV4 && typeof zodV4.toJSONSchema === 'function') {
        return zodV4;
      }
    } catch {
      // Fall through to try 'zod'
    }

    // Try 'zod' (might be v3 or v4) - using dynamic path to prevent bundling
    const zod = require(zodPath);
    if (zod && typeof zod.toJSONSchema === 'function') {
      return zod;
    }
    // If zod exists but doesn't have toJSONSchema, it's probably v3
    throw new Error(
      'z.toJSONSchema() is not available. Please ensure you are using zod v4 or later.'
    );
  } catch (err: any) {
    if (err.code === 'MODULE_NOT_FOUND') {
      throw new Error(
        'Zod is required for zod schema extraction. Please install zod: npm install zod'
      );
    }
    // Re-throw if it's our custom error about missing toJSONSchema
    throw err;
  }
}

/**
 * Get @valibot/to-json-schema module dynamically
 *
 * Uses string-based require to prevent bundlers from statically analyzing and bundling the package.
 *
 * @throws Error if @valibot/to-json-schema cannot be loaded or doesn't have toJsonSchema method
 */
function getValibotToJsonSchemaModule(): any {
  // Use string concatenation to prevent static analysis by bundlers
  const valibotToJsonSchemaPath = '@valibot/to-json-schema';

  try {
    const require = getRequire();
    const valibotToJsonSchema = require(valibotToJsonSchemaPath);
    if (valibotToJsonSchema && typeof valibotToJsonSchema.toJsonSchema === 'function') {
      return valibotToJsonSchema;
    }
    throw new Error(
      'toJsonSchema() is not available from @valibot/to-json-schema. Please ensure you have the correct version installed.'
    );
  } catch (err: any) {
    if (err.code === 'MODULE_NOT_FOUND') {
      throw new Error(
        '@valibot/to-json-schema is required for valibot schema extraction. Please install it: npm install @valibot/to-json-schema'
      );
    }
    // Re-throw if it's our custom error about missing toJsonSchema
    throw err;
  }
}

/**
 * Extract JSON Schema from a Zod schema and convert to OpenAPI SchemaObject
 *
 * Note: This function requires zod to be installed. Users must install zod when using zod schemas.
 * The function will attempt to access zod through the module system at runtime.
 */
function extractZodSchema(schema: StandardSchemaV1): OpenAPIV3_1.SchemaObject {
  const z = getZodModule();

  // Get JSON Schema from zod using the static toJSONSchema method
  const jsonSchema = z.toJSONSchema(schema, {
    io: 'input',
    target: 'openapi-3.0',
    reused: 'ref',
    unrepresentable: 'any',
  });

  // Convert JSON Schema to OpenAPI SchemaObject
  return convertJsonSchemaToOpenAPI(jsonSchema);
}

/**
 * Extract JSON Schema from a Valibot schema and convert to OpenAPI SchemaObject
 *
 * Note: This function requires @valibot/to-json-schema to be installed. Users must install
 * @valibot/to-json-schema when using valibot schemas. The function will attempt to access
 * @valibot/to-json-schema through the module system at runtime.
 *
 * Note: Some Valibot transformations (like toNumber) cannot be converted to JSON Schema.
 * In such cases, errorMode: 'warn' is used to allow conversion while showing warnings,
 * and the input type will be used for OpenAPI documentation (which is correct since
 * OpenAPI should document what the API receives, not internal transformations).
 */
function extractValibotSchema(schema: StandardSchemaV1): OpenAPIV3_1.SchemaObject {
  const { toJsonSchema } = getValibotToJsonSchemaModule();

  // Get JSON Schema from valibot using toJsonSchema
  // Use typeMode: 'input' since we're validating input data and documenting what the API receives
  // Use errorMode: 'warn' to allow conversion even when transformations can't be represented
  const jsonSchema = toJsonSchema(schema, {
    typeMode: 'input',
    errorMode: 'warn',
  });

  // Convert JSON Schema to OpenAPI SchemaObject
  return convertJsonSchemaToOpenAPI(jsonSchema);
}

/**
 * Standard OpenAPI formats that have implicit validation rules
 * When these formats are present, we should not include the pattern property
 * as the format itself already implies validation
 */
const STANDARD_OPENAPI_FORMATS = new Set([
  'email',
  'uri',
  'uri-reference',
  'date',
  'date-time',
  'time',
  'uuid',
  'hostname',
  'ipv4',
  'ipv6',
  'json-pointer',
  'relative-json-pointer',
  'regex',
]);

/**
 * Convert JSON Schema to OpenAPI SchemaObject format
 */
function convertJsonSchemaToOpenAPI(jsonSchema: any): OpenAPIV3_1.SchemaObject {
  // Handle boolean schemas (true/false)
  if (typeof jsonSchema === 'boolean') {
    return jsonSchema ? {} : { not: {} };
  }

  // Handle null/undefined
  if (jsonSchema == null) {
    return {};
  }

  const openApiSchema: OpenAPIV3_1.SchemaObject = {};

  // Map basic properties
  if (jsonSchema.type !== undefined) {
    // Handle array types
    if (Array.isArray(jsonSchema.type)) {
      // OpenAPI 3.1 supports multiple types via oneOf/anyOf
      // For simplicity, we'll use the first type or handle nullable
      const types = jsonSchema.type.filter((t: string) => t !== 'null');
      if (types.length === 1) {
        openApiSchema.type = types[0] as OpenAPIV3_1.NonArraySchemaObjectType;
      }
      // If null is in the array, mark as nullable
      if (jsonSchema.type.includes('null')) {
        // In OpenAPI 3.1, nullable is handled via type: ['string', 'null'] or oneOf
        // We'll use the type array approach
        openApiSchema.type = jsonSchema.type as any;
      }
    } else {
      openApiSchema.type = jsonSchema.type as OpenAPIV3_1.NonArraySchemaObjectType | 'array';
    }
  }

  // Handle nullable (JSON Schema style)
  if (jsonSchema.nullable === true && !Array.isArray(openApiSchema.type)) {
    // Convert to OpenAPI 3.1 nullable format
    if (openApiSchema.type) {
      openApiSchema.type = [openApiSchema.type, 'null'] as any;
    }
  }

  // Map string properties
  if (jsonSchema.format !== undefined) {
    openApiSchema.format = jsonSchema.format;
  }
  // Only include pattern if format is not a standard OpenAPI format
  // Standard formats already have implicit validation rules
  if (
    jsonSchema.pattern !== undefined &&
    (!jsonSchema.format || !STANDARD_OPENAPI_FORMATS.has(jsonSchema.format))
  ) {
    openApiSchema.pattern = jsonSchema.pattern;
  }
  if (jsonSchema.minLength !== undefined) {
    openApiSchema.minLength = jsonSchema.minLength;
  }
  if (jsonSchema.maxLength !== undefined) {
    openApiSchema.maxLength = jsonSchema.maxLength;
  }

  // Map number properties
  if (jsonSchema.minimum !== undefined) {
    openApiSchema.minimum = jsonSchema.minimum;
  }
  if (jsonSchema.maximum !== undefined) {
    openApiSchema.maximum = jsonSchema.maximum;
  }
  if (jsonSchema.exclusiveMinimum !== undefined) {
    openApiSchema.exclusiveMinimum = jsonSchema.exclusiveMinimum;
  }
  if (jsonSchema.exclusiveMaximum !== undefined) {
    openApiSchema.exclusiveMaximum = jsonSchema.exclusiveMaximum;
  }
  if (jsonSchema.multipleOf !== undefined) {
    openApiSchema.multipleOf = jsonSchema.multipleOf;
  }

  // Map array properties
  if (jsonSchema.items !== undefined) {
    if (Array.isArray(jsonSchema.items)) {
      // Tuple type - use prefixItems in OpenAPI 3.1
      openApiSchema.items = convertJsonSchemaToOpenAPI(jsonSchema.items[0]);
      // Note: OpenAPI 3.1 doesn't fully support tuples, so we'll use items for the first type
    } else {
      openApiSchema.items = convertJsonSchemaToOpenAPI(jsonSchema.items);
    }
  }
  if (jsonSchema.minItems !== undefined) {
    openApiSchema.minItems = jsonSchema.minItems;
  }
  if (jsonSchema.maxItems !== undefined) {
    openApiSchema.maxItems = jsonSchema.maxItems;
  }
  if (jsonSchema.uniqueItems !== undefined) {
    openApiSchema.uniqueItems = jsonSchema.uniqueItems;
  }

  // Map object properties
  if (jsonSchema.properties !== undefined) {
    openApiSchema.properties = {};
    for (const [key, value] of Object.entries(jsonSchema.properties)) {
      openApiSchema.properties[key] = convertJsonSchemaToOpenAPI(value);
    }
  }
  if (jsonSchema.required !== undefined && Array.isArray(jsonSchema.required)) {
    openApiSchema.required = jsonSchema.required;
  }
  if (jsonSchema.minProperties !== undefined) {
    openApiSchema.minProperties = jsonSchema.minProperties;
  }
  if (jsonSchema.maxProperties !== undefined) {
    openApiSchema.maxProperties = jsonSchema.maxProperties;
  }
  if (jsonSchema.additionalProperties !== undefined) {
    if (typeof jsonSchema.additionalProperties === 'boolean') {
      openApiSchema.additionalProperties = jsonSchema.additionalProperties;
    } else {
      openApiSchema.additionalProperties = convertJsonSchemaToOpenAPI(
        jsonSchema.additionalProperties
      );
    }
  }
  if (jsonSchema.patternProperties !== undefined) {
    openApiSchema.patternProperties = {};
    for (const [key, value] of Object.entries(jsonSchema.patternProperties)) {
      openApiSchema.patternProperties[key] = convertJsonSchemaToOpenAPI(value);
    }
  }

  // Map composition keywords
  if (jsonSchema.allOf !== undefined) {
    openApiSchema.allOf = jsonSchema.allOf.map((s: any) => convertJsonSchemaToOpenAPI(s));
  }
  if (jsonSchema.oneOf !== undefined) {
    openApiSchema.oneOf = jsonSchema.oneOf.map((s: any) => convertJsonSchemaToOpenAPI(s));
  }
  if (jsonSchema.anyOf !== undefined) {
    openApiSchema.anyOf = jsonSchema.anyOf.map((s: any) => convertJsonSchemaToOpenAPI(s));
  }
  if (jsonSchema.not !== undefined) {
    openApiSchema.not = convertJsonSchemaToOpenAPI(jsonSchema.not);
  }

  // Map enum
  if (jsonSchema.enum !== undefined) {
    openApiSchema.enum = jsonSchema.enum;
  }

  // Map const (OpenAPI 3.1 supports const)
  if (jsonSchema.const !== undefined) {
    openApiSchema.const = jsonSchema.const;
  }

  // Map metadata
  if (jsonSchema.title !== undefined) {
    openApiSchema.title = jsonSchema.title;
  }
  if (jsonSchema.description !== undefined) {
    openApiSchema.description = jsonSchema.description;
  }
  if (jsonSchema.default !== undefined) {
    openApiSchema.default = jsonSchema.default;
  }
  if (jsonSchema.examples !== undefined) {
    if (Array.isArray(jsonSchema.examples)) {
      openApiSchema.examples = jsonSchema.examples;
    } else {
      openApiSchema.examples = [jsonSchema.examples];
    }
  }
  if (jsonSchema.deprecated !== undefined) {
    openApiSchema.deprecated = jsonSchema.deprecated;
  }

  // Handle $ref (should be preserved as-is, but OpenAPI uses #/components/schemas/...)
  // Note: We'll handle $ref resolution separately in the schema collection phase
  if (jsonSchema.$ref !== undefined) {
    // For now, we'll preserve it, but it will need to be resolved later
    (openApiSchema as any).$ref = jsonSchema.$ref;
  }

  return openApiSchema;
}

/**
 * Vendor registry mapping vendor names to extraction functions
 */
const vendorExtractors: Record<string, SchemaExtractor> = {
  zod: extractZodSchema,
  valibot: extractValibotSchema,
  // Future vendors can be added here:
  // arktype: extractArktypeSchema,
};

/**
 * Extract OpenAPI schema from a StandardSchemaV1 schema
 * Checks the vendor field and routes to the appropriate extractor
 */
export function extractSchema(schema: StandardSchemaV1): OpenAPIV3_1.SchemaObject {
  // Check if schema has ~standard property
  if (!schema || typeof schema !== 'object' || !('~standard' in schema)) {
    throw new Error(
      'Schema does not have ~standard property. Ensure you are using a StandardSchemaV1 compatible schema.'
    );
  }

  const standard = schema['~standard'];
  if (!standard || typeof standard !== 'object') {
    throw new Error('Schema ~standard property is invalid.');
  }

  // Get vendor name
  const vendor = standard.vendor;
  if (!vendor || typeof vendor !== 'string') {
    throw new Error(
      `Schema vendor is missing or invalid. Found: ${typeof vendor}. Ensure your schema library implements StandardSchemaV1.`
    );
  }

  // Find extractor for this vendor
  const extractor = vendorExtractors[vendor];
  if (!extractor) {
    throw new Error(
      `Unsupported schema vendor: "${vendor}". Supported vendors: ${Object.keys(vendorExtractors).join(', ')}`
    );
  }

  // Extract schema using vendor-specific function
  return extractor(schema);
}
