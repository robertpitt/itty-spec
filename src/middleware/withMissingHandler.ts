import type { IRequest, ResponseHandler } from 'itty-router';
import { error } from 'itty-router';
import { createBasicResponseHelpers } from '../utils';

/**
 * Middleware for handling missing routes
 *
 * This middleware checks if a response has been set. If not, it calls the provided
 * missing handler (if available) or returns a 404 error. The missing handler receives
 * the request with basic response helpers attached.
 *
 * @typeParam RequestType - The request type (extends IRequest)
 * @typeParam Args - Additional arguments passed to handlers
 *
 * @param missing - Optional handler for missing routes
 * @returns A ResponseHandler function that handles missing routes
 *
 * @example
 * ```typescript
 * const router = Router({
 *   finally: [
 *     withMissingHandler(options.missing),
 *   ],
 * });
 * ```
 */
export function withMissingHandler<
  RequestType extends IRequest = IRequest,
  Args extends any[] = any[],
>(
  missing?: (
    request: RequestType & ReturnType<typeof createBasicResponseHelpers>,
    ...args: Args
  ) => Response | Promise<Response>
): ResponseHandler {
  return (response: Response, request: IRequest, ...args: Args) => {
    if (response != null) return response as Response;
    if (missing) {
      return missing(
        { ...(request as RequestType), ...createBasicResponseHelpers() } as RequestType &
          ReturnType<typeof createBasicResponseHelpers>,
        ...(args as Args)
      );
    }
    return error(404);
  };
}
