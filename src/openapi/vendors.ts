import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { OpenAPIV3_1 } from './types';
import { createRequire } from 'module';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Configuration for a vendor schema extractor
 *
 * Defines how to load and use a vendor's module to extract JSON Schema
 * from StandardSchemaV1 schemas.
 */
type VendorConfig = {
  /** Vendor name (e.g., 'zod', 'valibot') */
  name: string;
  /** Ordered list of module paths to try (with fallbacks) */
  modulePaths: string[];
  /** Validate that the loaded module has required methods/functions */
  validateModule: (module: any) => boolean;
  /** Extract JSON Schema from a StandardSchemaV1 schema using the vendor module */
  extract: (module: any, schema: StandardSchemaV1) => any;
  /** Error messages for different failure scenarios */
  errorMessages: {
    /** Error when module cannot be found */
    notFound: string;
    /** Error when module is found but doesn't have required methods */
    invalid: string;
  };
};

/**
 * Type for schema extraction functions
 */
type SchemaExtractor = (schema: StandardSchemaV1) => OpenAPIV3_1.SchemaObject;

// ============================================================================
// Utility Functions
// ============================================================================

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
 * Load a vendor module dynamically using the provided configuration
 *
 * Uses string concatenation to prevent bundlers from statically analyzing
 * and bundling vendor modules. Tries each module path in order until one
 * successfully loads and validates.
 *
 * @param config Vendor configuration defining module paths and validation
 * @returns The loaded and validated vendor module
 * @throws Error if module cannot be loaded or doesn't meet validation requirements
 */
function loadVendorModule(config: VendorConfig): any {
  const require = getRequire();

  // Try each module path in order
  for (const modulePath of config.modulePaths) {
    try {
      // Use string concatenation to prevent static analysis by bundlers
      // Split path and reconstruct to prevent bundler static analysis
      const pathParts = modulePath.split('/');
      const dynamicPath =
        pathParts.length > 1
          ? pathParts.reduce((acc, part) => (acc ? acc + '/' + part : part))
          : modulePath;

      const module = require(dynamicPath);

      // Validate module has required methods
      if (config.validateModule(module)) {
        return module;
      }
    } catch (err: any) {
      // If module not found, continue to next path
      if (err.code === 'MODULE_NOT_FOUND') {
        continue;
      }
      // Re-throw other errors
      throw err;
    }
  }

  // If we get here, none of the paths worked
  // Check if it's a module not found error or validation error
  try {
    // Try the first path again to get a better error message
    const firstPath = config.modulePaths[0];
    const pathParts = firstPath.split('/');
    const dynamicPath =
      pathParts.length > 1
        ? pathParts.reduce((acc, part) => (acc ? acc + '/' + part : part))
        : firstPath;
    const testModule = require(dynamicPath);
    // If we get here, module exists but validation failed
    if (!config.validateModule(testModule)) {
      throw new Error(config.errorMessages.invalid);
    }
    // Should not reach here, but if we do, throw not found
    throw new Error(config.errorMessages.notFound);
  } catch (err: any) {
    if (err.code === 'MODULE_NOT_FOUND') {
      throw new Error(config.errorMessages.notFound);
    }
    // Re-throw validation errors
    if (err.message === config.errorMessages.invalid) {
      throw err;
    }
    throw err;
  }
}

// ============================================================================
// JSON Schema to OpenAPI Conversion
// ============================================================================

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
 * Convert $ref paths from JSON Schema format (#/definitions/...) to OpenAPI format (#/components/schemas/...)
 */
function convertRefPath(ref: string): string {
  if (ref.startsWith('#/definitions/')) {
    return ref.replace('#/definitions/', '#/components/schemas/');
  }
  return ref;
}

/**
 * Recursively convert all $ref paths in a schema object
 */
function convertRefsInSchema(schema: any): any {
  if (typeof schema !== 'object' || schema === null) {
    return schema;
  }

  if (Array.isArray(schema)) {
    return schema.map(convertRefsInSchema);
  }

  const converted: any = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === '$ref' && typeof value === 'string') {
      converted[key] = convertRefPath(value);
    } else {
      converted[key] = convertRefsInSchema(value);
    }
  }

  return converted;
}

/**
 * Convert JSON Schema to OpenAPI SchemaObject format
 */
export function convertJsonSchemaToOpenAPI(jsonSchema: any): OpenAPIV3_1.SchemaObject {
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

  // Handle $ref (convert from #/definitions/... to #/components/schemas/...)
  if (jsonSchema.$ref !== undefined) {
    openApiSchema.$ref = convertRefPath(jsonSchema.$ref);
  }

  // Convert all nested $ref paths recursively
  return convertRefsInSchema(openApiSchema);
}

