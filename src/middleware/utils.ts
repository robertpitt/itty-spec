import type { IRequest } from 'itty-router';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { validateSchema } from '../utils.js';

/**
 * Normalize headers to Record<string, string> with lowercase keys
 * @param headers - Headers object or plain object
 */
export function normalizeHeaders(headers: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (!headers || typeof headers !== 'object') {
    return result;
  }

  // Check if it's a Headers-like object (has entries() method)
  // This handles both native Headers and PonyfillHeaders from @whatwg-node/server
  if ('entries' in headers && typeof (headers as Headers).entries === 'function') {
    // Use entries() for reliable iteration across different environments
    // This ensures we capture all headers regardless of how they were set
    for (const [key, value] of (headers as Headers).entries()) {
      result[key.toLowerCase()] = value;
    }
  } else {
    // Plain object - use Object.entries
    for (const [key, value] of Object.entries(headers)) {
      result[key.toLowerCase()] = String(value);
    }
  }
  return result;
}

/**
 * Check if a path pattern matches a URL pathname
 * Supports patterns like "/users/:id" matching "/users/123"
 */
export function matchesPathPattern(pattern: string, pathname: string): boolean {
  const patternSegments = pattern.split('/').filter(Boolean);
  const pathSegments = pathname.split('/').filter(Boolean);

  if (patternSegments.length !== pathSegments.length) {
    return false;
  }

  for (let i = 0; i < patternSegments.length; i++) {
    const patternSegment = patternSegments[i];
    const pathSegment = pathSegments[i];

    // If pattern segment is a param (starts with :), it matches any value
    if (patternSegment.startsWith(':')) {
      continue;
    }

    // Otherwise, segments must match exactly
    if (patternSegment !== pathSegment) {
      return false;
    }
  }

  return true;
}

/**
 * Extract path parameters from URL path using the operation's path pattern
 */
export function extractPathParamsFromUrl(pathPattern: string, url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const patternSegments = pathPattern.split('/').filter(Boolean);
  const pathSegments = new URL(url).pathname.split('/').filter(Boolean);
  for (let i = 0; i < patternSegments.length; i++) {
    const segment = patternSegments[i];
    if (segment.startsWith(':') && i < pathSegments.length) {
      params[segment.slice(1)] = pathSegments[i];
    }
  }
  return params;
}

/**
 * Extract query parameters from URL query string
 */
export function extractQueryParamsFromUrl(url: string): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  try {
    new URL(url).searchParams.forEach((value, key) => {
      query[key] = value;
    });
  } catch {}
  return query;
}

/**
 * Get Content-Type header from request (lowercase)
 */
export function getContentType(request: IRequest): string | null {
  const contentType = request.headers.get('content-type');
  if (!contentType) return null;
  // Remove charset and other parameters (e.g., "application/json; charset=utf-8" -> "application/json")
  return contentType.split(';')[0].trim().toLowerCase();
}

/**
 * Parse body data based on content type
 */
export function parseBodyByContentType(contentType: string | null, bodyText: string): unknown {
  if (!contentType) {
    // Default to JSON parsing if no content type
    try {
      return JSON.parse(bodyText);
    } catch {
      return bodyText;
    }
  }

  const normalizedType = contentType.toLowerCase();
  if (normalizedType.includes('json')) {
    try {
      return JSON.parse(bodyText);
    } catch {
      return bodyText;
    }
  }
  // For other types (XML, HTML, plain text, etc.), return as string
  return bodyText;
}

/**
 * Try to validate headers, handling comma-separated values for specific headers
 */
export async function validateHeadersWithFallback(
  schema: StandardSchemaV1,
  headers: Record<string, string>
): Promise<Record<string, unknown>> {
  try {
    // Try validating with original values first
    return await validateSchema<Record<string, unknown>>(schema, headers);
  } catch (err) {
    // If validation fails, try handling comma-separated values for certain headers
    const headersToSplit = ['accept', 'accept-encoding', 'accept-language'];
    const modifiedHeaders = { ...headers };
    let modified = false;

    for (const headerName of headersToSplit) {
      if (modifiedHeaders[headerName] && modifiedHeaders[headerName].includes(',')) {
        // Split by comma and try each value
        const values = modifiedHeaders[headerName].split(',').map((v) => v.trim());

        for (const value of values) {
          try {
            // Try validating with this single value
            const testHeaders = { ...headers, [headerName]: value };
            const validated = await validateSchema<Record<string, unknown>>(schema, testHeaders);
            // If validation succeeds, use this value
            modifiedHeaders[headerName] = value;
            modified = true;
            break;
          } catch {
            // Continue to next value
          }
        }
      }
    }

    if (modified) {
      // Try validation again with modified headers
      return await validateSchema<Record<string, unknown>>(schema, modifiedHeaders);
    }

    // If no modifications helped, rethrow original error
    throw err;
  }
}
