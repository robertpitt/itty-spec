import type { IRequest, RequestHandler } from 'itty-router';
import { error } from 'itty-router';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { ContractAugmentedRequest } from '../types.js';
import { validateSchema, defineProp } from '../utils.js';
import {
  extractPathParamsFromUrl,
  extractQueryParamsFromUrl,
  getContentType,
  parseBodyByContentType,
  normalizeHeaders,
  validateHeadersWithFallback,
} from './utils.js';

/**
 * Global middleware: Validates path parameters, query parameters, headers, and body
 * using the operation from request. This reads from __contractOperation set by
 * withMatchingContractOperation.
 *
 * This middleware combines the functionality of:
 * - withPathParams
 * - withQueryParams
 * - withHeaders
 * - withBody
 */
export const withSpecValidation: RequestHandler<IRequest> = async (request: IRequest) => {
  const operation = (request as ContractAugmentedRequest).__contractOperation;
  if (!operation) return;

  // Validate path parameters
  let requestParams = (request.params as Record<string, string> | undefined) || {};
  if (!Object.keys(requestParams).length && request.url) {
    requestParams = extractPathParamsFromUrl(operation.path, request.url);
  }
  const params = operation.pathParams
    ? await validateSchema<Record<string, string>>(operation.pathParams, requestParams)
    : requestParams;
  defineProp(request, 'params', params);

  // Validate query parameters
  let requestQuery = (request.query as Record<string, unknown> | undefined) || {};
  if (!Object.keys(requestQuery).length && request.url) {
    requestQuery = extractQueryParamsFromUrl(request.url);
  }
  const query = operation.query
    ? await validateSchema<Record<string, unknown>>(operation.query, requestQuery)
    : requestQuery;
  defineProp(request, 'validatedQuery', query);
  defineProp(request, 'query', query);

  // Validate headers
  const requestHeaders = normalizeHeaders(request.headers);
  const validatedHeadersObject = operation.headers
    ? await validateHeadersWithFallback(operation.headers, requestHeaders)
    : requestHeaders;
  // Convert to Headers object to align with Web API Request standard
  const headers = new Headers();
  for (const [key, value] of Object.entries(validatedHeadersObject)) {
    headers.set(key, String(value));
  }
  defineProp(request, 'validatedHeaders', headers);

  // Validate body
  // If no request schemas defined, set empty body and return
  if (!operation.requests) {
    defineProp(request, 'validatedBody', {});
    return;
  }

  let bodyData: unknown = {};
  let bodyReadSuccessfully = false;
  let bodyText = '';

  try {
    bodyText = await request.text();
    bodyReadSuccessfully = true;
  } catch {
    bodyData = {};
  }

  if (bodyReadSuccessfully && bodyText.trim()) {
    // Check if request is a content-type map
    const contentType = getContentType(request);
    if (!contentType) {
      throw error(400, 'Content-Type header is required');
    }

    // Find matching schema (case-insensitive)
    const matchingEntry = Object.entries(operation.requests).find(([key]) => {
      return key.toLowerCase() === contentType;
    });

    if (!matchingEntry) {
      throw error(
        400,
        `Unsupported Content-Type: ${contentType}. Supported types: ${Object.keys(operation.requests).join(', ')}`
      );
    }

    const [, requestSchema] = matchingEntry;
    if (!requestSchema || typeof requestSchema !== 'object' || !('body' in requestSchema)) {
      throw error(500, 'Invalid request schema configuration');
    }
    bodyData = parseBodyByContentType(contentType, bodyText);
    const body = await validateSchema((requestSchema as { body: StandardSchemaV1 }).body, bodyData);
    defineProp(request, 'validatedBody', body);
  } else {
    // Empty body
    defineProp(request, 'validatedBody', bodyData);
  }
};