// ============================================================================
// Vendor Configurations
// ============================================================================

/**
 * Zod vendor configuration
 *
 * Supports both zod v4 (via 'zod/v4') and regular zod imports.
 * Requires the toJSONSchema method which is available in zod v4+.
 */
const zodConfig: VendorConfig = {
  name: 'zod',
  // Use string concatenation to prevent static analysis by bundlers
  modulePaths: ['zod' + '/v4', 'zod'],
  validateModule: (module: any) => {
    return module && typeof module.toJSONSchema === 'function';
  },
  extract: (z: any, schema: StandardSchemaV1) => {
    // Get JSON Schema from zod using the static toJSONSchema method
    return z.toJSONSchema(schema, {
      io: 'input',
      target: 'openapi-3.0',
      reused: 'ref',
      unrepresentable: 'any',
    });
  },
  errorMessages: {
    notFound: 'Zod is required for zod schema extraction. Please install zod: npm install zod',
    invalid: 'z.toJSONSchema() is not available. Please ensure you are using zod v4 or later.',
  },
};

/**
 * Valibot vendor configuration
 *
 * Requires @valibot/to-json-schema package which provides the toJsonSchema function.
 * Uses typeMode: 'input' to document what the API receives (not internal transformations).
 * Uses errorMode: 'warn' to allow conversion even when transformations can't be represented.
 */
const valibotConfig: VendorConfig = {
  name: 'valibot',
  modulePaths: ['@valibot/to-json-schema'],
  validateModule: (module: any) => {
    return module && typeof module.toJsonSchema === 'function';
  },
  extract: ({ toJsonSchema }: any, schema: StandardSchemaV1) => {
    // Get JSON Schema from valibot using toJsonSchema
    // Use typeMode: 'input' since we're validating input data and documenting what the API receives
    // Use errorMode: 'warn' to allow conversion even when transformations can't be represented
    return toJsonSchema(schema, {
      typeMode: 'input',
      errorMode: 'warn',
    });
  },
  errorMessages: {
    notFound:
      '@valibot/to-json-schema is required for valibot schema extraction. Please install it: npm install @valibot/to-json-schema',
    invalid:
      'toJsonSchema() is not available from @valibot/to-json-schema. Please ensure you have the correct version installed.',
  },
};

// ============================================================================
// Vendor Registry
// ============================================================================

/**
 * Create a schema extractor function from a vendor configuration
 */
function createExtractor(config: VendorConfig): SchemaExtractor {
  return (schema: StandardSchemaV1): OpenAPIV3_1.SchemaObject => {
    const module = loadVendorModule(config);
    const jsonSchema = config.extract(module, schema);
    return convertJsonSchemaToOpenAPI(jsonSchema);
  };
}

/**
 * Vendor registry mapping vendor names to extraction functions
 *
 * To add a new vendor:
 * 1. Create a VendorConfig object (see zodConfig/valibotConfig examples)
 * 2. Add it to the vendorConfigs array
 * 3. The registry will automatically include it
 */
const vendorConfigs: VendorConfig[] = [zodConfig, valibotConfig];

const vendorExtractors: Record<string, SchemaExtractor> = Object.fromEntries(
  vendorConfigs.map((config) => [config.name, createExtractor(config)])
);

// ============================================================================
// Public API
// ============================================================================

/**
 * Extract OpenAPI schema from a StandardSchemaV1 schema
 *
 * Checks the vendor field and routes to the appropriate extractor.
 * The extractor loads the vendor module dynamically and converts the schema
 * to OpenAPI 3.1 format.
 *
 * @param schema StandardSchemaV1 compatible schema
 * @returns OpenAPI 3.1 SchemaObject
 * @throws Error if schema is invalid or vendor is not supported
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

/**
 * Extract raw JSON Schema from a StandardSchemaV1 schema (before OpenAPI conversion)
 * This is used to extract definitions that may be present in the JSON Schema
 *
 * @param schema StandardSchemaV1 compatible schema
 * @returns Raw JSON Schema object (may include definitions property)
 * @throws Error if schema is invalid or vendor is not supported
 */
export function extractRawJsonSchema(schema: StandardSchemaV1): any {
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

  // Find vendor config
  const config = vendorConfigs.find((c) => c.name === vendor);
  if (!config) {
    throw new Error(
      `Unsupported schema vendor: "${vendor}". Supported vendors: ${vendorConfigs.map((c) => c.name).join(', ')}`
    );
  }

  // Load vendor module and extract raw JSON Schema
  const module = loadVendorModule(config);
  return config.extract(module, schema);
}
