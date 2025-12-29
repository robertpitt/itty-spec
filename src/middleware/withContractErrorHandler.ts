import type { IRequest } from 'itty-router';

/**
 * Contract-aware error handler middleware
 *
 * Handles validation errors from schema validation and falls back to itty-router's
 * default error handler for other errors. This middleware should be used as the
 * `catch` handler in the router configuration.
 *
 * @typeParam RequestType - The request type (extends IRequest)
 * @typeParam Args - Additional arguments passed to handlers
 *
 * @returns An error handler function that handles validation errors and other errors
 *
 * @example
 * ```typescript
 * const router = Router({
 *   catch: withContractErrorHandler(),
 * });
 * ```
 */
export function withContractErrorHandler<
  RequestType extends IRequest = IRequest,
  Args extends any[] = any[],
>(): (err: unknown, request: RequestType, ...args: Args) => Response {
  return (err: unknown, _request: RequestType, ..._args: Args): Response => {
    // Handle validation errors with issues array
    if (err instanceof Error && 'issues' in err) {
      const issues = (err as Error & { issues: unknown }).issues;
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: Array.isArray(issues) ? issues : [issues],
        }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }

    // Handle other errors - ensure all errors conform to { error: string, details: [...] }
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    const statusCode =
      err && typeof err === 'object' && 'status' in err ? (err as any).status : 500;

    // Format error message as a details array for consistency with validation errors
    // Details array contains objects with message property (and optionally other fields)
    const details = [
      {
        message: errorMessage,
      },
    ];

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details,
      }),
      { status: statusCode, headers: { 'content-type': 'application/json' } }
    );
  };
}
