import { ContractDefinition, ContractOperation, HttpMethod } from '../types';
import { OpenAPIV3_1 } from './types';

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
    components: createOpenApiComponents(contract),
    paths: createOpenApiPaths(contract),
  };
};

/**
 * Creates the OpenAPI components
 */
export const createOpenApiComponents = (
  contract: ContractDefinition
): OpenAPIV3_1.ComponentsObject => {
  return {
    schemas: createOpenApiSchemas(contract),
  };
};

/**
 * Creates the OpenAPI schemas
 */
export const createOpenApiSchemas = (contract: ContractDefinition): OpenAPIV3_1.SchemaObject => {
  return [];
};

/**
 * Creates the OpenAPI paths
 */
export const createOpenApiPaths = (contract: ContractDefinition): OpenAPIV3_1.PathsObject => {
  const paths: OpenAPIV3_1.PathsObject = {};
  for (const operation of Object.values(contract)) {
    paths[operation.path] = createOpenApiPath(operation.path, operation);
  }
  return paths;
};

/**
 * Creates the OpenAPI path
 */
export const createOpenApiPath = (
  path: string,
  operation: ContractOperation
): OpenAPIV3_1.PathItemObject => {
  const pathItem: OpenAPIV3_1.PathItemObject = {};
  const method = operation.method?.toLowerCase() as HttpMethod;
  pathItem[method] = {};
  return pathItem;
};
