/**
 * Authentication middleware
 * This would typically verify JWT tokens and attach user info to the request
 */

import type { IRequest } from 'itty-router';
import { extractUserIdFromAuth } from '../utils/auth';
import { userDb } from '../utils/database';

/**
 * Extend request with user information
 */
export interface AuthenticatedRequest extends IRequest {
  userId?: string;
  userRole?: string;
}

/**
 * Simple authentication middleware
 * In production, this would verify JWT tokens properly
 */
export function withAuth(request: AuthenticatedRequest): void {
  const authHeader = request.headers.get('authorization');
  const userId = extractUserIdFromAuth(authHeader);

  if (!userId) {
    return; // Let the handler decide what to do
  }

  // In a real app, you'd get this from the JWT token
  // For this example, we'll look it up from the database
  const user = userDb.findById(userId);
  if (user) {
    request.userId = user.id;
    request.userRole = user.role;
  }
}
