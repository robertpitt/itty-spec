import type { IRequest, ResponseHandler } from 'itty-router';
import { json } from 'itty-router';

/**
 * Contract-aware response formatter middleware
 *
 * Converts contract response objects (with status, body, headers) to Response objects.
 * This middleware should be used in the `finally` array of the router configuration.
 *
 * Handles three response types:
 * 1. Already a Response object - returns as-is
 * 2. Contract response object ({ status, body?, headers? }) - converts to Response
 * 3. Other values - falls back to default JSON formatter
 *
 * @param customFormatter - Optional custom formatter to use as fallback instead of default JSON formatter
 * @returns A ResponseHandler that formats contract responses
 *
 * @example
 * ```typescript
 * const router = Router({
 *   finally: [
 *     withContractFormat(),
 *   ],
 * });
 * ```
 */
export function withContractFormat(customFormatter?: ResponseHandler): ResponseHandler {
  return (response: unknown, request: unknown): Response => {
    if (response instanceof Response) return response;
    if (response && typeof response === 'object' && 'status' in response) {
      const { status, body, headers } = response as {
        status: number;
        body?: unknown;
        headers?: HeadersInit;
      };
      const responseHeaders = new Headers(headers);

      // Set default content-type if not provided
      if (!responseHeaders.has('content-type') && status !== 204) {
        responseHeaders.set('content-type', 'application/json');
      }

      // Get content-type after potentially setting default
      const contentType = responseHeaders.get('content-type') || '';

      // Serialize body appropriately based on content type
      let responseBody: BodyInit | null = null;
      if (body === undefined || body === null || status === 204) {
        responseBody = null;
      } else if (
        typeof body === 'string' &&
        (contentType.startsWith('text/') || contentType.includes('html'))
      ) {
        // Return text/HTML as-is (don't JSON.stringify)
        responseBody = body;
      } else {
        // JSON serialize for JSON content types or non-string bodies
        responseBody = JSON.stringify(body);
      }

      return new Response(responseBody, { status, headers: responseHeaders });
    }
    return customFormatter ? customFormatter(response, request as IRequest) : json(response);
  };
}
