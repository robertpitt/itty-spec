import type { StandardSchemaV1 } from '@standard-schema/spec';
import {
  ContractDefinition,
  ContractOperation,
  HttpMethod,
  RequestByContentType,
  ResponseByContentType,
} from '../types';
import type { OpenAPIV3_1 } from 'openapi-types';
import { extractSchemaAsync } from './vendors/index';

/**
 * Schema registry for deduplication and reference management
 */
class SchemaRegistry {
  private schemas: Record<string, OpenAPIV3_1.SchemaObject> = {};
  private ids = new Map<StandardSchemaV1, string>();
  private counter = 1;

  /**
   * Register a schema and return its reference
   * Returns null for empty schemas, ReferenceObject for reference-only schemas, or schema ID string
   */
  async register(
    schema: StandardSchemaV1 | undefined,
    hint?: string
  ): Promise<string | OpenAPIV3_1.ReferenceObject | null> {
    if (!schema) return null;

    // Check if already registered
    if (this.ids.has(schema)) {
      const id = this.ids.get(schema)!;
      if (id === '__empty__') return null;

      const existingSchema = this.schemas[id];
      if (existingSchema) {
        // If it's reference-only, return the reference directly
        if (this.isReferenceOnly(existingSchema)) {
          return existingSchema as OpenAPIV3_1.ReferenceObject;
        }
        // Re-check the original schema to handle edge cases
        const { schema: reExtracted } = await extractSchemaAsync(schema);
        if (this.isReferenceOnly(reExtracted)) {
          return reExtracted as OpenAPIV3_1.ReferenceObject;
        }
        if (this.isEmpty(reExtracted)) {
          return null;
        }
        return id;
      }
      // ID exists but schema doesn't - it's a reference-only schema stored by name
      return this.createSchemaRef(id);
    }

    // Extract schema using standard-openapi (includes components for definitions)
    const { schema: open, components } = await extractSchemaAsync(schema);

    // Register definitions from components
    if (components?.schemas) {
      for (const [name, def] of Object.entries(components.schemas)) {
        if (!this.schemas[name]) {
          this.schemas[name] = def as OpenAPIV3_1.SchemaObject;
        }
      }
    }

    // Handle empty schemas
    if (this.isEmpty(open)) {
      this.ids.set(schema, '__empty__');
      return null;
    }

    // Handle reference-only schemas
    if (this.isReferenceOnly(open)) {
      const ref = open.$ref!;
      const name = this.extractSchemaNameFromRef(ref);
      if (name) {
        this.ids.set(schema, name);
        return open;
      }
    }

    // Register schema with content
    const id = hint || `Schema${this.counter++}`;
    this.schemas[id] = open;
    this.ids.set(schema, id);
    return id;
  }

  /**
   * Get components object for OpenAPI document
   */
  get components(): OpenAPIV3_1.ComponentsObject {
    return { schemas: this.schemas };
  }

  /**
   * Check if a schema is reference-only
   */
  private isReferenceOnly(schema: OpenAPIV3_1.SchemaObject): boolean {
    if (typeof schema === 'boolean') return false;
    if (!schema || typeof schema !== 'object') return false;
    if (!('$ref' in schema) || typeof schema.$ref !== 'string') return false;

    const metadataKeys = new Set(['$ref', 'description', 'summary', 'title']);
    const schemaKeys = Object.keys(schema).filter((key) => !metadataKeys.has(key));
    return schemaKeys.length === 0;
  }

