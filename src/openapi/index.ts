import type { StandardSchemaV1 } from '@standard-schema/spec';
import {
  ContractDefinition,
  ContractOperation,
  HttpMethod,
  RequestByContentType,
  ResponseByContentType,
} from '../types';
import type { OpenAPIV3_1 } from './types';
import { extractSchema, extractRawJsonSchema, convertJsonSchemaToOpenAPI } from './vendors';

/**
 * Schema registry for deduplication and reference management
 */
type SchemaRegistry = {
  schemas: Record<string, OpenAPIV3_1.SchemaObject>;
  schemaIds: Map<StandardSchemaV1, string>;
  nextId: number;
};

/**
 * Options for the OpenAPI specification generator
 */
export type OpenApiSpecificationOptions = {
  title: string;
  description?: string;
  summary?: string;
  version?: string;
  termsOfService?: string;
  contact?: OpenAPIV3_1.ContactObject;
  license?: OpenAPIV3_1.LicenseObject;
  servers?: OpenAPIV3_1.ServerObject[];
  tags?: OpenAPIV3_1.TagObject[];
};

/**
 * OpenAPI 3.0.0 schema generator for itty-spec contracts
 */
export const createOpenApiSpecification = (
  contract: ContractDefinition,
  options: OpenApiSpecificationOptions
): OpenAPIV3_1.Document => {
  // Create shared schema registry
  const registry = createSchemaRegistry();
  collectSchemasFromContract(contract, registry);

  return {
    openapi: '3.1.1',
    info: createOpenApiInfo(options),
    servers: options.servers,
    components: createOpenApiComponents(contract, registry),
    paths: createOpenApiPaths(contract, registry),
  };
};

export const createOpenApiInfo = (options: OpenApiSpecificationOptions): OpenAPIV3_1.InfoObject => {
  return {
    title: options.title,
    version: options.version,
    description: options.description,
    termsOfService: options.termsOfService,
    contact: options.contact,
    license: options.license,
    summary: options.summary,
  };
};

/**
 * Creates the OpenAPI components
 */
export const createOpenApiComponents = (
  contract: ContractDefinition,
  registry: SchemaRegistry
): OpenAPIV3_1.ComponentsObject => {
  return {
    schemas: registry.schemas,
  };
};

/**
 * Extract path parameter names from a path string
 * e.g., "/users/:id/posts/:postId" -> ["id", "postId"]
 */
function extractPathParamNames(path: string): string[] {
  const params: string[] = [];
  const segments = path.split('/');
  for (const segment of segments) {
    if (segment.startsWith(':')) {
      const paramName = segment.slice(1);
      if (paramName) {
        params.push(paramName);
      }
    }
  }
  return params;
}

/**
 * Convert path format from :param to {param} (OpenAPI standard)
 * e.g., "/users/:id" -> "/users/{id}"
 */
function convertPathToOpenAPIFormat(path: string): string {
  return path.replace(/:([^/]+)/g, '{$1}');
}

/**
 * Sanitize content type string for use in schema names
 * Removes non-alphanumeric characters
 */
