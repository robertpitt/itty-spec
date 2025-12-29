import type { IRequest, RequestHandler } from 'itty-router';
import { error } from 'itty-router';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type {
  ContractAugmentedRequest,
  ContractOperationParameters,
  ContractOperationQuery,
} from '../types.js';
import { validateSchema, defineProp } from '../utils.js';
import {
  extractPathParamsFromUrl,
  getContentType,
  parseBodyByContentType,
  normalizeHeaders,
  validateHeadersWithFallback,
} from './utils.js';

type ContractOperation = NonNullable<ContractAugmentedRequest['__contractOperation']>;

export const withSpecValidation: RequestHandler<IRequest> = async (request: IRequest) => {
  const operation = (request as ContractAugmentedRequest).__contractOperation;
  if (!operation) return;

  // Path params
  const params = await resolveAndValidatePathParams(request, operation);
  defineProp(request, 'validatedParams', params);

  // Query params
  const query = await resolveAndValidateQuery(request, operation);
  defineProp(request, 'validatedQuery', query);

  // Headers
  const validatedHeaders = await resolveAndValidateHeaders(request, operation);
  defineProp(request, 'validatedHeaders', validatedHeaders);

  // Body
  const validatedBody = await resolveAndValidateBody(request, operation);
  defineProp(request, 'validatedBody', validatedBody);
};

async function resolveAndValidatePathParams(request: IRequest, operation: ContractOperation) {
  const requestParams = extractPathParamsFromUrl(operation.path, request.url);

  return operation.pathParams
    ? await validateSchema<ContractOperationParameters<ContractOperation>>(
        operation.pathParams,
        requestParams
      )
    : requestParams;
}

async function resolveAndValidateQuery(
  request: IRequest,
  operation: ContractOperation
): Promise<Record<string, unknown>> {
  if (operation.query) {
    return validateSchema<ContractOperationQuery<ContractOperation>>(
      operation.query,
      request.query
    );
  }

  return {};
}

async function resolveAndValidateHeaders(
  request: IRequest,
  operation: ContractOperation
): Promise<Headers | undefined> {
  if (operation.headers) {
    const normalizedHeaders = normalizeHeaders(request.headers);
    const validatedHeaders = await validateHeadersWithFallback(
      operation.headers,
      normalizedHeaders
    );
    return new Headers(validatedHeaders as Record<string, string>);
  }

  return undefined;
}

async function tryReadRequestText(
  request: IRequest
): Promise<{ ok: true; text: string } | { ok: false }> {
  try {
    const text = await request.text();
    return { ok: true, text };
  } catch {
    return { ok: false };
  }
}

function findRequestSchemaEntry(
  requests: Record<string, unknown>,
  contentType: string
): [normalizedContentType: string, schema: unknown] | undefined {
  // Slightly more robust than the original comment implied:
  // - normalizes the incoming content type for matching (adds acceptance, doesn’t remove)
  const normalized = contentType.toLowerCase();

  const entry = Object.entries(requests).find(([key]) => key.toLowerCase() === normalized);
  if (!entry) return;

  return [normalized, entry[1]];
}

async function resolveAndValidateBody(
  request: IRequest,
  operation: ContractOperation
): Promise<unknown> {
  // Preserve existing behavior: if no request schemas defined, set empty body.
  if (!operation.requests) return {};

  // Preserve existing behavior: body read failures become empty body.
  const read = await tryReadRequestText(request);
  if (!read.ok) return {};

  const bodyText = read.text;
  if (!bodyText.trim()) return {};

  const contentType = getContentType(request);
  if (!contentType) {
    throw error(400, 'Content-Type header is required');
  }

  const entry = findRequestSchemaEntry(operation.requests, contentType);
  if (!entry) {
    throw error(
      400,
      `Unsupported Content-Type: ${contentType}. Supported types: ${Object.keys(operation.requests).join(', ')}`
    );
  }

  const [normalizedContentType, requestSchema] = entry;

  if (!requestSchema || typeof requestSchema !== 'object' || !('body' in requestSchema)) {
    throw error(500, 'Invalid request schema configuration');
  }

  const bodyData = parseBodyByContentType(normalizedContentType, bodyText);
  return await validateSchema((requestSchema as { body: StandardSchemaV1 }).body, bodyData);
}
