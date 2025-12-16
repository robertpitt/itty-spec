import type { StandardSchemaV1 } from '@standard-schema/spec';
import {
  ContractDefinition,
  ContractOperation,
  HttpMethod,
  RequestByContentType,
  ResponseByContentType,
} from '../types';
import { OpenAPIV3_1 } from './types';
import { extractSchema } from './vendors';

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
    info: {
      title: options.title,
      version: options.version,
      description: options.description,
      termsOfService: options.termsOfService,
      contact: options.contact,
      license: options.license,
      summary: options.summary,
    },
    servers: options.servers,
    components: {
      schemas: registry.schemas,
    },
    paths: createOpenApiPaths(contract, registry),
  };
};

/**
 * Schema registry for deduplication and reference management
 */
type SchemaRegistry = {
  schemas: Record<string, OpenAPIV3_1.SchemaObject>;
  schemaIds: Map<StandardSchemaV1, string>;
  nextId: number;
};

/**
 * Creates the OpenAPI components
 */
export const createOpenApiComponents = (
  contract: ContractDefinition
): OpenAPIV3_1.ComponentsObject => {
  const registry = createSchemaRegistry();
  collectSchemasFromContract(contract, registry);
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
 * Create a media type object with a schema reference
 */
function createMediaTypeObject(schemaId: string | null): OpenAPIV3_1.MediaTypeObject | undefined {
  if (!schemaId) {
    return undefined;
  }
  return {
    schema: createSchemaRef(schemaId),
  };
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
  return {
    name,
    in: location,
    required,
    schema: paramSchema,
    description: paramSchema.description,
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
      const bodySchemaId = getOrCreateSchemaReference(
        schema.body,
        registry,
        `${operationId}Request${sanitizeContentType(contentType)}Body`
      );
      const mediaTypeObj = createMediaTypeObject(bodySchemaId);
      if (mediaTypeObj) {
        content[contentType] = mediaTypeObj;
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
      const bodySchemaId = getOrCreateSchemaReference(
        responseSchema.body,
        registry,
        `${operationId}Response${statusCode}${sanitizeContentType(contentType)}Body`
      );
      const mediaTypeWithSchema = createMediaTypeObject(bodySchemaId);
      if (mediaTypeWithSchema?.schema) {
        mediaTypeObj.schema = mediaTypeWithSchema.schema;
      }
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
 * Get or create a schema reference in the registry
 */
function getOrCreateSchemaReference(
  schema: StandardSchemaV1 | undefined,
  registry: SchemaRegistry,
  nameHint?: string
): string | null {
  if (!schema) {
    return null;
  }

  // Check if we've already registered this schema
  const existingId = registry.schemaIds.get(schema);
  if (existingId) {
    return existingId;
  }

  // Extract the schema
  const openApiSchema = extractSchema(schema);

  // Generate a unique ID
  const schemaId = nameHint || generateSchemaId(registry);

  // Register the schema
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
