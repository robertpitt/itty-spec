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
    // Collect all body schemas from content-type map
    const requestByContentType = operation.requests as RequestByContentType;
    for (const [contentType, requestSchema] of Object.entries(requestByContentType)) {
      if (requestSchema && typeof requestSchema === 'object' && 'body' in requestSchema) {
        if (requestSchema.body) {
          const contentTypeSafe = contentType.replace(/[^a-zA-Z0-9]/g, '');
          getOrCreateSchemaReference(
            requestSchema.body,
            registry,
            `${operationId}Request${contentTypeSafe}Body`
          );
        }
      }
    }
  }

  // Response body schemas only (headers, path params, and query params are inlined)
  if (operation.responses) {
    for (const [statusCode, response] of Object.entries(operation.responses)) {
      if (!response || typeof response !== 'object') continue;

      // Response must be a content-type map
      const responseByContentType = response as ResponseByContentType;
      for (const [contentType, responseSchema] of Object.entries(responseByContentType)) {
        if (responseSchema && typeof responseSchema === 'object' && 'body' in responseSchema) {
          if (responseSchema.body) {
            getOrCreateSchemaReference(
              responseSchema.body,
              registry,
              `${operationId}Response${statusCode}${contentType.replace(/[^a-zA-Z0-9]/g, '')}Body`
            );
          }
        }
      }
    }
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

  // Collect parameters (path params and query params)
  const parameters: OpenAPIV3_1.ParameterObject[] = [];

  // Path parameters - extract from path string first
  const pathParamNames = extractPathParamNames(operation.path);

  if (pathParamNames.length > 0) {
    // If pathParams schema exists, extract it directly (don't register as component)
    let pathParamsSchema: OpenAPIV3_1.SchemaObject | null = null;
    if (operation.pathParams) {
      pathParamsSchema = extractSchema(operation.pathParams);
    }

    // Create path parameters for each param found in the path
    for (const paramName of pathParamNames) {
      let paramSchema: OpenAPIV3_1.SchemaObject;
      let description: string | undefined;

      // Try to get schema from pathParams schema if available
      if (pathParamsSchema?.properties && typeof pathParamsSchema.properties === 'object') {
        const propSchema = pathParamsSchema.properties[paramName];
        if (propSchema) {
          paramSchema = propSchema as OpenAPIV3_1.SchemaObject;
          description = paramSchema.description;
        } else {
          // Param not found in schema, fallback to string
          paramSchema = { type: 'string' };
        }
      } else {
        // No schema provided, default to string
        paramSchema = { type: 'string' };
      }

      parameters.push({
        name: paramName,
        in: 'path',
        required: true, // Path parameters are always required
        schema: paramSchema,
        description,
      });
    }
  }

  // Query parameters
  if (operation.query) {
    // Extract schema directly (don't register as component)
    const schema = extractSchema(operation.query);
    // Extract properties from schema and create query parameters
    if (schema.properties) {
      const requiredFields = schema.required || [];
      for (const [paramName, paramSchema] of Object.entries(schema.properties)) {
        parameters.push({
          name: paramName,
          in: 'query',
          required: requiredFields.includes(paramName),
          schema: paramSchema as OpenAPIV3_1.SchemaObject,
          description: (paramSchema as OpenAPIV3_1.SchemaObject).description,
        });
      }
    }
  }

  if (parameters.length > 0) {
    operationObj.parameters = parameters;
  }

  // Request body - only supports content-type map format
  if (operation.requests) {
    const requestByContentType = operation.requests as RequestByContentType;
    const content: Record<string, OpenAPIV3_1.MediaTypeObject> = {};

    for (const [contentType, requestSchema] of Object.entries(requestByContentType)) {
      if (requestSchema && typeof requestSchema === 'object' && 'body' in requestSchema) {
        if (requestSchema.body) {
          const contentTypeSafe = contentType.replace(/[^a-zA-Z0-9]/g, '');
          const bodySchemaId = getOrCreateSchemaReference(
            requestSchema.body,
            registry,
            `${operationId}Request${contentTypeSafe}Body`
          );
          if (bodySchemaId) {
            content[contentType] = {
              schema: {
                $ref: `#/components/schemas/${bodySchemaId}`,
              },
            };
          }
        }
      }
    }

    if (Object.keys(content).length > 0) {
      operationObj.requestBody = {
        content,
      };
    }
  }

  // Request headers (OpenAPI doesn't have a standard way to document headers in requestBody,
  // but we can add them as parameters with in: 'header')
  if (operation.headers) {
    // Extract schema directly (don't register as component)
    const schema = extractSchema(operation.headers);
    if (schema.properties) {
      const headerParams: OpenAPIV3_1.ParameterObject[] = [];
      const requiredFields = schema.required || [];
      for (const [headerName, headerSchema] of Object.entries(schema.properties)) {
        headerParams.push({
          name: headerName,
          in: 'header',
          required: requiredFields.includes(headerName),
          schema: headerSchema as OpenAPIV3_1.SchemaObject,
          description: (headerSchema as OpenAPIV3_1.SchemaObject).description,
        });
      }
      if (headerParams.length > 0) {
        operationObj.parameters = [...(operationObj.parameters || []), ...headerParams];
      }
    }
  }

  // Responses
  if (operation.responses) {
    const responses: OpenAPIV3_1.ResponsesObject = {};
    for (const [statusCode, response] of Object.entries(operation.responses)) {
      if (!response || typeof response !== 'object') continue;

      const responseObj: OpenAPIV3_1.ResponseObject = {
        description: '', // Default description, could be enhanced
      };

      // Response must be a content-type map
      const responseByContentType = response as ResponseByContentType;

      // Build content object with all media types
      const content: Record<string, OpenAPIV3_1.MediaTypeObject> = {};
      const allHeaders: Record<string, OpenAPIV3_1.HeaderObject> = {};

      for (const [contentType, responseSchema] of Object.entries(responseByContentType)) {
        if (!responseSchema || typeof responseSchema !== 'object' || !('body' in responseSchema)) {
          continue;
        }

        const mediaTypeObj: OpenAPIV3_1.MediaTypeObject = {};

        // Response body schema
        if (responseSchema.body) {
          const contentTypeSafe = contentType.replace(/[^a-zA-Z0-9]/g, '');
          const bodySchemaId = getOrCreateSchemaReference(
            responseSchema.body,
            registry,
            `${operationId}Response${statusCode}${contentTypeSafe}Body`
          );
          if (bodySchemaId) {
            mediaTypeObj.schema = {
              $ref: `#/components/schemas/${bodySchemaId}`,
            };
          }
        }

        // Response headers schema (per content type) - inline directly
        if (responseSchema.headers) {
          // Extract schema directly (don't register as component)
          const headersSchema = extractSchema(responseSchema.headers);
          if (headersSchema.properties) {
            // Headers are shared across all content types in OpenAPI, so we merge them
            // If there are conflicts, the last one wins
            for (const [headerName, headerSchema] of Object.entries(headersSchema.properties)) {
              allHeaders[headerName] = {
                schema: headerSchema as OpenAPIV3_1.SchemaObject,
                description: (headerSchema as OpenAPIV3_1.SchemaObject).description,
              };
            }
          }
        }

        content[contentType] = mediaTypeObj;
      }

      if (Object.keys(content).length > 0) {
        responseObj.content = content;
      }

      if (Object.keys(allHeaders).length > 0) {
        responseObj.headers = allHeaders;
      }

      responses[statusCode] = responseObj;
    }
    operationObj.responses = responses;
  }

  return operationObj;
}