  /**
   * Extract schema name from a $ref path
   */
  private extractSchemaNameFromRef(ref: string): string | null {
    const match = ref.match(/^#\/components\/schemas\/(.+)$/);
    return match ? match[1] : null;
  }

  /**
   * Check if a schema is empty
   */
  private isEmpty(schema: OpenAPIV3_1.SchemaObject): boolean {
    if (typeof schema === 'boolean') return false;
    if (!schema || typeof schema !== 'object') return true;

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

    const contentKeys = Object.keys(schema).filter((key) => !metadataKeys.has(key));
    if (contentKeys.length === 0) return true;
    if (contentKeys.length === 1 && contentKeys[0] === '$ref') return false;

    if (schema.type === 'object') {
      const hasProperties =
        (schema.properties && Object.keys(schema.properties).length > 0) ||
        schema.patternProperties ||
        schema.additionalProperties !== undefined ||
        schema.minProperties !== undefined ||
        schema.maxProperties !== undefined;

      if (!hasProperties) {
        const otherConstraints = contentKeys.filter(
          (key) =>
            !['type', 'required', 'nullable', 'readOnly', 'writeOnly', 'discriminator'].includes(
              key
            )
        );
        return otherConstraints.length === 0;
      }
    }

    return false;
  }

  /**
   * Create a schema reference object
   */
  private createSchemaRef(schemaId: string): OpenAPIV3_1.ReferenceObject {
    return {
      $ref: `#/components/schemas/${schemaId}`,
    };
  }
}

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
 * OpenAPI 3.1 schema generator for itty-spec contracts
 */
export const createOpenApiSpecification = async (
  contract: ContractDefinition,
  options: OpenApiSpecificationOptions
): Promise<OpenAPIV3_1.Document> => {
  const reg = new SchemaRegistry();

  // First pass: collect all schemas
  const schemaPromises: Promise<void>[] = [];
  Object.entries(contract).forEach(([opId, op]) => {
    if (op.requests) {
      buildContent(
        op.requests,
        (ct, s) => {
          if (s.body) {
            schemaPromises.push(reg.register(s.body, `${opId}Req${sanitize(ct)}`).then(() => {}));
          }
        },
        null
      );
    }
    if (op.responses) {
      Object.entries(op.responses).forEach(([sc, res]) => {
        if (res && typeof res === 'object') {
          buildContent(
            res as ResponseByContentType,
            (ct, s) => {
              if (s.body) {
                schemaPromises.push(
                  reg.register(s.body, `${opId}Res${sc}${sanitize(ct)}`).then(() => {})
                );
              }
            },
            null
          );
        }
      });
    }
  });

  // Wait for all schemas to be registered
  await Promise.all(schemaPromises);

  // Second pass: build paths
  const paths: OpenAPIV3_1.PathsObject = {};
  for (const [opId, op] of Object.entries(contract)) {
    const p = convertPathToOpenAPIFormat(op.path);
    if (!paths[p]) {
      paths[p] = {};
    }
    const pathItem = paths[p]!;
    const method = op.method.toLowerCase() as HttpMethod;
    pathItem[method] = await createOpenApiOperation(op, reg, opId);
  }

  return {
    openapi: '3.1.1',
    info: createOpenApiInfo(options),
    servers: options.servers,
    components: reg.components,
    paths,
  };
};

export const createOpenApiInfo = (options: OpenApiSpecificationOptions): OpenAPIV3_1.InfoObject => {
  return {
    title: options.title,
    version: options.version || '0.0.0',
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
  return registry.components;
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
function sanitize(contentType: string): string {
  return contentType.replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Generic helper to process content-type maps
 * Filters entries with body property and reduces using handler
 */
type ContentHandler<T> = (
  contentType: string,
  schema: { body?: StandardSchemaV1; headers?: StandardSchemaV1 },
  accumulator: T
) => void;

function buildContent<T>(map: Record<string, unknown>, handler: ContentHandler<T>, initial: T): T {
  return Object.entries(map)
    .filter(([_, s]) => typeof s === 'object' && s !== null && 'body' in s)
    .reduce<T>((acc, [ct, s]) => {
      handler(ct, s as { body?: StandardSchemaV1; headers?: StandardSchemaV1 }, acc);
      return acc;
    }, initial);
}

/**
 * Create parameters from a schema for a given location
 * Handles path, query, and header parameters uniformly
 */
async function makeParameters(
  schema: StandardSchemaV1 | undefined,
  location: 'path' | 'query' | 'header',
  path?: string,
  required: boolean = location === 'path'
): Promise<OpenAPIV3_1.ParameterObject[]> {
  // Handle path parameters when schema is undefined but path is provided
  if (location === 'path' && !schema && path) {
    const pathParamNames = extractPathParamNames(path);
    return pathParamNames.map((name) => ({
      name,
      in: 'path',
      required: true,
      schema: { type: 'string' },
    }));
  }

  // Extract schema properties
  const extracted = schema ? (await extractSchemaAsync(schema)).schema : null;
  if (!extracted || typeof extracted !== 'object' || !extracted.properties) {
    // For path params, still extract from path string if no schema
    if (location === 'path' && path) {
      return makeParameters(undefined, 'path', path);
    }
    return [];
  }

  const props = extracted.properties ?? {};
  const reqs = extracted.required || [];

  // Special handling for path parameters: ensure all path params from path string are included
  if (location === 'path' && path) {
    const pathParamNames = extractPathParamNames(path);
    return pathParamNames.map((name) => {
      // Check if this parameter exists in the schema
      const sch = props[name];
      if (sch) {
        // Use schema definition
        const paramSchema = sch as OpenAPIV3_1.SchemaObject;
        const isRequired = required || reqs.includes(name);
        const description =
          typeof paramSchema === 'object' && paramSchema !== null
            ? (paramSchema.description ?? paramSchema.title)
            : undefined;

        // Create clean schema without title (title should be at parameter level)
        const cleanSchema: OpenAPIV3_1.SchemaObject =
          typeof paramSchema === 'object' && paramSchema !== null
            ? { ...paramSchema }
            : paramSchema;

        if (typeof cleanSchema === 'object' && cleanSchema !== null && 'title' in cleanSchema) {
          delete cleanSchema.title;
        }

        return {
          name,
          in: 'path',
          required: isRequired,
          schema: cleanSchema,
          description,
        };
      } else {
        // Fallback to string for path params not in schema
        return {
          name,
          in: 'path',
          required: true,
          schema: { type: 'string' },
        };
      }
    });
  }

  // For query and header parameters, use schema properties as before
  return Object.entries(props).map(([name, sch]) => {
    const paramSchema = sch as OpenAPIV3_1.SchemaObject;
    const isRequired = required || reqs.includes(name);
    const description =
      typeof paramSchema === 'object' && paramSchema !== null
        ? (paramSchema.description ?? paramSchema.title)
        : undefined;

    // Create clean schema without title (title should be at parameter level)
    const cleanSchema: OpenAPIV3_1.SchemaObject =
      typeof paramSchema === 'object' && paramSchema !== null ? { ...paramSchema } : paramSchema;

    if (typeof cleanSchema === 'object' && cleanSchema !== null && 'title' in cleanSchema) {
      delete cleanSchema.title;
    }

    return {
      name,
      in: location,
      required: isRequired,
      schema: cleanSchema,
      description,
    };
  });
}

/**
 * Create request body content from content-type map
 */
async function makeRequestContent(
  requests: RequestByContentType,
  reg: SchemaRegistry,
  opId: string
): Promise<Record<string, OpenAPIV3_1.MediaTypeObject>> {
  const content: Record<string, OpenAPIV3_1.MediaTypeObject> = {};
  const promises: Promise<void>[] = [];

  buildContent(
    requests,
    async (ct, { body }) => {
      if (body) {
        promises.push(
          reg.register(body, `${opId}Req${sanitize(ct)}`).then((ref) => {
            if (ref) {
              content[ct] = {
                schema: typeof ref === 'string' ? { $ref: `#/components/schemas/${ref}` } : ref,
              };
            }
          })
        );
      }
    },
    null
  );

  await Promise.all(promises);
  return content;
}

/**
 * Create response content and headers from content-type map
 */
async function makeResponseContent(
  responses: ResponseByContentType,
  reg: SchemaRegistry,
  opId: string,
  status: string
): Promise<{
  content: Record<string, OpenAPIV3_1.MediaTypeObject>;
  headers: Record<string, OpenAPIV3_1.HeaderObject>;
}> {
  const acc: {
    content: Record<string, OpenAPIV3_1.MediaTypeObject>;
    headers: Record<string, OpenAPIV3_1.HeaderObject>;
  } = { content: {}, headers: {} };
  const promises: Promise<void>[] = [];

  buildContent(
    responses,
    async (ct, { body, headers }) => {
      const media: OpenAPIV3_1.MediaTypeObject = {};
      if (body) {
        promises.push(
          reg.register(body, `${opId}Res${status}${sanitize(ct)}`).then((ref) => {
            if (ref) {
              media.schema =
                typeof ref === 'string' ? { $ref: `#/components/schemas/${ref}` } : ref;
            }
            acc.content[ct] = media;
          })
        );
      } else {
        acc.content[ct] = media;
      }

      if (headers) {
        promises.push(
          extractSchemaAsync(headers).then(({ schema }: { schema: OpenAPIV3_1.SchemaObject }) => {
            const hdrs = schema.properties ?? {};
            Object.assign(
              acc.headers,
              Object.fromEntries(
                Object.entries(hdrs).map(([k, sch]) => [
                  k,
                  {
                    schema: sch as OpenAPIV3_1.SchemaObject,
                    description: (sch as OpenAPIV3_1.SchemaObject).description,
                  },
                ])
              )
            );
          })
        );
      }
    },
    null
  );

  await Promise.all(promises);
  return acc;
}

/**
 * Creates the OpenAPI paths
 */
export const createOpenApiPaths = async (
  contract: ContractDefinition,
  registry: SchemaRegistry
): Promise<OpenAPIV3_1.PathsObject> => {
  const paths: OpenAPIV3_1.PathsObject = {};
  for (const [operationId, operation] of Object.entries(contract)) {
    const openApiPath = convertPathToOpenAPIFormat(operation.path);
    if (!paths[openApiPath]) {
      paths[openApiPath] = {};
    }
    const pathItem = paths[openApiPath]!;
    const method = operation.method.toLowerCase() as Lowercase<HttpMethod>;
    pathItem[method] = await createOpenApiOperation(operation, registry, operationId);
  }
  return paths;
};

/**
 * Creates the OpenAPI operation object
 */
async function createOpenApiOperation(
  operation: ContractOperation,
  registry: SchemaRegistry,
  operationId: string
): Promise<OpenAPIV3_1.OperationObject> {
  const operationObj: OpenAPIV3_1.OperationObject = {
    operationId: operation.operationId || operationId,
    summary: operation.summary,
    description: operation.description,
    tags: operation.tags,
  };

  // Collect parameters
  const [pathParams, queryParams, headerParams] = await Promise.all([
    makeParameters(operation.pathParams, 'path', operation.path),
    makeParameters(operation.query, 'query'),
    makeParameters(operation.headers, 'header'),
  ]);

  const parameters: OpenAPIV3_1.ParameterObject[] = [
    ...pathParams,
    ...queryParams,
    ...headerParams,
  ].filter(Boolean);

  if (parameters.length > 0) {
    operationObj.parameters = parameters;
  }

  // Request body
  if (operation.requests) {
    const content = await makeRequestContent(
      operation.requests as RequestByContentType,
      registry,
      operationId
    );
    if (Object.keys(content).length > 0) {
      operationObj.requestBody = { content, required: true };
    }
  }

  // Responses
  if (operation.responses) {
    const responseEntries = await Promise.all(
      Object.entries(operation.responses)
        .filter(([_, res]) => res && typeof res === 'object')
        .map(async ([sc, res]) => {
          const { content, headers } = await makeResponseContent(
            res as ResponseByContentType,
            registry,
            operationId,
            sc
          );
          const responseObj: OpenAPIV3_1.ResponseObject = { description: '' };
          if (Object.keys(content).length > 0) responseObj.content = content;
          if (Object.keys(headers).length > 0) responseObj.headers = headers;
          return [sc, responseObj] as [string, OpenAPIV3_1.ResponseObject];
        })
    );
    operationObj.responses = Object.fromEntries(responseEntries);
  }

  return operationObj;
}