function sanitizeContentType(contentType: string): string {
  return contentType.replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Type guard to validate request/response schema objects
 */
function isValidBodySchema(
  schema: unknown
): schema is { body?: StandardSchemaV1; headers?: StandardSchemaV1 } {
  return Boolean(schema && typeof schema === 'object' && 'body' in schema);
}

/**
 * Generic helper to process content-type maps
 */
function processContentTypeMap(
  contentMap: Record<string, unknown>,
  processor: (
    contentType: string,
    schema: { body?: StandardSchemaV1; headers?: StandardSchemaV1 }
  ) => void
): void {
  for (const [contentType, schema] of Object.entries(contentMap)) {
    if (isValidBodySchema(schema)) {
      processor(contentType, schema);
    }
  }
}

/**
 * Create a schema reference object
 */
function createSchemaRef(schemaId: string): OpenAPIV3_1.ReferenceObject {
  return {
    $ref: `#/components/schemas/${schemaId}`,
  };
}

/**
 * Check if a schema is reference-only (only contains $ref and optional metadata)
 * A schema is considered reference-only if it only has:
 * - $ref property (required)
 * - Optional metadata: description, summary, title
 * - No other schema properties (no type, properties, items, etc.)
 */
function isReferenceOnly(schema: OpenAPIV3_1.SchemaObject): boolean {
  // Handle boolean schemas
  if (typeof schema === 'boolean') {
    return false;
  }

  // Must be an object
  if (!schema || typeof schema !== 'object') {
    return false;
  }

  // Must have $ref property
  if (!('$ref' in schema) || typeof schema.$ref !== 'string') {
    return false;
  }

  // Get all keys except metadata keys
  const metadataKeys = new Set(['$ref', 'description', 'summary', 'title']);
  const schemaKeys = Object.keys(schema).filter((key) => !metadataKeys.has(key));

  // If there are any non-metadata keys, it's not reference-only
  return schemaKeys.length === 0;
}

/**
 * Extract schema name from a $ref path
 * e.g., "#/components/schemas/SomeSchema" -> "SomeSchema"
 */
function extractSchemaNameFromRef(ref: string): string | null {
  const match = ref.match(/^#\/components\/schemas\/(.+)$/);
  return match ? match[1] : null;
}

/**
 * Check if a schema is empty (has no meaningful content)
 * Empty schemas include:
 * - Empty objects: { type: 'object' } with no properties
 * - Void schemas: {} (no properties at all)
 * - Schemas with only metadata (title, description) but no actual schema content
 */
function isEmptySchema(schema: OpenAPIV3_1.SchemaObject): boolean {
  // Handle boolean schemas
  if (typeof schema === 'boolean') {
    return false; // true/false schemas have meaning
  }

  // Must be an object
  if (!schema || typeof schema !== 'object') {
    return true; // null/undefined are considered empty
  }

  // Metadata-only keys that don't constitute schema content
  const metadataKeys = new Set([
    'title',
    'description',
    'summary',
    'example',
    'examples',
    'default',
    'deprecated',
    'externalDocs',
    'xml',
  ]);

  // Get all keys that represent actual schema content
  const contentKeys = Object.keys(schema).filter((key) => !metadataKeys.has(key));

  // If there are no content keys, it's empty
  if (contentKeys.length === 0) {
    return true;
  }

  // If it only has $ref, it's reference-only (not empty, but handled separately)
  if (contentKeys.length === 1 && contentKeys[0] === '$ref') {
    return false; // Reference-only schemas are handled by isReferenceOnly
  }

  // Check for empty object schemas
  if (schema.type === 'object') {
    // Empty object: no properties, no additionalProperties, no patternProperties, etc.
    const hasProperties =
      (schema.properties && Object.keys(schema.properties).length > 0) ||
      schema.patternProperties ||
      schema.additionalProperties !== undefined ||
      schema.minProperties !== undefined ||
      schema.maxProperties !== undefined;

    // If it's an object type with no properties and no other object-related constraints, it's empty
    if (!hasProperties) {
      // Check if there are any other meaningful constraints
      const otherConstraints = contentKeys.filter(
        (key) =>
          !['type', 'required', 'nullable', 'readOnly', 'writeOnly', 'discriminator'].includes(key)
      );
      return otherConstraints.length === 0;
    }
  }

  return false;
}

/**
 * Create a media type object with a schema reference
 * Accepts either a schema ID (string) or a direct ReferenceObject
 */
function createMediaTypeObject(
  schemaRef: SchemaReferenceResult
): OpenAPIV3_1.MediaTypeObject | undefined {
  if (!schemaRef) {
    return undefined;
  }

  // If it's already a ReferenceObject, use it directly
  if (typeof schemaRef === 'object' && '$ref' in schemaRef) {
    return {
      schema: schemaRef,
    };
  }

  // Otherwise, it's a schema ID string (TypeScript knows this after the check above)
  if (typeof schemaRef === 'string') {
    return {
      schema: createSchemaRef(schemaRef),
    };
  }

  return undefined;
}

/**
 * Create a parameter object from a schema property
 */
function createParameterFromProperty(
  name: string,
  paramSchema: OpenAPIV3_1.SchemaObject,
  location: 'query' | 'header' | 'path',
  required: boolean
): OpenAPIV3_1.ParameterObject {
  // Handle boolean schemas (true/false)
  if (typeof paramSchema === 'boolean') {
    return {
      name,
      in: location,
      required,
      schema: paramSchema,
    };
  }

  // Extract description from schema (use title as fallback if description is missing)
  const description = paramSchema.description ?? paramSchema.title;

  // Create a clean schema without title (title should be at parameter level, not schema level)
  const cleanSchema: OpenAPIV3_1.SchemaObject =
    typeof paramSchema === 'object' && paramSchema !== null ? { ...paramSchema } : paramSchema;

  if (typeof cleanSchema === 'object' && cleanSchema !== null && 'title' in cleanSchema) {
    delete cleanSchema.title;
  }

  return {
    name,
    in: location,
    required,
    schema: cleanSchema,
    description,
  };
}

/**
 * Create parameters from a schema's properties
 */
function createParametersFromSchema(
  schema: OpenAPIV3_1.SchemaObject,
  location: 'query' | 'header' | 'path',
  requiredByDefault: boolean = false
): OpenAPIV3_1.ParameterObject[] {
  if (!schema.properties || typeof schema.properties !== 'object') {
    return [];
  }

  const requiredFields = schema.required || [];
  const parameters: OpenAPIV3_1.ParameterObject[] = [];

  for (const [paramName, paramSchema] of Object.entries(schema.properties)) {
    const isRequired = requiredByDefault || requiredFields.includes(paramName);
    parameters.push(
      createParameterFromProperty(
        paramName,
        paramSchema as OpenAPIV3_1.SchemaObject,
        location,
        isRequired
      )
    );
  }

  return parameters;
}

/**
 * Get schema property by name, with fallback
 */
function getSchemaProperty(
  schema: OpenAPIV3_1.SchemaObject | null,
  propertyName: string,
  fallback: OpenAPIV3_1.SchemaObject
): OpenAPIV3_1.SchemaObject {
  if (!schema?.properties || typeof schema.properties !== 'object') {
    return fallback;
  }

  const propSchema = schema.properties[propertyName];
  if (propSchema) {
    return propSchema as OpenAPIV3_1.SchemaObject;
  }

  return fallback;
}

/**
 * Create path parameters from path string and optional schema
 */
function createPathParameters(
  path: string,
  pathParamsSchema: StandardSchemaV1 | undefined
): OpenAPIV3_1.ParameterObject[] {
  const pathParamNames = extractPathParamNames(path);
  if (pathParamNames.length === 0) {
    return [];
  }

  const extractedSchema = pathParamsSchema ? extractSchema(pathParamsSchema) : null;
  const parameters: OpenAPIV3_1.ParameterObject[] = [];

  for (const paramName of pathParamNames) {
    const paramSchema = getSchemaProperty(extractedSchema, paramName, { type: 'string' });
    parameters.push(createParameterFromProperty(paramName, paramSchema, 'path', true));
  }

  return parameters;
}

/**
 * Process request body content-type map and create OpenAPI content object
 */
function createRequestBodyContent(
  requests: RequestByContentType,
  registry: SchemaRegistry,
  operationId: string
): Record<string, OpenAPIV3_1.MediaTypeObject> {
  const content: Record<string, OpenAPIV3_1.MediaTypeObject> = {};

  processContentTypeMap(requests, (contentType, schema) => {
    if (schema.body) {
      const bodySchemaRef = getOrCreateSchemaReference(
        schema.body,
        registry,
        `${operationId}Request${sanitizeContentType(contentType)}Body`
      );
      // If bodySchemaRef is null, it means the schema is empty (e.g., z.void())
      // Skip adding empty request body schemas to content
      if (bodySchemaRef !== null) {
        const mediaTypeObj = createMediaTypeObject(bodySchemaRef);
        if (mediaTypeObj) {
          content[contentType] = mediaTypeObj;
        }
      }
    }
  });

  return content;
}

/**
 * Process response content-type map and create OpenAPI content object and headers
 */
function createResponseContent(
  responseByContentType: ResponseByContentType,
  registry: SchemaRegistry,
  operationId: string,
  statusCode: string
): {
  content: Record<string, OpenAPIV3_1.MediaTypeObject>;
  headers: Record<string, OpenAPIV3_1.HeaderObject>;
} {
  const content: Record<string, OpenAPIV3_1.MediaTypeObject> = {};
  const allHeaders: Record<string, OpenAPIV3_1.HeaderObject> = {};

  processContentTypeMap(responseByContentType, (contentType, schema) => {
    const mediaTypeObj: OpenAPIV3_1.MediaTypeObject = {};
    const responseSchema = schema as { body?: StandardSchemaV1; headers?: StandardSchemaV1 };

    // Response body schema
    if (responseSchema.body) {
      const bodySchemaRef = getOrCreateSchemaReference(
        responseSchema.body,
        registry,
        `${operationId}Response${statusCode}${sanitizeContentType(contentType)}Body`
      );
      // If bodySchemaRef is null, it means the schema is empty (e.g., z.void())
      // We still create a media type object but without a schema property
      // This is valid for responses like 204 No Content
      if (bodySchemaRef !== null) {
        const mediaTypeWithSchema = createMediaTypeObject(bodySchemaRef);
        if (mediaTypeWithSchema?.schema) {
          mediaTypeObj.schema = mediaTypeWithSchema.schema;
        }
      }
      // If bodySchemaRef is null, mediaTypeObj remains empty {}, which is correct
    }

    // Response headers schema (per content type) - inline directly
    if (responseSchema.headers) {
      const headersSchema = extractSchema(responseSchema.headers);
      if (headersSchema.properties) {
        // Headers are shared across all content types in OpenAPI, so we merge them
        for (const [headerName, headerSchema] of Object.entries(headersSchema.properties)) {
          allHeaders[headerName] = {
            schema: headerSchema as OpenAPIV3_1.SchemaObject,
            description: (headerSchema as OpenAPIV3_1.SchemaObject).description,
          };
        }
      }
    }

    content[contentType] = mediaTypeObj;
  });

  return { content, headers: allHeaders };
}

/**
 * Collect body schemas from a content-type map
 */
function collectBodySchemas(
  contentMap: Record<string, unknown>,
  registry: SchemaRegistry,
  schemaNamePrefix: string
): void {
  processContentTypeMap(contentMap, (contentType, schema) => {
    if (schema.body) {
      getOrCreateSchemaReference(
        schema.body,
        registry,
        `${schemaNamePrefix}${sanitizeContentType(contentType)}Body`
      );
    }
  });
}

/**
 * Collect body schema from request content-type map
 */
function collectRequestBodySchemas(
  requests: RequestByContentType,
  registry: SchemaRegistry,
  operationId: string
): void {
  collectBodySchemas(requests, registry, `${operationId}Request`);
}

/**
 * Collect body schemas from response content-type map
 */
function collectResponseBodySchemas(
  responses: Record<string | number, ResponseByContentType | undefined>,
  registry: SchemaRegistry,
  operationId: string
): void {
  for (const [statusCode, response] of Object.entries(responses)) {
    if (!response || typeof response !== 'object') continue;
    collectBodySchemas(
      response as ResponseByContentType,
      registry,
      `${operationId}Response${statusCode}`
    );
  }
}

/**
 * Creates a new schema registry
 */
function createSchemaRegistry(): SchemaRegistry {
  return {
    schemas: {},
    schemaIds: new Map(),
    nextId: 1,
  };
}

/**
 * Generate a unique schema name/ID
 */
function generateSchemaId(registry: SchemaRegistry, prefix: string = 'Schema'): string {
  const id = `${prefix}${registry.nextId++}`;
  return id;
}

/**
 * Result type for schema reference creation
 * Can be a schema ID (string) or a direct reference object
 */
type SchemaReferenceResult = string | OpenAPIV3_1.ReferenceObject | null;

/**
 * Get or create a schema reference in the registry
 * Returns a schema ID if the schema has content, or a direct ReferenceObject if it's reference-only
 */
function getOrCreateSchemaReference(
  schema: StandardSchemaV1 | undefined,
  registry: SchemaRegistry,
  nameHint?: string
): SchemaReferenceResult {
  if (!schema) {
    return null;
  }

  // Check if we've already registered this schema
  const existingId = registry.schemaIds.get(schema);
  if (existingId) {
    // Check if this was marked as empty
    if (existingId === '__empty__') {
      return null;
    }

    // Check if the existing ID points to a schema in the registry
    const existingSchema = registry.schemas[existingId];
    if (existingSchema) {
      // If it's reference-only, return the reference directly
      if (isReferenceOnly(existingSchema)) {
        return existingSchema as OpenAPIV3_1.ReferenceObject;
      }
      // Check if this is a reference-only schema that we stored earlier
      // by re-extracting and checking if it's reference-only
      const reExtractedSchema = extractSchema(schema);
      if (isReferenceOnly(reExtractedSchema)) {
        // This was stored as a reference-only schema, return the reference directly
        return reExtractedSchema as OpenAPIV3_1.ReferenceObject;
      }
      // Check if it's now empty (shouldn't happen, but handle it)
      if (isEmptySchema(reExtractedSchema)) {
        return null;
      }
      // Otherwise, return the schema ID
      return existingId;
    }
    // If the ID doesn't exist in schemas, it means we stored a reference-only schema
    // Reconstruct the ReferenceObject from the schema name
    return createSchemaRef(existingId);
  }

  // Extract raw JSON Schema first to get definitions
  const rawJsonSchema = extractRawJsonSchema(schema);

  // Extract and register definitions if present
  // Definitions are JSON Schema objects (not StandardSchemaV1), so we convert them directly
  if (rawJsonSchema.definitions && typeof rawJsonSchema.definitions === 'object') {
    for (const [defName, defSchema] of Object.entries(rawJsonSchema.definitions)) {
      // Only register if not already registered (avoid duplicates)
      if (!registry.schemas[defName]) {
        // Convert definition schema (JSON Schema) to OpenAPI format
        const openApiDefSchema = convertJsonSchemaToOpenAPI(defSchema);
        // Register the definition schema (use the definition name as the schema ID)
        registry.schemas[defName] = openApiDefSchema;
      }
    }
  }

  // Extract the main schema (definitions are already registered above)
  // The main schema may contain $ref references to definitions, which will be converted
  const openApiSchema = extractSchema(schema);

  // Check if the extracted schema is empty (no meaningful content)
  if (isEmptySchema(openApiSchema)) {
    // Don't create a schema entry for empty schemas
    // Store a marker in schemaIds to track that we've seen this schema (for deduplication)
    // Use a special marker to indicate it's empty
    registry.schemaIds.set(schema, '__empty__');
    return null;
  }

  // Check if the extracted schema is reference-only
  if (isReferenceOnly(openApiSchema)) {
    // Extract the referenced schema name
    const ref = openApiSchema.$ref!;
    const schemaName = extractSchemaNameFromRef(ref);

    if (schemaName) {
      // Store the mapping for deduplication (but don't create a wrapper schema)
      // Use the referenced schema name as the ID for tracking
      registry.schemaIds.set(schema, schemaName);

      // Return the direct reference object
      return openApiSchema as OpenAPIV3_1.ReferenceObject;
    }
  }

  // Schema has actual content, register it
  const schemaId = nameHint || generateSchemaId(registry);
  registry.schemas[schemaId] = openApiSchema;
  registry.schemaIds.set(schema, schemaId);

  return schemaId;
}

/**
 * Collect all schemas from a contract definition
 */
function collectSchemasFromContract(contract: ContractDefinition, registry: SchemaRegistry): void {
  for (const [operationId, operation] of Object.entries(contract)) {
    // Collect schemas from operation
    collectSchemasFromOperation(operation, registry, operationId);
  }
}

/**
 * Collect schemas from a single operation
 */
function collectSchemasFromOperation(
  operation: ContractOperation,
  registry: SchemaRegistry,
  operationId: string
): void {
  // Request body - only supports content-type map format
  if (operation.requests) {
    collectRequestBodySchemas(operation.requests as RequestByContentType, registry, operationId);
  }

  // Response body schemas only (headers, path params, and query params are inlined)
  if (operation.responses) {
    collectResponseBodySchemas(operation.responses, registry, operationId);
  }
}

/**
 * Creates the OpenAPI schemas
 * @deprecated Use createOpenApiComponents instead
 */
export const createOpenApiSchemas = (
  contract: ContractDefinition
): Record<string, OpenAPIV3_1.SchemaObject> => {
  const registry = createSchemaRegistry();
  collectSchemasFromContract(contract, registry);
  return registry.schemas;
};

/**
 * Creates the OpenAPI paths
 */
export const createOpenApiPaths = (
  contract: ContractDefinition,
  registry: SchemaRegistry
): OpenAPIV3_1.PathsObject => {
  const paths: OpenAPIV3_1.PathsObject = {};
  for (const [operationId, operation] of Object.entries(contract)) {
    // Convert path format from :param to {param} (OpenAPI standard)
    const openApiPath = convertPathToOpenAPIFormat(operation.path);
    if (!paths[openApiPath]) {
      paths[openApiPath] = {};
    }
    const pathItem = paths[openApiPath]!;
    const method = operation.method.toLowerCase() as HttpMethod;
    pathItem[method] = createOpenApiOperation(operation, registry, operationId);
  }
  return paths;
};

/**
 * Creates the OpenAPI operation object
 */
function createOpenApiOperation(
  operation: ContractOperation,
  registry: SchemaRegistry,
  operationId: string
): OpenAPIV3_1.OperationObject {
  const operationObj: OpenAPIV3_1.OperationObject = {
    operationId: operation.operationId || operationId,
    summary: operation.summary,
    description: operation.description,
    tags: operation.tags,
  };

  // Collect parameters (path params, query params, and headers)
  const parameters: OpenAPIV3_1.ParameterObject[] = [];

  // Path parameters
  const pathParams = createPathParameters(operation.path, operation.pathParams);
  parameters.push(...pathParams);

  // Query parameters
  if (operation.query) {
    const schema = extractSchema(operation.query);
    const queryParams = createParametersFromSchema(schema, 'query');
    parameters.push(...queryParams);
  }

  // Request headers
  if (operation.headers) {
    const schema = extractSchema(operation.headers);
    const headerParams = createParametersFromSchema(schema, 'header');
    parameters.push(...headerParams);
  }

  if (parameters.length > 0) {
    operationObj.parameters = parameters;
  }

  // Request body - only supports content-type map format
  if (operation.requests) {
    const content = createRequestBodyContent(
      operation.requests as RequestByContentType,
      registry,
      operationId
    );

    if (Object.keys(content).length > 0) {
      operationObj.requestBody = {
        content,
        required: true,
      };
    }
  }

  // Responses
  if (operation.responses) {
    const responses: OpenAPIV3_1.ResponsesObject = {};
    for (const [statusCode, response] of Object.entries(operation.responses)) {
      if (!response || typeof response !== 'object') continue;

      const responseByContentType = response as ResponseByContentType;
      const { content, headers } = createResponseContent(
        responseByContentType,
        registry,
        operationId,
        statusCode
      );

      const responseObj: OpenAPIV3_1.ResponseObject = {
        description: '', // Default description, could be enhanced
      };

      if (Object.keys(content).length > 0) {
        responseObj.content = content;
      }

      if (Object.keys(headers).length > 0) {
        responseObj.headers = headers;
      }

      responses[statusCode] = responseObj;
    }
    operationObj.responses = responses;
  }

  return operationObj;
}
